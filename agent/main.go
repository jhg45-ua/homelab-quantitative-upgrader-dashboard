package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/cilium/ebpf/link"
	"github.com/cilium/ebpf/rlimit"
	"gopkg.in/yaml.v3"

	"hqud-backend/pkg/tsdb"
	"github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/pmu"
	"github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/ipmi"
)

//go:generate go run github.com/cilium/ebpf/cmd/bpf2go -target amd64 bpf bpf/io_latency.c

type Config struct {
	NodeName string `yaml:"node_name"`
	Specs    struct {
		Cores         int     `yaml:"cores"`
		PeakGflops    float64 `yaml:"peak_gflops"`
		MaxMemBwGbps float64 `yaml:"max_mem_bw_gbps"`
	} `yaml:"specs"`
	Ipmi struct {
		Host string `yaml:"host"`
		User string `yaml:"user"`
		Pass string `yaml:"pass"`
	} `yaml:"ipmi"`
}

func loadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func main() {
	log.Println("Loading Unified Dashboard Configuration...")
	cfg, err := loadConfig("../config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config.yaml: %v", err)
	}
	log.Printf("Config loaded successfully for Target Node: %s", cfg.NodeName)

	if err := rlimit.RemoveMemlock(); err != nil {
		log.Fatalf("Failed to remove memlock limit: %v", err)
	}

	var objs bpfObjects
	if err := loadBpfObjects(&objs, nil); err != nil {
		log.Fatalf("Loading eBPF objects failed: %v", err)
	}
	defer objs.Close()

	kpStart, err := link.Kprobe("blk_mq_start_request", objs.BlkMqStartRequest, nil)
	if err != nil {
		log.Fatalf("Opening kprobe blk_mq_start_request failed: %v", err)
	}
	defer kpStart.Close()

	kpDone, err := link.Kprobe("blk_mq_complete_request", objs.BlkMqCompleteRequest, nil)
	if err != nil {
		log.Fatalf("Opening kprobe blk_mq_complete_request failed: %v", err)
	}
	defer kpDone.Close()

	log.Println("eBPF program successfully loaded and hooked with MQ Kprobes.")

	log.Println("Initializing Hardware PMU Collector...")
	pmuCollector, err := pmu.NewCollector()
	if err != nil {
		log.Fatalf("Failed to initialize system PMU: %v", err)
	}
	defer pmuCollector.Close()

	if err := pmuCollector.Start(); err != nil {
		log.Fatalf("Failed to start PMU counters: %v", err)
	}
	log.Println("PMU started successfully.")

	// --- MODULE A Addendum: Initialize IPMI Collector ---
	log.Printf("Initializing IPMI Collector for host: %s\n", cfg.Ipmi.Host)
	ipmiCollector := ipmi.NewCollector(cfg.Ipmi.Host, cfg.Ipmi.User, cfg.Ipmi.Pass)

	log.Println("Measuring block I/O latency and CPU CPI. Pushing to VictoriaMetrics...")

	// Initialize TSDB Client
	tsdbClient := tsdb.NewClient("http://localhost:8428/api/v1/import/prometheus")

	// Store previous PMU counts to calculate deltas
	prevCycles, prevInstructions, _ := pmuCollector.ReadCounters()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		var metrics []tsdb.Metric
		var bucket uint32
		var count uint64
		iterator := objs.IoLatencyHist.Iterate()
		
		now := time.Now()
		var cumulativeCount uint64 = 0

		log.Println("\n=== Pushing I/O Latency Histogram ===")
		
		validMetrics := false
		for iterator.Next(&bucket, &count) {
			if count > 0 {
				validMetrics = true
				
				// eBPF map is an array of 64 buckets representing log2 of microseconds
				leTag := ""
				if bucket == 63 {
					leTag = "+Inf"
				} else {
					threshold := uint64(1 << bucket) // 2^bucket
					if bucket == 0 {
						threshold = 0
					}
					leTag = fmt.Sprintf("%d", threshold)
				}
				
				// In a cumulative histogram, 'le' includes all previous counts
				cumulativeCount += count

				metrics = append(metrics, tsdb.Metric{
					Name: "hqud_io_latency_usec_bucket",
					Labels: map[string]string{
						"host":   "r720-vm",
						"modulo": "ebpf_io",
						"le":     leTag,
					},
					Value:     float64(cumulativeCount),
					Timestamp: now,
				})
				
				log.Printf("Bucket le=%-6s : %6d IOPs (Cumulative: %d)", leTag, count, cumulativeCount)
			}
		}
		
		if err := iterator.Err(); err != nil {
			log.Printf("Error iterating map: %v", err)
		}
		
		if validMetrics {
			// Push silently in a goroutine
			go func(m []tsdb.Metric) {
				if err := tsdbClient.Push(m); err != nil {
					log.Printf("TSDB push block I/O failed: %v", err)
				}
			}(metrics)
		} else {
			log.Println("...No I/O events recorded...")
		}

		// --- MODULE A Addendum: PMU CPI Calculation ---
		cyc, currInst, err := pmuCollector.ReadCounters()
		if err != nil {
			log.Printf("Error reading PMU counters: %v", err)
			continue
		}

		deltaCyc := cyc - prevCycles
		deltaInst := currInst - prevInstructions

		prevCycles = cyc
		prevInstructions = currInst

		// Guard against division by zero 
		if deltaInst > 0 {
			cpi := float64(deltaCyc) / float64(deltaInst)
			log.Printf("--- PMU CPI: %.2f (Cycles: %d, Instructions: %d) ---", cpi, deltaCyc, deltaInst)
			
			pmuMetric := []tsdb.Metric{{
				Name: "hqud_cpu_cpi",
				Labels: map[string]string{
					"host":   cfg.NodeName,
					"modulo": "ebpf_pmu",
				},
				Value:     cpi,
				Timestamp: now,
			}}
			go func(m []tsdb.Metric) {
				if err := tsdbClient.Push(m); err != nil {
					log.Printf("TSDB push CPI failed: %v", err)
				}
			}(pmuMetric)

			// --- MODULE A Addendum: IPMI Power & Efficiency ---
			watts, err := ipmiCollector.ReadPowerWatts()
			if err != nil {
				log.Printf("IPMI Read Error (skipping power metrics): %v", err)
			} else {
				// Ticker is exactly 5 seconds, so IPS = deltaInst / 5
				ips := float64(deltaInst) / 5.0
				efficiency := 0.0
				if watts > 0 {
					efficiency = ips / watts
				}
				log.Printf("--- Power: %.2f W, Efficiency: %.2f IPS/W ---", watts, efficiency)

				powerMetrics := []tsdb.Metric{
					{
						Name: "hqud_power_watts",
						Labels: map[string]string{
							"host":   cfg.NodeName,
							"modulo": "ipmi_oob",
						},
						Value:     watts,
						Timestamp: now,
					},
					{
						Name: "hqud_efficiency_ips_per_watt",
						Labels: map[string]string{
							"host":   cfg.NodeName,
							"modulo": "quantitative_engine",
						},
						Value:     efficiency,
						Timestamp: now,
					},
				}
				go func(m []tsdb.Metric) {
					if err := tsdbClient.Push(m); err != nil {
						log.Printf("TSDB push Power/Efficiency failed: %v", err)
					}
				}(powerMetrics)
			}
		}
	}
}

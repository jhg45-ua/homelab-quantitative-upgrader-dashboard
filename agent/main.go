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

	"github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/ipmi"
	"github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/numa"
	"github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/pmu"
)

//go:generate go run github.com/cilium/ebpf/cmd/bpf2go -target amd64 bpf bpf/io_latency.c
//go:generate go run github.com/cilium/ebpf/cmd/bpf2go -target amd64 net_tcp bpf/net_tcp.c

type Config struct {
	NodeName string `yaml:"node_name"`
	Specs    struct {
		Cores        int     `yaml:"cores"`
		PeakGflops   float64 `yaml:"peak_gflops"`
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
	configPath := "config.yaml"
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		configPath = "../config.yaml"
	}

	cfg, err := loadConfig(configPath)
	if err != nil {
		log.Fatalf("Failed to load config.yaml (tried ./config.yaml and ../config.yaml): %v", err)
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

	// --- MODULE F: TCP Retransmit eBPF Probe ---
	var netObjs net_tcpObjects
	if err := loadNet_tcpObjects(&netObjs, nil); err != nil {
		log.Printf("[WARN] Loading TCP eBPF objects failed (non-fatal): %v", err)
	} else {
		defer netObjs.Close()
		kpTcp, err := link.Kprobe("tcp_retransmit_skb", netObjs.TcpRetransmitSkb, nil)
		if err != nil {
			log.Printf("[WARN] Attaching kprobe tcp_retransmit_skb failed (non-fatal): %v", err)
		} else {
			defer kpTcp.Close()
			log.Println("TCP retransmit kprobe attached successfully.")
		}
	}

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
	prevCounters, _ := pmuCollector.ReadCounters()

	// Previous TCP retransmit count for delta computation
	var prevTcpRetransmits uint64 = 0
	if netObjs.TcpRetransmitCount != nil {
		var initVal uint64
		var k uint32 = 0
		if err := netObjs.TcpRetransmitCount.Lookup(k, &initVal); err == nil {
			prevTcpRetransmits = initVal
		}
	}

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

		// --- MODULE A: PMU CPI + Cache Miss Rate + Context Switches ---
		curr, err := pmuCollector.ReadCounters()
		if err != nil {
			log.Printf("Error reading PMU counters: %v", err)
			continue
		}

		deltaCyc := curr.Cycles - prevCounters.Cycles
		deltaInst := curr.Instructions - prevCounters.Instructions
		deltaCacheRefs := curr.CacheRefs - prevCounters.CacheRefs
		deltaCacheMisses := curr.CacheMisses - prevCounters.CacheMisses
		deltaCtx := curr.CtxSwitches - prevCounters.CtxSwitches

		prevCounters = curr

		if deltaInst > 0 {
			cpi := float64(deltaCyc) / float64(deltaInst)
			log.Printf("--- PMU CPI: %.2f (Cycles: %d, Instructions: %d) ---", cpi, deltaCyc, deltaInst)

			// Cache Miss Rate = (delta_misses / delta_refs) * 100
			cacheMissRate := 0.0
			if deltaCacheRefs > 0 {
				cacheMissRate = float64(deltaCacheMisses) / float64(deltaCacheRefs) * 100.0
			}

			// AMAT (Average Memory Access Time) — Hennessy & Patterson fundamental formula:
			// AMAT = L1_Hit_Time + Miss_Rate * RAM_Penalty
			const l1HitCycles = 4.0
			const ramPenaltyCycles = 150.0
			amat := l1HitCycles + ((cacheMissRate / 100.0) * ramPenaltyCycles)

			// Context Switches per second = delta / 5s tick interval
			ctxSwitchesPS := float64(deltaCtx) / 5.0

			log.Printf("--- Cache Miss Rate: %.2f%% | AMAT: %.2f cycles | CtxSw/s: %.2f ---", cacheMissRate, amat, ctxSwitchesPS)

			pmuMetrics := []tsdb.Metric{
				{
					Name:      "hqud_cpu_cpi",
					Labels:    map[string]string{"host": cfg.NodeName, "modulo": "ebpf_pmu"},
					Value:     cpi,
					Timestamp: now,
				},
				{
					Name:      "hqud_cpu_cache_miss_rate",
					Labels:    map[string]string{"host": cfg.NodeName, "modulo": "ebpf_pmu"},
					Value:     cacheMissRate,
					Timestamp: now,
				},
				{
					Name:      "hqud_cpu_amat_cycles",
					Labels:    map[string]string{"host": cfg.NodeName, "modulo": "quantitative_engine"},
					Value:     amat,
					Timestamp: now,
				},
				{
					Name:      "hqud_os_context_switches_ps",
					Labels:    map[string]string{"host": cfg.NodeName, "modulo": "ebpf_pmu"},
					Value:     ctxSwitchesPS,
					Timestamp: now,
				},
			}
			go func(m []tsdb.Metric) {
				if err := tsdbClient.Push(m); err != nil {
					log.Printf("TSDB push PMU metrics failed: %v", err)
				}
			}(pmuMetrics)

			// --- IPMI Power & Efficiency ---
			watts, err := ipmiCollector.ReadPowerWatts()
			if err != nil {
				log.Printf("IPMI Read Error (skipping power metrics): %v", err)
			} else {
				ips := float64(deltaInst) / 5.0
				efficiency := 0.0
				if watts > 0 {
					efficiency = ips / watts
				}
				log.Printf("--- Power: %.2f W, Efficiency: %.2f IPS/W ---", watts, efficiency)

				powerMetrics := []tsdb.Metric{
					{
						Name:      "hqud_power_watts",
						Labels:    map[string]string{"host": cfg.NodeName, "modulo": "ipmi_oob"},
						Value:     watts,
						Timestamp: now,
					},
					{
						Name:      "hqud_efficiency_ips_per_watt",
						Labels:    map[string]string{"host": cfg.NodeName, "modulo": "quantitative_engine"},
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

		// --- MODULE A v2: NUMA Miss Rate (sysfs — works inside KVM VMs) ---
		numaStats, numaErr := numa.Collect()
		if numaErr != nil {
			log.Printf("[NUMA] sysfs read skipped: %v", numaErr)
		} else {
			numaMissRate := numaStats.MissRate()
			log.Printf("--- NUMA Miss Rate: %.2f%% (Hits: %d, Misses: %d) ---",
				numaMissRate, numaStats.TotalHits, numaStats.TotalMisses)

			go func(v float64) {
				if err := tsdbClient.Push([]tsdb.Metric{{
					Name:      "hqud_numa_miss_rate",
					Labels:    map[string]string{"host": cfg.NodeName, "modulo": "numa_sysfs"},
					Value:     v,
					Timestamp: now,
				}}); err != nil {
					log.Printf("TSDB push NUMA failed: %v", err)
				}
			}(numaMissRate)
		}

		// --- MODULE F: TCP Retransmit Rate ---
		if netObjs.TcpRetransmitCount != nil {
			var curTcp uint64
			var k uint32 = 0
			if err := netObjs.TcpRetransmitCount.Lookup(k, &curTcp); err == nil {
				delta := curTcp - prevTcpRetransmits
				prevTcpRetransmits = curTcp
				retransmitsPS := float64(delta) / 5.0
				log.Printf("--- TCP Retransmits/s: %.2f (total: %d) ---", retransmitsPS, curTcp)

				go func(v float64) {
					if err := tsdbClient.Push([]tsdb.Metric{{
						Name:      "hqud_net_tcp_retransmits_ps",
						Labels:    map[string]string{"host": cfg.NodeName, "modulo": "ebpf_tcp"},
						Value:     v,
						Timestamp: now,
					}}); err != nil {
						log.Printf("TSDB push TCP retransmits failed: %v", err)
					}
				}(retransmitsPS)
			} else {
				log.Printf("[TCP] Map read error: %v", err)
			}
		}
	}
}

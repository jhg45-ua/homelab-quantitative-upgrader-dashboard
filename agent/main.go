package main

import (
	"fmt"
	"log"
	"time"

	"github.com/cilium/ebpf/link"
	"github.com/cilium/ebpf/rlimit"
	"hqud-backend/pkg/tsdb"
)

//go:generate go run github.com/cilium/ebpf/cmd/bpf2go -target amd64 bpf bpf/io_latency.c

func main() {
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
	log.Println("Measuring block I/O latency and pushing to VictoriaMetrics...")

	// Initialize TSDB Client
	tsdbClient := tsdb.NewClient("http://localhost:8428/api/v1/import/prometheus")

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
					log.Printf("TSDB push failed: %v", err)
				}
			}(metrics)
		} else {
			log.Println("...No I/O events recorded...")
		}
	}
}

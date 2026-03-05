package main

import (
	"log"
	"time"

	"github.com/cilium/ebpf/link"
	"github.com/cilium/ebpf/rlimit"
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

	log.Println("eBPF program successfully loaded and hooked with MQ Kprobes. Measuring block I/O latency...")

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		log.Println("\n=== I/O Latency Histogram (Accumulative) ===")
	
		var bucket uint32
		var count uint64
		iterator := objs.IoLatencyHist.Iterate()
		
		validMetrics := false
		for iterator.Next(&bucket, &count) {
			if count > 0 {
				threshold := uint64(1 << bucket)
				if bucket == 0 {
					threshold = 0
				}
				log.Printf("Bucket[%2d] (>= %4d us) : %6d block IOPs", bucket, threshold, count)
				validMetrics = true
			}
		}
		if err := iterator.Err(); err != nil {
			log.Printf("Error iterating map: %v", err)
		}
		
		if !validMetrics {
			log.Println("...No I/O events recorded yet...")
		}
		log.Println("============================================")
	}
}

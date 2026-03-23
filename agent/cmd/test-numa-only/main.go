package main

import (
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/numa"
)

func main() {
	collector := numa.NewCollector()
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	log.Println("NUMA-only validator started (5s interval). Press Ctrl+C to stop.")

	for tick := 1; ; tick++ {
		nodes, err := collector.Collect()
		if err != nil {
			log.Printf("[NUMA-ONLY] collect error: %v", err)
			<-ticker.C
			continue
		}

		sort.Slice(nodes, func(i, j int) bool {
			return nodes[i].Node < nodes[j].Node
		})

		fmt.Printf("\n=== NUMA Tick %d (%s) ===\n", tick, time.Now().Format(time.RFC3339))
		for _, node := range nodes {
			fmt.Printf(
				"%s | CPU: %.2f%% | RAM: %d / %d bytes | Interconnect Total: %d bytes\n",
				node.Node,
				node.CPUUsagePercent,
				node.RAMUsedBytes,
				node.RAMTotalBytes,
				node.InterconnectTrafficBytesTotal,
			)
		}

		<-ticker.C
	}
}

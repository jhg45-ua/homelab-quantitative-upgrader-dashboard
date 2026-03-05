// Package numa reads NUMA memory access statistics from the Linux sysfs interface.
// This approach works reliably in KVM VMs (where PMU NUMA cache events are unavailable)
// and on bare metal — no special privileges required beyond reading /sys.
//
// Source: /sys/devices/system/node/node*/numastat
// Fields:
//   numa_hit     — accesses successfully made to local NUMA node memory
//   numa_miss    — accesses to this node that were intended for another node
//   numa_foreign — accesses made locally that should have gone to another node
//   local_node   — accesses made from this node to its own memory
//   other_node   — accesses made from another node to memory on this node
package numa

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const numastatBase = "/sys/devices/system/node"

// Stats holds aggregated NUMA counters across all NUMA nodes.
type Stats struct {
	TotalHits   uint64 // suma de numa_hit en todos los nodos
	TotalMisses uint64 // suma de numa_miss en todos los nodos
}

// MissRate returns the NUMA miss rate as a percentage (0–100).
// Returns 0 if no data is available.
func (s Stats) MissRate() float64 {
	total := s.TotalHits + s.TotalMisses
	if total == 0 {
		return 0
	}
	return float64(s.TotalMisses) / float64(total) * 100.0
}

// Collect reads NUMA statistics from all available nodes under /sys/devices/system/node/node*.
func Collect() (Stats, error) {
	entries, err := filepath.Glob(filepath.Join(numastatBase, "node*"))
	if err != nil || len(entries) == 0 {
		return Stats{}, fmt.Errorf("no NUMA nodes found under %s", numastatBase)
	}

	var aggregate Stats
	found := false

	for _, nodeDir := range entries {
		statFile := filepath.Join(nodeDir, "numastat")
		f, err := os.Open(statFile)
		if err != nil {
			continue // node directory exists but numastat not readable — skip
		}

		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := scanner.Text()
			parts := strings.Fields(line)
			if len(parts) != 2 {
				continue
			}
			key := parts[0]
			val, err := strconv.ParseUint(parts[1], 10, 64)
			if err != nil {
				continue
			}
			switch key {
			case "numa_hit":
				aggregate.TotalHits += val
				found = true
			case "numa_miss":
				aggregate.TotalMisses += val
				found = true
			}
		}
		f.Close()
	}

	if !found {
		return Stats{}, fmt.Errorf("couldn't read numa_hit/numa_miss from %s/node*/numastat", numastatBase)
	}

	return aggregate, nil
}

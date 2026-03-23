package numa

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

const (
	nodeBasePath = "/sys/devices/system/node"
	procStatPath = "/proc/stat"
)

var (
	NumaNodeCPUUsagePercent = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "hqud_numa_node_cpu_usage_percent",
		Help: "Average CPU usage percent for CPUs that belong to each NUMA node.",
	}, []string{"node"})

	NumaNodeRAMUsedBytes = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "hqud_numa_node_ram_used_bytes",
		Help: "Used RAM in bytes for each NUMA node.",
	}, []string{"node"})

	NumaNodeRAMTotalBytes = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "hqud_numa_node_ram_total_bytes",
		Help: "Total RAM in bytes for each NUMA node.",
	}, []string{"node"})

	NumaInterconnectTrafficBytesTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "hqud_numa_interconnect_traffic_bytes_total",
		Help: "Estimated cross-node interconnect traffic in bytes, derived from NUMA misses.",
	}, []string{"node"})
)

type cpuSample struct {
	idle  uint64
	total uint64
}

type NodeMetrics struct {
	Node                          string
	CPUUsagePercent               float64
	RAMUsedBytes                  uint64
	RAMTotalBytes                 uint64
	InterconnectTrafficBytesTotal uint64
}

type Collector struct {
	prevCPUByLogicalCPU map[int]cpuSample
	prevMissPagesByNode map[string]uint64
	interconnectByNode  map[string]uint64
	warnedMissingNodes  map[string]bool
	pageSize            uint64
}

func NewCollector() *Collector {
	return &Collector{
		prevCPUByLogicalCPU: make(map[int]cpuSample),
		prevMissPagesByNode: make(map[string]uint64),
		interconnectByNode:  make(map[string]uint64),
		warnedMissingNodes:  make(map[string]bool),
		pageSize:            uint64(os.Getpagesize()),
	}
}

func (c *Collector) Collect() ([]NodeMetrics, error) {
	nodeDirs, err := listNodeDirs()
	if err != nil {
		return nil, err
	}

	c.warnIfMissingNode("node0")
	c.warnIfMissingNode("node1")

	procStats, err := readProcStatByCPU(procStatPath)
	if err != nil {
		return nil, err
	}

	results := make([]NodeMetrics, 0, len(nodeDirs))
	for _, nodeDir := range nodeDirs {
		nodeName := filepath.Base(nodeDir)
		nodeID, err := parseNodeID(nodeName)
		if err != nil {
			log.Printf("[WARN] skipping %s: %v", nodeName, err)
			continue
		}

		cpuListPath := filepath.Join(nodeDir, "cpulist")
		cpuIDs, err := readCPUList(cpuListPath)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", cpuListPath, err)
		}
		avgCPUUsage := c.calculateNodeCPUUsage(nodeName, cpuIDs, procStats)
		NumaNodeCPUUsagePercent.WithLabelValues(nodeName).Set(avgCPUUsage)

		meminfoPath := filepath.Join(nodeDir, "meminfo")
		ramTotalBytes, ramUsedBytes, err := readNodeMemory(meminfoPath, nodeID)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", meminfoPath, err)
		}
		NumaNodeRAMTotalBytes.WithLabelValues(nodeName).Set(float64(ramTotalBytes))
		NumaNodeRAMUsedBytes.WithLabelValues(nodeName).Set(float64(ramUsedBytes))

		numastatPath := filepath.Join(nodeDir, "numastat")
		missPages, err := readNodeMissPages(numastatPath)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", numastatPath, err)
		}

		prevPages := c.prevMissPagesByNode[nodeName]
		deltaPages := uint64(0)
		if missPages >= prevPages {
			deltaPages = missPages - prevPages
		} else {
			log.Printf("[WARN] numa_miss counter reset for %s (prev=%d curr=%d)", nodeName, prevPages, missPages)
		}
		c.prevMissPagesByNode[nodeName] = missPages

		deltaBytes := deltaPages * c.pageSize
		if deltaBytes > 0 {
			NumaInterconnectTrafficBytesTotal.WithLabelValues(nodeName).Add(float64(deltaBytes))
		}
		c.interconnectByNode[nodeName] += deltaBytes

		results = append(results, NodeMetrics{
			Node:                          nodeName,
			CPUUsagePercent:               avgCPUUsage,
			RAMUsedBytes:                  ramUsedBytes,
			RAMTotalBytes:                 ramTotalBytes,
			InterconnectTrafficBytesTotal: c.interconnectByNode[nodeName],
		})
	}

	return results, nil
}

func (c *Collector) warnIfMissingNode(nodeName string) {
	nodePath := filepath.Join(nodeBasePath, nodeName)
	if _, err := os.Stat(nodePath); err == nil {
		return
	}
	if c.warnedMissingNodes[nodeName] {
		return
	}
	log.Printf("[WARN] NUMA node %s does not exist in this host, skipping it", nodeName)
	c.warnedMissingNodes[nodeName] = true
}

func listNodeDirs() ([]string, error) {
	nodeDirs, err := filepath.Glob(filepath.Join(nodeBasePath, "node*"))
	if err != nil {
		return nil, fmt.Errorf("glob numa nodes: %w", err)
	}
	if len(nodeDirs) == 0 {
		return nil, fmt.Errorf("no NUMA nodes found under %s", nodeBasePath)
	}
	sort.Strings(nodeDirs)
	return nodeDirs, nil
}

func parseNodeID(nodeName string) (int, error) {
	if !strings.HasPrefix(nodeName, "node") {
		return 0, fmt.Errorf("invalid node name %q", nodeName)
	}
	id, err := strconv.Atoi(strings.TrimPrefix(nodeName, "node"))
	if err != nil {
		return 0, fmt.Errorf("invalid node id in %q: %w", nodeName, err)
	}
	return id, nil
}

func readCPUList(cpulistPath string) ([]int, error) {
	raw, err := os.ReadFile(cpulistPath)
	if err != nil {
		return nil, err
	}
	cpulist := strings.TrimSpace(string(raw))
	if cpulist == "" {
		return nil, fmt.Errorf("empty cpulist")
	}

	parts := strings.Split(cpulist, ",")
	cpus := make([]int, 0)
	for _, p := range parts {
		tok := strings.TrimSpace(p)
		if tok == "" {
			continue
		}
		if strings.Contains(tok, "-") {
			bounds := strings.SplitN(tok, "-", 2)
			if len(bounds) != 2 {
				return nil, fmt.Errorf("invalid range %q", tok)
			}
			start, err := strconv.Atoi(bounds[0])
			if err != nil {
				return nil, fmt.Errorf("invalid range start %q: %w", bounds[0], err)
			}
			end, err := strconv.Atoi(bounds[1])
			if err != nil {
				return nil, fmt.Errorf("invalid range end %q: %w", bounds[1], err)
			}
			if end < start {
				return nil, fmt.Errorf("invalid descending range %q", tok)
			}
			for i := start; i <= end; i++ {
				cpus = append(cpus, i)
			}
			continue
		}

		id, err := strconv.Atoi(tok)
		if err != nil {
			return nil, fmt.Errorf("invalid cpu id %q: %w", tok, err)
		}
		cpus = append(cpus, id)
	}

	if len(cpus) == 0 {
		return nil, fmt.Errorf("no CPUs parsed from cpulist")
	}
	return cpus, nil
}

func readProcStatByCPU(path string) (map[int]cpuSample, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	samples := make(map[int]cpuSample)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) < 8 {
			continue
		}
		if !strings.HasPrefix(fields[0], "cpu") || fields[0] == "cpu" {
			continue
		}

		cpuID, err := strconv.Atoi(strings.TrimPrefix(fields[0], "cpu"))
		if err != nil {
			continue
		}

		vals := make([]uint64, 0, len(fields)-1)
		for _, raw := range fields[1:] {
			v, err := strconv.ParseUint(raw, 10, 64)
			if err != nil {
				vals = nil
				break
			}
			vals = append(vals, v)
		}
		if len(vals) < 8 {
			continue
		}

		idle := vals[3] + vals[4]
		total := uint64(0)
		for _, v := range vals {
			total += v
		}
		samples[cpuID] = cpuSample{idle: idle, total: total}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	if len(samples) == 0 {
		return nil, fmt.Errorf("no cpuN entries parsed")
	}
	return samples, nil
}

func (c *Collector) calculateNodeCPUUsage(nodeName string, cpuIDs []int, current map[int]cpuSample) float64 {
	totalUsage := 0.0
	usedCores := 0

	for _, cpuID := range cpuIDs {
		curr, ok := current[cpuID]
		if !ok {
			log.Printf("[WARN] %s cpu%d missing from /proc/stat snapshot", nodeName, cpuID)
			continue
		}

		prev, hasPrev := c.prevCPUByLogicalCPU[cpuID]
		c.prevCPUByLogicalCPU[cpuID] = curr
		if !hasPrev {
			continue
		}
		if curr.total < prev.total || curr.idle < prev.idle {
			log.Printf("[WARN] cpu%d counter reset detected for %s", cpuID, nodeName)
			continue
		}

		deltaTotal := curr.total - prev.total
		deltaIdle := curr.idle - prev.idle
		if deltaTotal == 0 {
			continue
		}

		usage := 100.0 * (1.0 - (float64(deltaIdle) / float64(deltaTotal)))
		if usage < 0 {
			usage = 0
		}
		if usage > 100 {
			usage = 100
		}
		totalUsage += usage
		usedCores++
	}

	if usedCores == 0 {
		return 0
	}
	return totalUsage / float64(usedCores)
}

func readNodeMemory(meminfoPath string, nodeID int) (totalBytes uint64, usedBytes uint64, err error) {
	f, err := os.Open(meminfoPath)
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()

	totalKey := fmt.Sprintf("Node %d MemTotal:", nodeID)
	freeKey := fmt.Sprintf("Node %d MemFree:", nodeID)

	var totalKB uint64
	var freeKB uint64
	foundTotal := false
	foundFree := false

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, totalKey) {
			v, perr := parseKBValue(line)
			if perr != nil {
				return 0, 0, fmt.Errorf("parse %q: %w", totalKey, perr)
			}
			totalKB = v
			foundTotal = true
			continue
		}
		if strings.HasPrefix(line, freeKey) {
			v, perr := parseKBValue(line)
			if perr != nil {
				return 0, 0, fmt.Errorf("parse %q: %w", freeKey, perr)
			}
			freeKB = v
			foundFree = true
		}
	}
	if err := scanner.Err(); err != nil {
		return 0, 0, err
	}
	if !foundTotal || !foundFree {
		return 0, 0, fmt.Errorf("missing MemTotal or MemFree for node %d", nodeID)
	}
	if freeKB > totalKB {
		freeKB = totalKB
	}

	totalBytes = totalKB * 1024
	freeBytes := freeKB * 1024
	usedBytes = totalBytes - freeBytes
	return totalBytes, usedBytes, nil
}

func parseKBValue(line string) (uint64, error) {
	fields := strings.Fields(line)
	if len(fields) < 4 {
		return 0, fmt.Errorf("invalid meminfo line %q", line)
	}
	return strconv.ParseUint(fields[3], 10, 64)
}

func readNodeMissPages(numastatPath string) (uint64, error) {
	f, err := os.Open(numastatPath)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	var numaMiss uint64
	var otherNode uint64
	foundMiss := false
	foundOther := false

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) != 2 {
			continue
		}
		val, err := strconv.ParseUint(fields[1], 10, 64)
		if err != nil {
			continue
		}
		switch fields[0] {
		case "numa_miss":
			numaMiss = val
			foundMiss = true
		case "other_node":
			otherNode = val
			foundOther = true
		}
	}
	if err := scanner.Err(); err != nil {
		return 0, err
	}
	if foundMiss {
		if foundOther {
			return numaMiss + otherNode, nil
		}
		return numaMiss, nil
	}
	if foundOther {
		return otherNode, nil
	}
	return 0, fmt.Errorf("numa_miss and other_node not found")
}

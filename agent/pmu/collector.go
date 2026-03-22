package pmu

import (
	"fmt"
	"runtime"
	"golang.org/x/sys/unix"
)

// Collector handles reading PMU hardware and software counters via perf_event_open
type Collector struct {
	fdsCycles      []int
	fdsInstructions []int
	fdsCacheRefs   []int
	fdsCacheMisses []int
	fdsCtxSwitches []int
}

// Counters holds the absolute values read from all perf_event_open file descriptors
type Counters struct {
	Cycles       uint64
	Instructions uint64
	CacheRefs    uint64
	CacheMisses  uint64
	CtxSwitches  uint64
}

func openHWCounter(config uint64, cpu int) (int, error) {
	attr := &unix.PerfEventAttr{
		Type:   unix.PERF_TYPE_HARDWARE,
		Config: config,
		Bits:   unix.PerfBitDisabled,
	}
	fd, err := unix.PerfEventOpen(attr, -1, cpu, -1, unix.PERF_FLAG_FD_CLOEXEC)
	if err != nil {
		return 0, err
	}
	return fd, nil
}

func openSWCounter(config uint64, cpu int) (int, error) {
	attr := &unix.PerfEventAttr{
		Type:   unix.PERF_TYPE_SOFTWARE,
		Config: config,
		Bits:   unix.PerfBitDisabled,
	}
	fd, err := unix.PerfEventOpen(attr, -1, cpu, -1, unix.PERF_FLAG_FD_CLOEXEC)
	if err != nil {
		return 0, err
	}
	return fd, nil
}

// NewCollector initializes PMU hardware counters for CPU cycles, instructions, cache and context switches.
// We attach system-wide (PID -1) on all logical CPUs using runtime.NumCPU() iteratively.
func NewCollector() (*Collector, error) {
	numCPUs := runtime.NumCPU()
	c := &Collector{
		fdsCycles:       make([]int, 0, numCPUs),
		fdsInstructions: make([]int, 0, numCPUs),
		fdsCacheRefs:    make([]int, 0, numCPUs),
		fdsCacheMisses:  make([]int, 0, numCPUs),
		fdsCtxSwitches:  make([]int, 0, numCPUs),
	}

	for cpu := 0; cpu < numCPUs; cpu++ {
		fd1, err := openHWCounter(unix.PERF_COUNT_HW_CPU_CYCLES, cpu)
		if err != nil {
			c.Close()
			return nil, fmt.Errorf("failed to open CPU_CYCLES on cpu %d: %v", cpu, err)
		}
		c.fdsCycles = append(c.fdsCycles, fd1)

		fd2, err := openHWCounter(unix.PERF_COUNT_HW_INSTRUCTIONS, cpu)
		if err != nil {
			c.Close()
			return nil, fmt.Errorf("failed to open INSTRUCTIONS on cpu %d: %v", cpu, err)
		}
		c.fdsInstructions = append(c.fdsInstructions, fd2)

		fd3, err := openHWCounter(unix.PERF_COUNT_HW_CACHE_REFERENCES, cpu)
		if err != nil {
			c.Close()
			return nil, fmt.Errorf("failed to open CACHE_REFERENCES on cpu %d: %v", cpu, err)
		}
		c.fdsCacheRefs = append(c.fdsCacheRefs, fd3)

		fd4, err := openHWCounter(unix.PERF_COUNT_HW_CACHE_MISSES, cpu)
		if err != nil {
			c.Close()
			return nil, fmt.Errorf("failed to open CACHE_MISSES on cpu %d: %v", cpu, err)
		}
		c.fdsCacheMisses = append(c.fdsCacheMisses, fd4)

		fd5, err := openSWCounter(unix.PERF_COUNT_SW_CONTEXT_SWITCHES, cpu)
		if err != nil {
			c.Close()
			return nil, fmt.Errorf("failed to open CONTEXT_SWITCHES on cpu %d: %v", cpu, err)
		}
		c.fdsCtxSwitches = append(c.fdsCtxSwitches, fd5)
	}

	return c, nil
}

// Start enables all PMU counters across all CPUs
func (c *Collector) Start() error {
	allFDs := append(c.fdsCycles, c.fdsInstructions...)
	allFDs = append(allFDs, c.fdsCacheRefs...)
	allFDs = append(allFDs, c.fdsCacheMisses...)
	allFDs = append(allFDs, c.fdsCtxSwitches...)

	for _, fd := range allFDs {
		if err := unix.IoctlSetInt(fd, unix.PERF_EVENT_IOC_ENABLE, 0); err != nil {
			return fmt.Errorf("failed to enable counter fd=%d: %v", fd, err)
		}
	}
	return nil
}

// Stop disables all PMU counters across all CPUs
func (c *Collector) Stop() {
	allFDs := append(c.fdsCycles, c.fdsInstructions...)
	allFDs = append(allFDs, c.fdsCacheRefs...)
	allFDs = append(allFDs, c.fdsCacheMisses...)
	allFDs = append(allFDs, c.fdsCtxSwitches...)

	for _, fd := range allFDs {
		unix.IoctlSetInt(fd, unix.PERF_EVENT_IOC_DISABLE, 0)
	}
}

// Close releases all file descriptors
func (c *Collector) Close() {
	c.Stop()
	allFDs := append(c.fdsCycles, c.fdsInstructions...)
	allFDs = append(allFDs, c.fdsCacheRefs...)
	allFDs = append(allFDs, c.fdsCacheMisses...)
	allFDs = append(allFDs, c.fdsCtxSwitches...)

	for _, fd := range allFDs {
		unix.Close(fd)
	}
}

func readU64(fd int) (uint64, error) {
	buf := make([]byte, 8)
	if _, err := unix.Read(fd, buf); err != nil {
		return 0, err
	}
	return uint64(buf[0]) | uint64(buf[1])<<8 | uint64(buf[2])<<16 | uint64(buf[3])<<24 |
		uint64(buf[4])<<32 | uint64(buf[5])<<40 | uint64(buf[6])<<48 | uint64(buf[7])<<56, nil
}

func sumU64(fds []int) (uint64, error) {
	var total uint64
	for _, fd := range fds {
		val, err := readU64(fd)
		if err != nil {
			return 0, err
		}
		total += val
	}
	return total, nil
}

// ReadCounters fetches the current absolute sum of all PMU counters across the entire system
func (c *Collector) ReadCounters() (Counters, error) {
	cycles, err := sumU64(c.fdsCycles)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to sum cycles: %v", err)
	}
	inst, err := sumU64(c.fdsInstructions)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to sum instructions: %v", err)
	}
	cacheRefs, err := sumU64(c.fdsCacheRefs)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to sum cache_refs: %v", err)
	}
	cacheMisses, err := sumU64(c.fdsCacheMisses)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to sum cache_misses: %v", err)
	}
	ctx, err := sumU64(c.fdsCtxSwitches)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to sum ctx_switches: %v", err)
	}

	return Counters{
		Cycles:       cycles,
		Instructions: inst,
		CacheRefs:    cacheRefs,
		CacheMisses:  cacheMisses,
		CtxSwitches:  ctx,
	}, nil
}

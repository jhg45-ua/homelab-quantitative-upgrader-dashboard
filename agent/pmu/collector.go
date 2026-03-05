package pmu

import (
	"fmt"
	"golang.org/x/sys/unix"
)

// Collector handles reading PMU hardware and software counters via perf_event_open
type Collector struct {
	fdCycles      int
	fdInstructions int
	fdCacheRefs   int
	fdCacheMisses int
	fdCtxSwitches int
}

// Counters holds the absolute values read from all perf_event_open file descriptors
type Counters struct {
	Cycles      uint64
	Instructions uint64
	CacheRefs   uint64
	CacheMisses uint64
	CtxSwitches uint64
}

func openHWCounter(config uint64) (int, error) {
	attr := &unix.PerfEventAttr{
		Type:   unix.PERF_TYPE_HARDWARE,
		Config: config,
		Bits:   unix.PerfBitDisabled,
	}
	fd, err := unix.PerfEventOpen(attr, 0, -1, -1, unix.PERF_FLAG_FD_CLOEXEC)
	if err != nil {
		return 0, err
	}
	return fd, nil
}

func openSWCounter(config uint64) (int, error) {
	attr := &unix.PerfEventAttr{
		Type:   unix.PERF_TYPE_SOFTWARE,
		Config: config,
		Bits:   unix.PerfBitDisabled,
	}
	fd, err := unix.PerfEventOpen(attr, 0, -1, -1, unix.PERF_FLAG_FD_CLOEXEC)
	if err != nil {
		return 0, err
	}
	return fd, nil
}

// NewCollector initializes PMU hardware counters for CPU cycles, instructions, cache and context switches.
// We attach to the current process (PID 0) on any CPU (-1) to guarantee PMU counts work inside the VM.
func NewCollector() (*Collector, error) {
	fdCycles, err := openHWCounter(unix.PERF_COUNT_HW_CPU_CYCLES)
	if err != nil {
		return nil, fmt.Errorf("failed to open perf_event for CPU_CYCLES: %v", err)
	}

	fdInst, err := openHWCounter(unix.PERF_COUNT_HW_INSTRUCTIONS)
	if err != nil {
		unix.Close(fdCycles)
		return nil, fmt.Errorf("failed to open perf_event for INSTRUCTIONS: %v", err)
	}

	fdCacheRefs, err := openHWCounter(unix.PERF_COUNT_HW_CACHE_REFERENCES)
	if err != nil {
		unix.Close(fdCycles); unix.Close(fdInst)
		return nil, fmt.Errorf("failed to open perf_event for CACHE_REFERENCES: %v", err)
	}

	fdCacheMisses, err := openHWCounter(unix.PERF_COUNT_HW_CACHE_MISSES)
	if err != nil {
		unix.Close(fdCycles); unix.Close(fdInst); unix.Close(fdCacheRefs)
		return nil, fmt.Errorf("failed to open perf_event for CACHE_MISSES: %v", err)
	}

	fdCtx, err := openSWCounter(unix.PERF_COUNT_SW_CONTEXT_SWITCHES)
	if err != nil {
		unix.Close(fdCycles); unix.Close(fdInst); unix.Close(fdCacheRefs); unix.Close(fdCacheMisses)
		return nil, fmt.Errorf("failed to open perf_event for CONTEXT_SWITCHES: %v", err)
	}

	return &Collector{
		fdCycles:      fdCycles,
		fdInstructions: fdInst,
		fdCacheRefs:   fdCacheRefs,
		fdCacheMisses: fdCacheMisses,
		fdCtxSwitches: fdCtx,
	}, nil
}

// Start enables all PMU counters
func (c *Collector) Start() error {
	fds := []int{c.fdCycles, c.fdInstructions, c.fdCacheRefs, c.fdCacheMisses, c.fdCtxSwitches}
	for _, fd := range fds {
		if err := unix.IoctlSetInt(fd, unix.PERF_EVENT_IOC_ENABLE, 0); err != nil {
			return fmt.Errorf("failed to enable counter fd=%d: %v", fd, err)
		}
	}
	return nil
}

// Stop disables all PMU counters
func (c *Collector) Stop() {
	fds := []int{c.fdCycles, c.fdInstructions, c.fdCacheRefs, c.fdCacheMisses, c.fdCtxSwitches}
	for _, fd := range fds {
		unix.IoctlSetInt(fd, unix.PERF_EVENT_IOC_DISABLE, 0)
	}
}

// Close releases all file descriptors
func (c *Collector) Close() {
	c.Stop()
	unix.Close(c.fdCycles)
	unix.Close(c.fdInstructions)
	unix.Close(c.fdCacheRefs)
	unix.Close(c.fdCacheMisses)
	unix.Close(c.fdCtxSwitches)
}

func readU64(fd int) (uint64, error) {
	buf := make([]byte, 8)
	if _, err := unix.Read(fd, buf); err != nil {
		return 0, err
	}
	return uint64(buf[0]) | uint64(buf[1])<<8 | uint64(buf[2])<<16 | uint64(buf[3])<<24 |
		uint64(buf[4])<<32 | uint64(buf[5])<<40 | uint64(buf[6])<<48 | uint64(buf[7])<<56, nil
}

// ReadCounters fetches the current absolute value of all PMU counters
func (c *Collector) ReadCounters() (Counters, error) {
	cycles, err := readU64(c.fdCycles)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to read cycles: %v", err)
	}
	inst, err := readU64(c.fdInstructions)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to read instructions: %v", err)
	}
	cacheRefs, err := readU64(c.fdCacheRefs)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to read cache_refs: %v", err)
	}
	cacheMisses, err := readU64(c.fdCacheMisses)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to read cache_misses: %v", err)
	}
	ctx, err := readU64(c.fdCtxSwitches)
	if err != nil {
		return Counters{}, fmt.Errorf("failed to read ctx_switches: %v", err)
	}

	return Counters{
		Cycles:      cycles,
		Instructions: inst,
		CacheRefs:   cacheRefs,
		CacheMisses: cacheMisses,
		CtxSwitches: ctx,
	}, nil
}

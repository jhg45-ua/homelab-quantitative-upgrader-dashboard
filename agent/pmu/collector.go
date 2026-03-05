package pmu

import (
	"fmt"
	"golang.org/x/sys/unix"
)

// Collector handles reading PMU hardware counters via perf_event_open
type Collector struct {
	fdCycles       int
	fdInstructions int
}

// NewCollector initializes the system-wide PMU counters for CPU cycles and instructions
func NewCollector() (*Collector, error) {
	// 1. Setup PERF_COUNT_HW_CPU_CYCLES
	attrCycles := &unix.PerfEventAttr{
		Type:     unix.PERF_TYPE_HARDWARE,
		Config:   unix.PERF_COUNT_HW_CPU_CYCLES,
		// In golang.org/x/sys/unix, Disabled is a bitfield inside the Bits member.
		Bits:     unix.PerfBitDisabled, 
	}
	// Note: Profiling system-wide (PID -1, CPU 0) is often blocked by KVM/Proxmox in VMs unless vPMU is passed-through.
	// We attach to the current process (PID 0) on any CPU (-1) to guarantee PMU counts work inside the VM without vPMU hacks.
	fdCycles, err := unix.PerfEventOpen(attrCycles, 0, -1, -1, unix.PERF_FLAG_FD_CLOEXEC)
	if err != nil {
		return nil, fmt.Errorf("failed to open perf_event for CPU_CYCLES: %v", err)
	}

	// 2. Setup PERF_COUNT_HW_INSTRUCTIONS
	attrInst := &unix.PerfEventAttr{
		Type:     unix.PERF_TYPE_HARDWARE,
		Config:   unix.PERF_COUNT_HW_INSTRUCTIONS,
		Bits:     unix.PerfBitDisabled,
	}
	fdInstructions, err := unix.PerfEventOpen(attrInst, 0, -1, -1, unix.PERF_FLAG_FD_CLOEXEC)
	if err != nil {
		unix.Close(fdCycles)
		return nil, fmt.Errorf("failed to open perf_event for INSTRUCTIONS: %v", err)
	}

	return &Collector{
		fdCycles:       fdCycles,
		fdInstructions: fdInstructions,
	}, nil
}

// Start enables the PMU counters
func (c *Collector) Start() error {
	if err := unix.IoctlSetInt(c.fdCycles, unix.PERF_EVENT_IOC_ENABLE, 0); err != nil {
		return fmt.Errorf("failed to enable cycles counter: %v", err)
	}
	if err := unix.IoctlSetInt(c.fdInstructions, unix.PERF_EVENT_IOC_ENABLE, 0); err != nil {
		return fmt.Errorf("failed to enable instructions counter: %v", err)
	}
	return nil
}

// Stop disables the PMU counters
func (c *Collector) Stop() error {
	unix.IoctlSetInt(c.fdCycles, unix.PERF_EVENT_IOC_DISABLE, 0)
	unix.IoctlSetInt(c.fdInstructions, unix.PERF_EVENT_IOC_DISABLE, 0)
	return nil
}

// Close releases the file descriptors
func (c *Collector) Close() {
	c.Stop()
	unix.Close(c.fdCycles)
	unix.Close(c.fdInstructions)
}

// ReadCounters fetches the current absolute cycle and instruction count
func (c *Collector) ReadCounters() (cycles uint64, instructions uint64, err error) {
	bufCycles := make([]byte, 8)
	bufInst := make([]byte, 8)

	if _, err := unix.Read(c.fdCycles, bufCycles); err != nil {
		return 0, 0, fmt.Errorf("failed to read cycles count: %v", err)
	}
	if _, err := unix.Read(c.fdInstructions, bufInst); err != nil {
		return 0, 0, fmt.Errorf("failed to read instructions count: %v", err)
	}

	// Convert 8 bytes (uint64) little endian
	cycles = uint64(bufCycles[0]) | uint64(bufCycles[1])<<8 | uint64(bufCycles[2])<<16 | uint64(bufCycles[3])<<24 | uint64(bufCycles[4])<<32 | uint64(bufCycles[5])<<40 | uint64(bufCycles[6])<<48 | uint64(bufCycles[7])<<56
	instructions = uint64(bufInst[0]) | uint64(bufInst[1])<<8 | uint64(bufInst[2])<<16 | uint64(bufInst[3])<<24 | uint64(bufInst[4])<<32 | uint64(bufInst[5])<<40 | uint64(bufInst[6])<<48 | uint64(bufInst[7])<<56

	return cycles, instructions, nil
}

package ipmi

import (
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"time"
)

type Collector struct {
	Host string
	User string
	Pass string
}

func NewCollector(host, user, pass string) *Collector {
	return &Collector{
		Host: host,
		User: user,
		Pass: pass,
	}
}

// ReadPowerWatts executes ipmitool over LAN+ and parses the instantaneous power reading.
func (c *Collector) ReadPowerWatts() (float64, error) {
	// Added a 3-second timeout context to prevent the agent from hanging completely
	// if the IPMI interface goes offline or is unreachable.
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Execute ipmitool natively on the local baremetal node to avoid iDRAC LAN session exhaustion
	cmd := exec.CommandContext(ctx, "ipmitool", "dcmi", "power", "reading")
	output, err := cmd.Output()
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return 0, fmt.Errorf("ipmitool timed out connecting to %s", c.Host)
		}
		return 0, fmt.Errorf("ipmitool execution failed: %v", err)
	}

	// Example output line we are looking for:
	// Instantaneous power reading:                   150 Watts
	re := regexp.MustCompile(`Instantaneous power reading:\s+(\d+)\s+Watts`)
	matches := re.FindStringSubmatch(string(output))

	if len(matches) < 2 {
		return 0, fmt.Errorf("could not parse power reading from output: %s", string(output))
	}

	watts, err := strconv.ParseFloat(matches[1], 64)
	if err != nil {
		return 0, fmt.Errorf("invalid watts value parsed: %v", err)
	}

	return watts, nil
}

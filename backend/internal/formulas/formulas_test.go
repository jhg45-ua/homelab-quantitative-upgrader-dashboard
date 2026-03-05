package formulas

import (
	"math"
	"testing"
)

const float64EqualityThreshold = 1e-9

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) <= float64EqualityThreshold
}

func TestActualCPI(t *testing.T) {
	tests := []struct {
		name         string
		cycles       float64
		instructions float64
		want         float64
	}{
		{"Normal calculation", 1000, 500, 2.0},
		{"Zero instructions guard", 1000, 0, 0.0},
		{"Less than 1 CPI", 500, 1000, 0.5},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ActualCPI(tt.cycles, tt.instructions); !almostEqual(got, tt.want) {
				t.Errorf("ActualCPI() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAMAT(t *testing.T) {
	tests := []struct {
		name         string
		l1HitTime    float64
		l1MissRate   float64
		l1MissPenalty float64
		want         float64
	}{
		{"Typical values", 1.0, 0.05, 50.0, 3.5},
		{"No misses", 1.0, 0.0, 50.0, 1.0},
		{"All misses", 1.0, 1.0, 50.0, 51.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := AMAT(tt.l1HitTime, tt.l1MissRate, tt.l1MissPenalty); !almostEqual(got, tt.want) {
				t.Errorf("AMAT() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAmdahlSpeedup(t *testing.T) {
	tests := []struct {
		name             string
		parallelFraction float64
		nCores           float64
		want             float64
	}{
		{"50% parallel on 2 cores", 0.5, 2, 1.333333333},
		{"90% parallel on 10 cores", 0.9, 10, 5.263157895},
		{"0% parallel", 0.0, 8, 1.0},
		{"100% parallel on 4 cores", 1.0, 4, 4.0},
		{"Zero cores guard", 0.5, 0, 0.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := AmdahlSpeedup(tt.parallelFraction, tt.nCores); !almostEqual(got, tt.want) {
				t.Errorf("AmdahlSpeedup() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestOperationalIntensity(t *testing.T) {
	tests := []struct {
		name          string
		opsPerformed  float64
		bytesAccessed float64
		want          float64
	}{
		{"Normal calculation", 1000, 200, 5.0},
		{"Zero bytes guard", 1000, 0, 0.0},
		{"Memory bound", 100, 1000, 0.1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := OperationalIntensity(tt.opsPerformed, tt.bytesAccessed); !almostEqual(got, tt.want) {
				t.Errorf("OperationalIntensity() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRooflinePerformance(t *testing.T) {
	tests := []struct {
		name                 string
		peakCPUPerf          float64
		operationalIntensity float64
		peakMemBandwidth     float64
		want                 float64
	}{
		{"Compute bound", 100.0, 10.0, 20.0, 100.0}, // 100 vs (10*20=200) -> 100
		{"Memory bound", 100.0, 2.0, 20.0, 40.0},  // 100 vs (2*20=40) -> 40
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := RooflinePerformance(tt.peakCPUPerf, tt.operationalIntensity, tt.peakMemBandwidth); !almostEqual(got, tt.want) {
				t.Errorf("RooflinePerformance() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestLittleLawQueueLength(t *testing.T) {
	tests := []struct {
		name            string
		arrivalRate     float64
		avgResponseTime float64
		want            float64
	}{
		{"Normal calculation", 100.0, 0.05, 5.0}, // 100 requests/sec, 50ms average -> 5 requests in queue
		{"Idle system", 0.0, 0.05, 0.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := LittleLawQueueLength(tt.arrivalRate, tt.avgResponseTime); !almostEqual(got, tt.want) {
				t.Errorf("LittleLawQueueLength() = %v, want %v", got, tt.want)
			}
		})
	}
}

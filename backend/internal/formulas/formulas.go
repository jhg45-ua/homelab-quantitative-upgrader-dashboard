package formulas

import "math"

// ActualCPI calculates efficiency (Actual Cycles Per Instruction)
// CPI = Delta Total CPU Cycles / Delta Executed Instructions
func ActualCPI(deltaCycles, deltaInstructions float64) float64 {
	if deltaInstructions == 0 {
		return 0
	}
	return deltaCycles / deltaInstructions
}

// AMAT calculates Memory Penalty (Average Memory Access Time)
// AMAT = L1 Hit Time + (L1 Miss Rate * L1 Miss Penalty)
func AMAT(l1HitTime, l1MissRate, l1MissPenalty float64) float64 {
	return l1HitTime + (l1MissRate * l1MissPenalty)
}

// AmdahlSpeedup calculates Amdahl's Law (Scalability Limits)
// Speedup = 1 / ((1 - Parallelizable Fraction) + (Parallelizable Fraction / N Cores))
func AmdahlSpeedup(parallelFraction, nCores float64) float64 {
	if nCores == 0 {
		return 0
	}
	return 1.0 / ((1.0 - parallelFraction) + (math.Max(0, parallelFraction) / nCores))
}

// OperationalIntensity calculates Roofline Model Operational Intensity
// Operational Intensity = Operations Performed / Bytes Accessed in Memory
func OperationalIntensity(operationsPerformed, bytesAccessed float64) float64 {
	if bytesAccessed == 0 {
		return 0
	}
	return operationsPerformed / bytesAccessed
}

// RooflinePerformance calculates Roofline Model Performance
// Performance = min(Peak CPU Performance, Operational Intensity * Peak Memory Bandwidth)
func RooflinePerformance(peakCPUPerf, operationalIntensity, peakMemBandwidth float64) float64 {
	return math.Min(peakCPUPerf, operationalIntensity*peakMemBandwidth)
}

// LittleLawQueueLength calculates Little's Law (I/O Saturation)
// Average Queue Length = Arrival Rate * Average Response Time
func LittleLawQueueLength(arrivalRate, avgResponseTime float64) float64 {
	return arrivalRate * avgResponseTime
}

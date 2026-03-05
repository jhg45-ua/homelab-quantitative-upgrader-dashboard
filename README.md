# HomeLab Quantitative Upgrader Dashboard (HQUD)

## 1. PROJECT OBJECTIVE
Monitoring, empirical analysis, and hardware auditing platform for a HomeLab environment (Proxmox/Ubuntu). It mathematically quantifies the impact of workloads and generates justified verdicts on hardware upgrades based on the book "Computer Architecture: A Quantitative Approach" (Hennessy & Patterson).

## 2. DESIGN PRINCIPLES
- **Abstraction:** 5 independent microservices (Modules A-E).
- **Agnosticism:** Modular interfaces. Compatible with IPMI 2.0 (Dell R720) and standard eBPF.
- **Mathematical Approach:** Strict use of computer architecture formulas. The use of superficial metrics like "global CPU percentage" is strictly prohibited.

## 3. LAYERED ARCHITECTURE AND MATHEMATICS

### Module A: Sensory Extraction (eBPF/Go Agent)
Low-impact probes operating on the bare-metal host.
- **Kernel (eBPF):** Context Switches, Run Queue latencies, Block I/O.
- **Hardware (PMU):** Instructions, cycles, L1/L2/LLC misses.
- **OOB/RAS (IPMI):** Watts, temperatures, ECC/SMART errors.

### Module B: Storage (VictoriaMetrics TSDB)
Time-series database with multidimensional labeling (e.g., `node=r720`, `socket=1`, `numa=1`, `vm_id=105`).

### Module C: Quantitative Engine (Go Backend)
Applies the following physical and mathematical laws to the raw data:

- **Efficiency (Actual CPI):**
  $$CPI = \frac{\Delta \text{Total CPU Cycles}}{\Delta \text{Executed Instructions}}$$
- **Memory Penalty (AMAT):**
  $$AMAT = \text{L1 Hit Time} + (\text{L1 Miss Rate} \times \text{L1 Miss Penalty})$$
- **Amdahl's Law (Scalability Limits):**
  $$\text{Speedup} = \frac{1}{(1 - \text{Parallelizable Fraction}) + \frac{\text{Parallelizable Fraction}}{\text{N Cores}}}$$
- **Roofline Model:**
  $$\text{Operational Intensity} = \frac{\text{Operations Performed}}{\text{Bytes Accessed in Memory}}$$
  $$\text{Performance} = \min(\text{Peak CPU Performance}, \text{Operational Intensity} \times \text{Peak Memory Bandwidth})$$
- **Little's Law (I/O Saturation):**
  $$\text{Average Queue Length} = \text{Arrival Rate} \times \text{Average Response Time}$$

### Module D: Scientific Visualization (SvelteKit + ECharts)
Analytical UI. Includes an interactive Roofline Chart, Latency Heatmaps, and Queue Saturation Dashboards.

### Module E: Automated Auditor (Python)
Synthesis engine. Extracts time windows, diagnoses primary bottlenecks, and issues an upgrade verdict exportable to PDF, Markdown, and JSON.
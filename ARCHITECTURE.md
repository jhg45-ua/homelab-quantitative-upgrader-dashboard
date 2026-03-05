# ARCHITECTURE: HomeLab Quantitative Upgrader Dashboard (HQUD)

## Environment Context
- **OS:** Ubuntu 24.04 LTS (Kernel 6.8)
- **Arch:** x86_64 (Targeting Dell R720 / Intel Xeon E5-2600 v2)
- **Virtualization:** Proxmox KVM (NUMA enabled)

## Mathematical Core (Hennessy & Patterson)
All modules must prioritize these 4 pillars:
1. **CPI & Stalls:** Analysis of Cycles Per Instruction vs. Pipeline Stalls.
2. **AMAT:** Average Memory Access Time including NUMA remote penalties.
3. **Roofline Model:** Computational peak vs. Memory bandwidth.
4. **Little's Law:** Queue depth analysis for I/O and Network.

## Service Map
- **Módulo A (Agent):** Go + eBPF (CO-RE: Compile Once, Run Everywhere). Captures RAW hardware counters.
- **Módulo B (DB):** VictoriaMetrics (TSDB).
- **Módulo C (Logic):** Go Backend. Applies the formulas.
- **Módulo D (UI):** SvelteKit + Apache ECharts (Scientific visualizations).
- **Módulo E (Audit):** Python script (Ephemeral) for PDF/Markdown reports.

## Technical Constraints
- Memory footprint: < 200MB for the whole stack (excluding DB storage).
- Agent must use `cilium/ebpf` and `bpf2go` for toolchain.
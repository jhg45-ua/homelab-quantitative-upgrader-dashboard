# HQUD — HomeLab Quantitative Upgrader Dashboard

## Objective
Empirical hardware auditing for HomeLab servers based on the principles of
**Hennessy & Patterson, Computer Architecture: A Quantitative Approach (6th ed.)**.

HQUD replaces traditional percentage-based monitoring (CPU %, MEM %) with
mathematically rigorous metrics that reveal *why* hardware is fast or slow,
not merely *how busy* it is.

## Architecture (Modules A–F)

| Module | Stack | Responsibility |
|---|---|---|
| **A — PMU Collector** | Go + `perf_event_open` | CPI, Cache Miss Rate, AMAT, Context Switches |
| **B — eBPF I/O** | Go + Cilium eBPF | Block I/O latency histogram → P99 via `blk_mq` kprobes |
| **C — IPMI OOB** | Go + `ipmitool` | Power (W), Efficiency (IPS/W) via iDRAC DCMI |
| **D — Frontend** | SvelteKit + ECharts | Executive Overview, Deep Dive (Heatmap, CPI, Roofline), Methodology |
| **E — Auditor** | Python + Jinja2 | One-click Markdown audit report from live VictoriaMetrics data |
| **F — Network eBPF** | Go + Cilium eBPF | TCP retransmit rate via `tcp_retransmit_skb` kprobe |

**Data Pipeline:** Agent (Go) → VictoriaMetrics (Prometheus wire format) → SvelteKit (PromQL queries)

## Core Metrics (Development Rules)

> **STRICT RULE:** Never use traditional utilisation percentages.
> All dashboards and reports must be expressed in the following quantitative metrics:

| Metric | Formula | Source |
|---|---|---|
| **CPI** | ΔCycles / ΔInstructions | PMU `PERF_COUNT_HW_CPU_CYCLES` + `PERF_COUNT_HW_INSTRUCTIONS` |
| **AMAT** | L1_hit_time + MissRate × RAM_penalty | PMU Cache Miss Rate, constants in config |
| **P99 Latency** | `histogram_quantile(0.99, ...)` | eBPF `blk_mq` kprobes |
| **NUMA Miss Rate** | misses / (hits + misses) × 100 | `/sys/devices/system/node/node*/numastat` |
| **Roofline Model** | OI = Instr / (CacheMiss×64B), Perf = MIPS | PMU + config peak_mips / max_mem_bw_gbps |
| **TCP Retransmits/s** | Δcount / Δtime | eBPF kprobe `tcp_retransmit_skb` |

## Hardware Agnosticism

All hardware-specific values come from `config.yaml` at the project root:
- `node_name` — target hostname for PromQL queries
- `hardware_desc` — human-readable description for UI and reports
- `specs.peak_mips` — Roofline compute ceiling
- `specs.max_mem_bw_gbps` — Roofline memory bandwidth ceiling
- `ipmi.*` — out-of-band management credentials

The Go backend serves `GET /api/hardware` which returns the parsed config as JSON.
The frontend and Python auditor consume this to remain hardware-agnostic.

## Key Files

```
config.yaml                     # Hardware configuration (agnóstico)
agent/main.go                   # Unified agent: eBPF + PMU + IPMI + NUMA
agent/bpf/io_latency.c          # eBPF block I/O latency histogram
agent/bpf/net_tcp.c             # eBPF TCP retransmit counter
agent/pmu/collector.go          # PMU perf_event_open wrapper
agent/numa/collector.go         # NUMA sysfs reader
agent/ipmi/collector.go         # iDRAC DCMI power reader
backend/cmd/server/main.go      # HTTP server: /api/generate-audit, /api/hardware
backend/pkg/tsdb/client.go      # VictoriaMetrics push client
auditor/generate_report.py      # Python audit report generator
auditor/template.md             # Jinja2 report template
frontend/src/routes/+page.svelte           # Executive Overview
frontend/src/routes/advanced/+page.svelte   # Scientific Deep Dive
frontend/src/routes/methodology/+page.svelte # Methodology
frontend/src/lib/HeatmapChart.svelte        # eBPF I/O heatmap
frontend/src/lib/CPIChart.svelte            # CPI time-series
frontend/src/lib/MemoryOSChart.svelte       # Cache Miss + Context Switches
frontend/src/lib/RooflineChart.svelte       # Roofline Model scatter
```

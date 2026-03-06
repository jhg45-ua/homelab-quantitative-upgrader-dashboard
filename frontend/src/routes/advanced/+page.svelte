<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import HeatmapChart from "$lib/HeatmapChart.svelte";
  import CPIChart from "$lib/CPIChart.svelte";
  import MemoryOSChart from "$lib/MemoryOSChart.svelte";
  import RooflineChart from "$lib/RooflineChart.svelte";
  import { hwConfig } from "$lib/hwConfig";

  let powerWatts = "---";
  let efficiencyIpsW = "---";
  let amatCycles = "---";
  let amatHigh = false;
  let numaMissRate = "---";
  let numaHigh = false;
  let tcpRetransmits = "---";
  let tcpHigh = false;
  let interval: ReturnType<typeof setInterval>;

  const VM = "/api/vm/api/v1/query";

  async function fetchScalars() {
    const node = $hwConfig.node_name;
    try {
      const [pmRes, effRes, amatRes, numaRes, tcpRes] = await Promise.all([
        fetch(`${VM}?query=hqud_power_watts{host="${node}"}`),
        fetch(`${VM}?query=hqud_efficiency_ips_per_watt{host="${node}"}`),
        fetch(`${VM}?query=hqud_cpu_amat_cycles{host="${node}"}`),
        fetch(`${VM}?query=hqud_numa_miss_rate{host="${node}"}`),
        fetch(`${VM}?query=hqud_net_tcp_retransmits_ps{host="${node}"}`),
      ]);
      const pmd = await pmRes.json();
      const effd = await effRes.json();
      const amatd = await amatRes.json();
      const numad = await numaRes.json();
      const tcpd = await tcpRes.json();

      powerWatts =
        pmd.status === "success" && pmd.data.result.length > 0
          ? parseFloat(pmd.data.result[0].value[1]).toFixed(1)
          : "---";
      efficiencyIpsW =
        effd.status === "success" && effd.data.result.length > 0
          ? parseFloat(effd.data.result[0].value[1]).toFixed(1)
          : "---";
      if (amatd.status === "success" && amatd.data.result.length > 0) {
        const v = parseFloat(amatd.data.result[0].value[1]);
        amatCycles = v.toFixed(2);
        amatHigh = v > 15.0;
      } else {
        amatCycles = "---";
        amatHigh = false;
      }
      if (numad.status === "success" && numad.data.result.length > 0) {
        const v = parseFloat(numad.data.result[0].value[1]);
        numaMissRate = v.toFixed(2);
        numaHigh = v > 20.0;
      } else {
        numaMissRate = "---";
        numaHigh = false;
      }
      if (tcpd.status === "success" && tcpd.data.result.length > 0) {
        const v = parseFloat(tcpd.data.result[0].value[1]);
        tcpRetransmits = v.toFixed(1);
        tcpHigh = v > 0;
      } else {
        tcpRetransmits = "---";
        tcpHigh = false;
      }
    } catch (e) {
      console.error("Scalar fetch error", e);
    }
  }

  onMount(() => {
    fetchScalars();
    interval = setInterval(fetchScalars, 5000);
  });
  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<svelte:head><title>HQUD — Scientific Deep Dive</title></svelte:head>

<div class="layout">
  <!-- HUD metrics row (6 cards) -->
  <div class="hud-grid">
    <div class="metric-card">
      <div class="metric-label">Target Node</div>
      <div class="metric-value accent">{$hwConfig.node_name}</div>
      <div class="metric-sub">{$hwConfig.hardware_desc}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Active Power</div>
      <div class="row-baseline">
        <span class="metric-value warn">{powerWatts}</span>
        <span class="metric-unit">W</span>
      </div>
      <div class="metric-sub">via iDRAC DCMI</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">CPU Efficiency</div>
      <div class="row-baseline">
        <span class="metric-value success">{efficiencyIpsW}</span>
        <span class="metric-unit">IPS/W</span>
      </div>
      <div class="metric-sub">PMU × IPMI</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Memory AMAT</div>
      <div class="row-baseline">
        <span class="metric-value {amatHigh ? 'danger' : 'success'}"
          >{amatCycles}</span
        >
        <span class="metric-unit">cycles</span>
      </div>
      <div class="metric-sub {amatHigh ? 'warn-sub' : ''}">
        {amatHigh ? "⚠ Memory pressure" : "✓ L1 + Miss×150c"}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">NUMA Miss Rate</div>
      <div class="row-baseline">
        <span class="metric-value {numaHigh ? 'danger' : 'success'}"
          >{numaMissRate}</span
        >
        <span class="metric-unit">%</span>
      </div>
      <div class="metric-sub {numaHigh ? 'warn-sub' : ''}">
        {numaHigh ? "⚠ Cross-socket traffic" : "✓ Local memory access"}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">TCP Retransmits</div>
      <div class="row-baseline">
        <span class="metric-value {tcpHigh ? 'warn' : 'success'}"
          >{tcpRetransmits}</span
        >
        <span class="metric-unit">/s</span>
      </div>
      <div class="metric-sub {tcpHigh ? 'warn-sub' : ''}">
        {tcpHigh ? "⚠ Packet loss" : "✓ Clean TCP"}
      </div>
    </div>
  </div>

  <!-- Heatmap (row 2, 4fr) -->
  <div class="chart-panel">
    <HeatmapChart />
  </div>

  <!-- Bottom: CPI + Memory/OS + Roofline (row 3, 3fr) -->
  <div class="bottom-row">
    <div class="chart-panel"><CPIChart /></div>
    <div class="chart-panel"><MemoryOSChart /></div>
    <div class="chart-panel"><RooflineChart /></div>
  </div>
</div>

<style>
  /* ── Page grid ───────────────────────────────────────────────────────── */
  .layout {
    height: calc(100dvh - 3.25rem);
    display: grid;
    grid-template-rows: auto minmax(0, 4fr) minmax(0, 3fr);
    gap: 0.6rem;
    padding: 0.6rem;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* ── HUD grid (6 cards) ──────────────────────────────────────────────── */
  .hud-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.55rem;
  }

  @media (max-width: 1100px) {
    .hud-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 768px) {
    .hud-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .bottom-row {
      grid-template-columns: 1fr;
    }
  }

  /* ── Metric card overrides (scoped) ──────────────────────────────────── */
  .metric-card {
    background: rgba(10, 20, 40, 0.85);
    border: 1px solid rgba(51, 65, 85, 0.6);
    border-top: 2px solid rgba(56, 189, 248, 0.25);
    border-radius: 10px;
    padding: 0.65rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    transition:
      border-color 0.25s,
      box-shadow 0.25s;
  }
  .metric-card:hover {
    border-top-color: rgba(56, 189, 248, 0.6);
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.06);
  }

  .metric-label {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-size: 0.55rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #64748b;
  }

  .metric-value {
    font-family: "JetBrains Mono", monospace, ui-monospace;
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.1;
    margin-top: 0.05rem;
  }
  .metric-value.accent {
    color: #38bdf8;
  }
  .metric-value.warn {
    color: #fb923c;
  }
  .metric-value.success {
    color: #34d399;
  }
  .metric-value.danger {
    color: #f87171;
  }

  .metric-unit {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.65rem;
    color: #475569;
    margin-left: 0.15rem;
    align-self: flex-end;
    padding-bottom: 0.1rem;
  }

  .row-baseline {
    display: flex;
    align-items: baseline;
  }

  .metric-sub {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-size: 0.6rem;
    color: #334155;
    margin-top: 0.15rem;
    line-height: 1.2;
  }
  .warn-sub {
    color: #7f1d1d;
  }

  /* ── Chart bottom row (3 panels now) ─────────────────────────────────── */
  .bottom-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.6rem;
    min-height: 0;
  }
</style>

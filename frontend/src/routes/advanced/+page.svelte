<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import HeatmapChart from '$lib/HeatmapChart.svelte';
  import CPIChart from '$lib/CPIChart.svelte';
  import MemoryOSChart from '$lib/MemoryOSChart.svelte';

  let powerWatts = "---";
  let efficiencyIpsW = "---";
  let amatCycles = "---";
  let amatHigh = false;
  let interval: ReturnType<typeof setInterval>;

  const VM = '/api/vm/api/v1/query';

  async function fetchScalars() {
    try {
      const [pmRes, effRes, amatRes] = await Promise.all([
        fetch(`${VM}?query=hqud_power_watts{host="r720-vm"}`),
        fetch(`${VM}?query=hqud_efficiency_ips_per_watt{host="r720-vm"}`),
        fetch(`${VM}?query=hqud_cpu_amat_cycles{host="r720-vm"}`)
      ]);
      const pmd  = await pmRes.json();
      const effd = await effRes.json();
      const amatd = await amatRes.json();
      powerWatts = pmd.status === 'success' && pmd.data.result.length > 0
        ? parseFloat(pmd.data.result[0].value[1]).toFixed(1) : "---";
      efficiencyIpsW = effd.status === 'success' && effd.data.result.length > 0
        ? parseFloat(effd.data.result[0].value[1]).toFixed(1) : "---";
      if (amatd.status === 'success' && amatd.data.result.length > 0) {
        const v = parseFloat(amatd.data.result[0].value[1]);
        amatCycles = v.toFixed(2); amatHigh = v > 15.0;
      } else { amatCycles = "---"; amatHigh = false; }
    } catch (e) { console.error("Scalar fetch error", e); }
  }

  onMount(() => { fetchScalars(); interval = setInterval(fetchScalars, 5000); });
  onDestroy(() => { if (interval) clearInterval(interval); });
</script>

<svelte:head><title>HQUD — Scientific Deep Dive</title></svelte:head>

<div class="layout">

  <!-- HUD metrics row -->
  <div class="hud-grid">
    <div class="metric-card">
      <div class="metric-label">Target Node</div>
      <div class="metric-value accent">r720-vm</div>
      <div class="metric-sub">Dell PowerEdge R720</div>
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
        <span class="metric-value {amatHigh ? 'danger' : 'success'}">{amatCycles}</span>
        <span class="metric-unit">cycles</span>
      </div>
      <div class="metric-sub {amatHigh ? 'warn-sub' : ''}">
        {amatHigh ? '⚠ Memory pressure' : '✓ L1 + Miss×150c'}
      </div>
    </div>
  </div>

  <!-- Heatmap (row 2, 5fr) -->
  <div class="chart-panel">
    <HeatmapChart />
  </div>

  <!-- Bottom: CPI + Memory/OS (row 3, 3fr) -->
  <div class="bottom-row">
    <div class="chart-panel"><CPIChart /></div>
    <div class="chart-panel"><MemoryOSChart /></div>
  </div>

</div>

<style>
  /* ── Page grid ───────────────────────────────────────────────────────── */
  .layout {
    height: calc(100dvh - 3.25rem);
    display: grid;
    grid-template-rows: auto minmax(0, 5fr) minmax(0, 3fr);
    gap: 0.7rem;
    padding: 0.7rem;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* ── HUD grid ────────────────────────────────────────────────────────── */
  .hud-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.7rem;
  }

  @media (max-width: 768px) {
    .hud-grid { grid-template-columns: repeat(2, 1fr); }
    .bottom-row { grid-template-columns: 1fr; }
  }

  /* ── Metric card overrides (scoped to this page) ─────────────────────── */
  .metric-card {
    background: rgba(10, 20, 40, 0.85);
    border: 1px solid rgba(51, 65, 85, 0.6);
    border-top: 2px solid rgba(56, 189, 248, 0.25);
    border-radius: 10px;
    padding: 0.9rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    transition: border-color 0.25s, box-shadow 0.25s;
  }
  .metric-card:hover {
    border-top-color: rgba(56, 189, 248, 0.6);
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.06);
  }

  .metric-label {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #64748b;
  }

  .metric-value {
    font-family: 'JetBrains Mono', monospace, ui-monospace;
    font-size: 1.55rem;
    font-weight: 700;
    line-height: 1.1;
    margin-top: 0.1rem;
  }
  .metric-value.accent  { color: #38bdf8; }
  .metric-value.warn    { color: #fb923c; }
  .metric-value.success { color: #34d399; }
  .metric-value.danger  { color: #f87171; }

  .metric-unit {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: #475569;
    margin-left: 0.2rem;
    align-self: flex-end;
    padding-bottom: 0.15rem;
  }

  .row-baseline { display: flex; align-items: baseline; }

  .metric-sub  {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 0.68rem;
    color: #334155;
    margin-top: 0.25rem;
    line-height: 1.3;
  }
  .warn-sub { color: #7f1d1d; }

  /* ── Chart bottom row ────────────────────────────────────────────────── */
  .bottom-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
    min-height: 0;
  }
</style>

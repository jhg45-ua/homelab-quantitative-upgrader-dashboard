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

      const pmd   = await pmRes.json();
      const effd  = await effRes.json();
      const amatd = await amatRes.json();

      powerWatts = pmd.status === 'success' && pmd.data.result.length > 0
        ? parseFloat(pmd.data.result[0].value[1]).toFixed(1) : "0.0";

      efficiencyIpsW = effd.status === 'success' && effd.data.result.length > 0
        ? parseFloat(effd.data.result[0].value[1]).toFixed(1) : "0.0";

      if (amatd.status === 'success' && amatd.data.result.length > 0) {
        const v = parseFloat(amatd.data.result[0].value[1]);
        amatCycles = v.toFixed(2);
        amatHigh = v > 15.0;
      } else {
        amatCycles = "---"; amatHigh = false;
      }
    } catch (e) {
      console.error("Scalar fetch error", e);
    }
  }

  onMount(() => { fetchScalars(); interval = setInterval(fetchScalars, 5000); });
  onDestroy(() => { if (interval) clearInterval(interval); });
</script>

<svelte:head>
  <title>HQUD — Scientific Analysis</title>
</svelte:head>

<!--
  Dashboard layout strategy:
  - main: h-dvh flex-col → fills entire viewport, no page scroll
  - header: shrink-0 → takes only what it needs
  - HUD: shrink-0 → fixed-height metric row
  - heatmap: flex-[5] min-h-0 → gets most of the remaining space (proportional)
  - bottom row: flex-[3] min-h-0 → smaller slice, two charts side-by-side
  - footer: shrink-0 → tiny footer line
  ECharts handles reflow via window.resize listener inside each component.
-->
<main class="h-dvh flex flex-col overflow-hidden p-4 lg:p-5 gap-3" style="background: #080f1e;">

  <!-- Header (compact) -->
  <header class="shrink-0 text-center relative py-1">
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="w-64 h-10 rounded-full opacity-10 blur-3xl" style="background: radial-gradient(ellipse, #38bdf8, #818cf8);"></div>
    </div>
    <div class="relative flex items-center justify-between px-2">
      <div class="flex items-center gap-2">
        <span class="status-dot"></span>
        <span class="text-xs font-mono text-slate-500 uppercase tracking-widest hidden sm:block">Live Telemetry</span>
      </div>
      <h1 class="text-2xl lg:text-3xl font-extrabold tracking-tight title-gradient">
        HomeLab Quantitative Upgrader
      </h1>
      <div class="text-xs font-mono text-slate-600 hidden sm:block">Dell R720</div>
    </div>
  </header>

  <!-- HUD: 4 metric cards (shrink-0, auto height) -->
  <div class="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div class="metric-card">
      <div class="metric-label">Target Node</div>
      <div class="metric-value accent text-xl">r720-vm</div>
      <div class="mt-1 text-xs text-slate-600 font-mono hidden sm:block">Dell PowerEdge R720</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Consumo OOB</div>
      <div class="flex items-baseline gap-1">
        <span class="metric-value warn text-xl">{powerWatts}</span>
        <span class="metric-unit">W</span>
      </div>
      <div class="mt-1 text-xs text-slate-600 hidden sm:block">via iDRAC DCMI</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Eficiencia CPU</div>
      <div class="flex items-baseline gap-1">
        <span class="metric-value success text-xl">{efficiencyIpsW}</span>
        <span class="metric-unit">IPS/W</span>
      </div>
      <div class="mt-1 text-xs text-slate-600 hidden sm:block">PMU × IPMI</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">AMAT</div>
      <div class="flex items-baseline gap-1">
        <span class="metric-value text-xl {amatHigh ? 'danger' : 'success'}">{amatCycles}</span>
        <span class="metric-unit">ciclos</span>
      </div>
      <div class="mt-1 text-xs {amatHigh ? 'text-red-800' : 'text-slate-600'} hidden sm:block">
        {amatHigh ? '⚠ Memory pressure' : '✓ L1+4c+Miss×150c'}
      </div>
    </div>
  </div>

  <!-- Heatmap — proportionally larger slice of remaining space -->
  <div class="chart-panel min-h-0" style="flex: 5;">
    <HeatmapChart />
  </div>

  <!-- Bottom row: CPI + Memory/OS — smaller slice, side by side on lg+ -->
  <div class="min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3" style="flex: 3;">
    <div class="chart-panel min-h-0 h-full">
      <CPIChart />
    </div>
    <div class="chart-panel min-h-0 h-full">
      <MemoryOSChart />
    </div>
  </div>

  <!-- Footer (tiny) -->
  <footer class="shrink-0 text-center pb-1">
    <p class="text-xs text-slate-800 font-mono">HQUD · eBPF + PMU + IPMI → VictoriaMetrics</p>
  </footer>

</main>

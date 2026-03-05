<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import HeatmapChart from '$lib/HeatmapChart.svelte';
  import CPIChart from '$lib/CPIChart.svelte';
  import MemoryOSChart from '$lib/MemoryOSChart.svelte';

  let powerWatts = "---";
  let efficiencyIpsW = "---";
  let interval: ReturnType<typeof setInterval>;

  const VICTORIA_METRICS_INSTANT = '/api/vm/api/v1/query';

  async function fetchScalars() {
    try {
      const pmRes = await fetch(`${VICTORIA_METRICS_INSTANT}?query=hqud_power_watts{host="r720-vm"}`);
      const pmd = await pmRes.json();
      if (pmd.status === 'success' && pmd.data.result.length > 0) {
        const val = parseFloat(pmd.data.result[0].value[1]);
        powerWatts = val.toFixed(1);
      } else {
        powerWatts = "0.0"; // Offline
      }

      const effRes = await fetch(`${VICTORIA_METRICS_INSTANT}?query=hqud_efficiency_ips_per_watt{host="r720-vm"}`);
      const effd = await effRes.json();
      if (effd.status === 'success' && effd.data.result.length > 0) {
        const val = parseFloat(effd.data.result[0].value[1]);
        // Scaled visually to Millions of IPS / Watt for brevity if needed
        efficiencyIpsW = (val / 1_000_000).toFixed(2) + " M";
      } else {
        efficiencyIpsW = "0.0";
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

<svelte:head>
  <title>HQUD - Scientific Analysis</title>
</svelte:head>

<main class="min-h-screen bg-scientific-bg text-scientific-text font-sans p-8">
  <header class="mb-10 text-center">
    <h1 class="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-scientific-accent to-blue-500 pb-2">
      HomeLab Quantitative Upgrader
    </h1>
    <p class="text-scientific-muted mt-2 text-lg max-w-2xl mx-auto">
      Empirical hardware auditing platform based on Hennessy & Patterson principles.
      Currently visualizing real-time eBPF Block I/O latency distribution and CPU metrics.
    </p>
  </header>

  <section class="max-w-6xl mx-auto space-y-8">
    
    <!-- Info Panel -->
    <div class="bg-scientific-surface border border-scientific-border rounded-lg p-6 shadow-md grid gap-4 grid-cols-1 md:grid-cols-5">
      <div class="p-4 bg-slate-800/50 rounded-md border border-slate-700/50">
         <h3 class="text-xs uppercase tracking-wider text-scientific-muted font-bold mb-1">Target Node</h3>
         <div class="text-xl font-mono text-scientific-accent">r720-vm</div>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-md border border-slate-700/50 col-span-2">
         <h3 class="text-xs uppercase tracking-wider text-scientific-muted font-bold mb-1">Consumo Activo (W)</h3>
         <div class="text-xl font-medium text-red-400">{powerWatts} W</div>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-md border border-slate-700/50 col-span-2">
         <h3 class="text-xs uppercase tracking-wider text-scientific-muted font-bold mb-1">Eficiencia (IPS/W)</h3>
         <div class="text-xl font-medium text-emerald-400">{efficiencyIpsW} IPS/W</div>
      </div>
    </div>

    <!-- Scientific Visualizations -->
    <HeatmapChart />
    <CPIChart />
    <MemoryOSChart />

  </section>
</main>

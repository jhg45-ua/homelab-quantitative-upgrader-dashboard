<script lang="ts">
  import HeatmapChart from '$lib/HeatmapChart.svelte';
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
      Currently visualizing real-time eBPF Block I/O latency distribution.
    </p>
  </header>

  <section class="max-w-6xl mx-auto space-y-8">
    
    <!-- Info Panel -->
    <div class="bg-scientific-surface border border-scientific-border rounded-lg p-6 shadow-md grid gap-4 grid-cols-1 md:grid-cols-3">
      <div class="p-4 bg-slate-800/50 rounded-md border border-slate-700/50">
         <h3 class="text-xs uppercase tracking-wider text-scientific-muted font-bold mb-1">Target Node</h3>
         <div class="text-xl font-mono text-scientific-accent">r720-vm</div>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-md border border-slate-700/50">
         <h3 class="text-xs uppercase tracking-wider text-scientific-muted font-bold mb-1">Architecture Pillar</h3>
         <div class="text-xl font-medium text-white">Little's Law (Queuing)</div>
      </div>
      <div class="p-4 bg-slate-800/50 rounded-md border border-slate-700/50">
         <h3 class="text-xs uppercase tracking-wider text-scientific-muted font-bold mb-1">Data Source</h3>
         <div class="text-xl font-medium text-white">eBPF -> VictoriaMetrics</div>
      </div>
    </div>

    <!-- Scientific Visualizations -->
    <HeatmapChart />

  </section>
</main>

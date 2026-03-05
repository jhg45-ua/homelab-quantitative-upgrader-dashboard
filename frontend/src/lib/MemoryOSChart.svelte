<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts;
  let interval: ReturnType<typeof setInterval>;

  const VM_URL = '/api/vm/api/v1/query_range';
  const CACHE_MISS_QUERY  = `hqud_cpu_cache_miss_rate{host="r720-vm"}`;
  const CTX_SWITCH_QUERY  = `hqud_os_context_switches_ps{host="r720-vm"}`;

  onMount(async () => {
    chart = echarts.init(chartContainer);

    chart.setOption({
      title: {
        text: 'Memory Pressure & OS Overhead',
        subtext: 'Cache Miss Rate (%) — Context Switches / sec',
        textStyle: { color: '#f8fafc' },
        subtextStyle: { color: '#94a3b8' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Cache Miss Rate (%)', 'Context Switches / s'],
        textStyle: { color: '#94a3b8' },
        top: '10%'
      },
      animation: false,
      grid: { top: '22%', right: '8%', bottom: '12%', left: '8%' },
      xAxis: {
        type: 'category',
        data: [],
        axisLabel: { color: '#94a3b8', rotate: 0 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Miss Rate %',
          nameTextStyle: { color: '#f59e0b' },
          min: 0,
          max: 100,
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: { color: '#f59e0b', formatter: '{value}%' }
        },
        {
          type: 'value',
          name: 'CtxSw / s',
          nameTextStyle: { color: '#a78bfa' },
          splitLine: { show: false },
          axisLabel: { color: '#a78bfa' }
        }
      ],
      series: [
        {
          name: 'Cache Miss Rate (%)',
          type: 'line',
          yAxisIndex: 0,
          data: [],
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2 },
          areaStyle: { color: 'rgba(245, 158, 11, 0.08)' },
          markLine: {
            silent: true,
            symbol: 'none',
            label: { position: 'start', formatter: 'High Miss (50%)', color: '#ef4444' },
            lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
            data: [{ yAxis: 50 }]
          }
        },
        {
          name: 'Context Switches / s',
          type: 'bar',
          yAxisIndex: 1,
          data: [],
          barMaxWidth: 12,
          itemStyle: { color: 'rgba(167, 139, 250, 0.6)', borderRadius: [2, 2, 0, 0] }
        }
      ],
      backgroundColor: 'transparent'
    });

    await fetchData();
    interval = setInterval(fetchData, 5000);

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
    if (chart) chart.dispose();
  });

  async function fetchRange(query: string) {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 600;
    const res = await fetch(`${VM_URL}?query=${encodeURIComponent(query)}&start=${start}&end=${now}&step=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'success' || !json.data.result.length) return null;
    return json.data.result[0].values as [number, string][];
  }

  function toTimestamp(epoch: number): string {
    const d = new Date(epoch * 1000);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
  }

  async function fetchData() {
    try {
      const [cacheMissVals, ctxVals] = await Promise.all([
        fetchRange(CACHE_MISS_QUERY),
        fetchRange(CTX_SWITCH_QUERY)
      ]);

      if (!cacheMissVals && !ctxVals) return;

      const source = cacheMissVals ?? ctxVals!;
      const timestamps = source.map(v => toTimestamp(v[0]));
      const cacheData  = (cacheMissVals ?? []).map(v => parseFloat(v[1]));
      const ctxData    = (ctxVals ?? []).map(v => parseFloat(v[1]));

      chart.setOption({
        xAxis: { data: timestamps },
        series: [
          { name: 'Cache Miss Rate (%)', data: cacheData },
          { name: 'Context Switches / s', data: ctxData }
        ]
      });
    } catch (e) {
      console.error('MemoryOSChart fetch error:', e);
    }
  }
</script>

<div class="w-full h-[400px] border border-scientific-border rounded-lg bg-scientific-surface shadow-lg overflow-hidden relative">
  <div bind:this={chartContainer} class="w-full h-full p-4"></div>
</div>

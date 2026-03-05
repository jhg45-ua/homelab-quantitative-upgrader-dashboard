<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts;
  let interval: ReturnType<typeof setInterval>;

  const VM_URL = '/api/vm/api/v1/query_range';
  const CACHE_MISS_QUERY = `hqud_cpu_cache_miss_rate{host="r720-vm"}`;
  const CTX_SWITCH_QUERY = `hqud_os_context_switches_ps{host="r720-vm"}`;

  onMount(async () => {
    chart = echarts.init(chartContainer);

    chart.setOption({
      title: {
        text: 'Memory Pressure & OS Overhead',
        subtext: 'Amber: Cache Miss Rate (%) — Bars: Context Switches / sec',
        textStyle: { color: '#f8fafc', fontSize: 14 },
        subtextStyle: { color: '#94a3b8', fontSize: 11 },
        top: 8
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: function(params: any) {
          let html = `<b>${params[0].name}</b><br/>`;
          params.forEach((p: any) => {
            const unit = p.seriesIndex === 0 ? '%' : '/s';
            html += `${p.marker} ${p.seriesName}: <b>${parseFloat(p.value).toFixed(2)}${unit}</b><br/>`;
          });
          return html;
        }
      },
      animation: false,
      grid: { top: '28%', right: '10%', bottom: '10%', left: '10%' },
      xAxis: {
        type: 'category',
        data: [],
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Miss Rate',
          nameTextStyle: { color: '#f59e0b', fontSize: 10, padding: [0, 0, 0, 0] },
          min: 0,
          max: 100,
          interval: 25,
          splitLine: { lineStyle: { color: '#1e293b' } },
          axisLabel: { color: '#f59e0b', formatter: '{value}%', fontSize: 10 }
        },
        {
          type: 'value',
          name: 'CtxSw/s',
          nameTextStyle: { color: '#a78bfa', fontSize: 10 },
          splitLine: { show: false },
          axisLabel: { color: '#a78bfa', fontSize: 10 }
        }
      ],
      series: [
        {
          name: 'Cache Miss Rate',
          type: 'line',
          yAxisIndex: 0,
          data: [],
          smooth: 0.4,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2 },
          areaStyle: { color: 'rgba(245, 158, 11, 0.06)' },
          markLine: {
            silent: true,
            symbol: 'none',
            label: {
              position: 'insideEndTop',
              formatter: 'High Miss (50%)',
              color: '#ef4444',
              fontSize: 10
            },
            lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
            data: [{ yAxis: 50 }]
          }
        },
        {
          name: 'Context Switches/s',
          type: 'bar',
          yAxisIndex: 1,
          data: [],
          barMaxWidth: 8,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(167, 139, 250, 0.9)' },
              { offset: 1, color: 'rgba(167, 139, 250, 0.2)' }
            ]),
            borderRadius: [3, 3, 0, 0]
          }
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

  async function fetchRange(query: string): Promise<[number, string][] | null> {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 600;
    const res = await fetch(`${VM_URL}?query=${encodeURIComponent(query)}&start=${start}&end=${now}&step=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'success' || !json.data.result.length) return null;
    return json.data.result[0].values;
  }

  function toTs(epoch: number): string {
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
      // Skip first point — it often has a 0/0 artifact giving 100% or NaN
      const sliced = source.slice(1);
      const timestamps = sliced.map(v => toTs(v[0]));

      // Align other series to same timestamp range by slicing from index 1 too
      const cacheData = (cacheMissVals ?? []).slice(1).map(v => {
        const n = parseFloat(v[1]);
        return isNaN(n) || !isFinite(n) ? 0 : Math.min(n, 100);
      });
      const ctxData = (ctxVals ?? []).slice(1).map(v => {
        const n = parseFloat(v[1]);
        return isNaN(n) || !isFinite(n) ? 0 : n;
      });

      chart.setOption({
        xAxis: { data: timestamps },
        series: [
          { name: 'Cache Miss Rate', data: cacheData },
          { name: 'Context Switches/s', data: ctxData }
        ]
      });
    } catch (e) {
      console.error('MemoryOSChart fetch error:', e);
    }
  }
</script>

<div class="w-full h-full">
  <div bind:this={chartContainer} class="w-full h-full p-2"></div>
</div>

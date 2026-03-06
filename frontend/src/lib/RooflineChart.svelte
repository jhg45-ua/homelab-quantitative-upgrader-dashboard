<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { hwConfig } from '$lib/hwConfig';
  import * as echarts from 'echarts';

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts;
  let interval: ReturnType<typeof setInterval>;
  let ro: ResizeObserver;

  const VM = '/api/vm/api/v1/query';

  onMount(async () => {
    chart = echarts.init(chartContainer);
    ro = new ResizeObserver(() => { if (chart) chart.resize(); });
    ro.observe(chartContainer);

    buildChart();
    await fetchData();
    interval = setInterval(fetchData, 5000);
  });

  // Rebuild whenever config changes (store subscription via $: reactive)
  $: if (chart && $hwConfig) buildChart();

  function buildChart() {
    const PEAK_MIPS = $hwConfig.specs.peak_mips || 120000;
    const PEAK_BW_GBS = $hwConfig.specs.max_mem_bw_gbps || 59.7;

    // Ridge point: where memory ceiling meets compute ceiling
    const ridgeOI = PEAK_MIPS / (PEAK_BW_GBS * 1e9 / 64 / 1e6);

    // Memory bandwidth roof: MIPS = OI × BW (bytes/s) / 64 / 1e6
    const bwLineData: [number, number][] = [];
    for (let oi = 0.001; oi <= ridgeOI * 1.2; oi *= 1.15) {
      const mips = oi * (PEAK_BW_GBS * 1e9 / 64) / 1e6;
      bwLineData.push([oi, Math.min(mips, PEAK_MIPS)]);
    }

    // Compute ceiling: flat line from ridge OI onwards
    const computeLineData: [number, number][] = [];
    for (let oi = ridgeOI * 0.9; oi <= 1000; oi *= 1.3) {
      computeLineData.push([oi, PEAK_MIPS]);
    }

    chart.setOption({
      title: {
        text: 'Roofline Model',
        subtext: `${$hwConfig.hardware_desc || 'Unknown'} · H&P Ch.4`,
        textStyle: { color: '#f1f5f9', fontSize: 14, fontFamily: 'Space Grotesk' },
        subtextStyle: { color: '#64748b', fontSize: 11 },
        top: 8
      },
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          if (p.seriesName === 'Workload') {
            return `<b>Current Workload</b><br/>OI: ${p.value[0].toFixed(2)} ops/byte<br/>Perf: ${p.value[1].toFixed(0)} MIPS`;
          }
          return p.seriesName;
        }
      },
      legend: {
        data: ['Memory BW Roof', 'Compute Roof', 'Workload'],
        top: 10, right: 20,
        textStyle: { color: '#64748b', fontSize: 10 }
      },
      grid: { top: '22%', right: '8%', bottom: '14%', left: '12%' },
      xAxis: {
        type: 'log',
        name: 'Operational Intensity (Instr / Cache-Miss × 64B)',
        nameTextStyle: { color: '#64748b', fontSize: 10, padding: [10, 0, 0, 0] },
        nameLocation: 'middle',
        nameGap: 30,
        min: 0.01,
        max: 1000,
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'log',
        name: 'Performance (MIPS)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        min: 1,
        max: PEAK_MIPS * 2,
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      series: [
        {
          name: 'Memory BW Roof',
          type: 'line',
          data: bwLineData,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
          areaStyle: { color: 'rgba(245, 158, 11, 0.04)' },
          z: 1
        },
        {
          name: 'Compute Roof',
          type: 'line',
          data: computeLineData,
          smooth: false,
          symbol: 'none',
          lineStyle: { color: '#ef4444', width: 2, type: 'dashed' },
          z: 1
        },
        {
          name: 'Workload',
          type: 'scatter',
          data: [],
          symbolSize: 16,
          itemStyle: {
            color: '#38bdf8',
            borderColor: '#0ea5e9',
            borderWidth: 2,
            shadowColor: 'rgba(56, 189, 248, 0.5)',
            shadowBlur: 12
          },
          z: 10
        }
      ],
      backgroundColor: 'transparent'
    }, true); // true = notMerge, forces full rebuild
  }

  onDestroy(() => {
    if (ro) ro.disconnect();
    if (interval) clearInterval(interval);
    if (chart) chart.dispose();
  });

  async function fetchData() {
    const node = $hwConfig.node_name;
    try {
      const [instR, missR] = await Promise.all([
        fetch(`${VM}?query=hqud_cpu_cpi{host="${node}"}`).then(r => r.json()),
        fetch(`${VM}?query=hqud_cpu_cache_miss_rate{host="${node}"}`).then(r => r.json()),
      ]);

      const effR = await fetch(`${VM}?query=hqud_efficiency_ips_per_watt{host="${node}"}`).then(r => r.json());
      const powerR = await fetch(`${VM}?query=hqud_power_watts{host="${node}"}`).then(r => r.json());

      let cpi = 0, missRate = 0;
      if (instR.status === 'success' && instR.data.result.length > 0) {
        cpi = parseFloat(instR.data.result[0].value[1]);
      }
      if (missR.status === 'success' && missR.data.result.length > 0) {
        missRate = parseFloat(missR.data.result[0].value[1]);
      }

      let eff = 0, watts = 0;
      if (effR.status === 'success' && effR.data.result.length > 0) {
        eff = parseFloat(effR.data.result[0].value[1]);
      }
      if (powerR.status === 'success' && powerR.data.result.length > 0) {
        watts = parseFloat(powerR.data.result[0].value[1]);
      }
      const ips = eff * watts;

      if (ips <= 0 || missRate <= 0) return;

      const oi = 100.0 / missRate;
      const mips = ips / 1e6;

      chart.setOption({
        series: [
          { name: 'Memory BW Roof' },
          { name: 'Compute Roof' },
          { name: 'Workload', data: [[oi, mips]] }
        ]
      });
    } catch (e) {
      console.error('Roofline fetch error', e);
    }
  }
</script>

<div style="position:relative; width:100%; height:100%;">
  <div bind:this={chartContainer} style="position:absolute; inset:0;"></div>
</div>

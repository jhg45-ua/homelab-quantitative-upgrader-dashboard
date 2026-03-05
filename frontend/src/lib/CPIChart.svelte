<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts;
  let interval: ReturnType<typeof setInterval>;

  const VICTORIA_METRICS_URL = '/api/vm/api/v1/query_range';
  const PROMQL_QUERY = `hqud_cpu_cpi{host="r720-vm"}`;

  onMount(async () => {
    chart = echarts.init(chartContainer);
    
    const option = {
      title: {
        text: 'Cycles Per Instruction (CPI)',
        subtext: 'Hardware PMU Pipeline Efficiency',
        textStyle: { color: '#f8fafc' },
        subtextStyle: { color: '#94a3b8' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
             const val = params[0].value[1];
             return `${params[0].name}<br/>CPI: <b>${val.toFixed(3)}</b>`;
        }
      },
      animation: false,
      grid: {
        height: '60%',
        top: '20%',
        right: '5%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: [], 
        splitArea: { show: false },
        axisLabel: { color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'value',
        name: 'CPI Ratio',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      visualMap: {
        show: false,
        pieces: [
          { gt: 0, lte: 1.0, color: '#10b981' }, // Green (Optimal)
          { gt: 1.0, color: '#ef4444' }          // Red (Stall)
        ],
        outOfRange: { color: '#94a3b8' }
      },
      series: [{
        name: 'CPI',
        type: 'line',
        data: [],
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.1
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: {
            position: 'start',
            formatter: 'Stall Boundary (1.0)',
            color: '#ef4444'
          },
          lineStyle: {
            color: '#ef4444',
            type: 'dashed',
            width: 2
          },
          data: [{ yAxis: 1.0 }]
        }
      }],
      backgroundColor: 'transparent'
    };

    chart.setOption(option);

    await fetchData();
    interval = setInterval(fetchData, 5000);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
    if (chart) chart.dispose();
  });

  async function fetchData() {
    try {
      const now = Math.floor(Date.now() / 1000);
      const start = now - 600; // Last 10 minutes
      const step = 5;

      const response = await fetch(
        `${VICTORIA_METRICS_URL}?query=${encodeURIComponent(PROMQL_QUERY)}&start=${start}&end=${now}&step=${step}`
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const apiData = await response.json();

      if (apiData.status !== 'success' || !apiData.data.result || apiData.data.result.length === 0) return;
      
      const series = apiData.data.result[0];
      
      const timestamps: string[] = [];
      const dataPoints: [string, number][] = [];

      series.values.forEach((valArr: any) => {
        const date = new Date(valArr[0] * 1000);
        const ts = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        timestamps.push(ts);
        
        const cpiVal = parseFloat(valArr[1]);
        dataPoints.push([ts, cpiVal]);
      });

      chart.setOption({
        xAxis: { data: timestamps },
        series: [{ data: dataPoints }]
      });

    } catch (e) {
      console.error("Failed to fetch VictoriaMetrics CPI data:", e);
    }
  }
</script>

<div class="w-full h-full">
  <div bind:this={chartContainer} class="w-full h-full p-4"></div>
</div>

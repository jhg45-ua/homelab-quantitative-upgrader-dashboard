<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts;
  let interval: ReturnType<typeof setInterval>;

  const VICTORIA_METRICS_URL = '/api/vm/api/v1/query_range';
  
  // The rate at which the eBPF agent buckets fill over 1 minute
  const PROMQL_QUERY = `sum(rate(hqud_io_latency_usec_bucket{host="r720-vm"}[1m])) by (le)`;

  onMount(async () => {
    chart = echarts.init(chartContainer);
    
    const option = {
      title: {
        text: 'eBPF Block I/O Latency Heatmap',
        subtext: 'Quantitative Architecture Module D',
        textStyle: { color: '#f8fafc' },
        subtextStyle: { color: '#94a3b8' }
      },
      tooltip: {
        position: 'top',
        formatter: function (params: any) {
             return `${params.value[1]} us: ${params.value[2].toFixed(2)} IOPs`;
        }
      },
      animation: false,
      grid: {
        height: '60%',
        top: '15%',
        right: '5%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: [], // Will be filled with Timestamps
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'category',
        data: [], // Will be filled with 'le' buckets
        name: 'Latency (us)',
        nameTextStyle: { color: '#94a3b8' },
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8' }
      },
      visualMap: {
        min: 0,
        max: 10,
        calculable: true,
        orient: 'vertical',
        right: '0%',
        top: '15%',
        textStyle: { color: '#f8fafc' },
        inRange: {
          color: ['#0f172a', '#38bdf8', '#3b82f6', '#ef4444'] // Dark to Light Blue to Red
        }
      },
      series: [{
        name: 'I/O Rate',
        type: 'heatmap',
        data: [],
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }],
      backgroundColor: 'transparent'
    };

    chart.setOption(option);

    // Initial fetch
    await fetchData();

    // Setup polling every 5 seconds
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
      const step = 5; // 5 second resolution

      const response = await fetch(
        `${VICTORIA_METRICS_URL}?query=${encodeURIComponent(PROMQL_QUERY)}&start=${start}&end=${now}&step=${step}`
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const apiData = await response.json();

      if (apiData.status !== 'success' || !apiData.data.result) return;
      
      const results = apiData.data.result;
      
      if (results.length === 0) return;

      // Render with static buckets to prevent dancing axis
      const STATIC_BUCKETS = ['512', '1024', '2048', '4096', '8192', '16384', '32768', '+Inf'];

      // Extract unique timestamps for X-axis from the first series
      const timestamps = results[0].values.map((v: any) => {
        const date = new Date(v[0] * 1000);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
      });

      // Prepare heatmap data [xIndex, yIndex, value]
      const heatmapData: any[] = [];
      let maxVal = 0;

      results.forEach((series: any) => {
        const yIndex = STATIC_BUCKETS.indexOf(series.metric.le);
        if (yIndex === -1) return;

        series.values.forEach((valArr: any, xIndex: number) => {
          const value = parseFloat(valArr[1]);
          if (value > maxVal) maxVal = value;
          heatmapData.push([xIndex, yIndex, value]);
        });
      });

      chart.setOption({
        xAxis: { data: timestamps },
        yAxis: { data: STATIC_BUCKETS },
        visualMap: { 
          max: Math.max(10, Math.ceil(maxVal)),
          inRange: {
            color: ['#0f172a', '#3b82f6', '#10b981', '#fbbf24', '#ef4444'] // Thermal: Dark -> Blue -> Green -> Yellow -> Red
          }
        },
        series: [{ data: heatmapData }]
      });

    } catch (e) {
      console.error("Failed to fetch VictoriaMetrics data:", e);
    }
  }
</script>

<div class="w-full h-[600px] border border-scientific-border rounded-lg bg-scientific-surface shadow-lg overflow-hidden relative">
   <div bind:this={chartContainer} class="w-full h-full p-4"></div>
</div>

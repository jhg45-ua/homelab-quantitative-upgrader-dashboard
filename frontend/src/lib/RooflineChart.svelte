<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { hwConfig } from "$lib/hwConfig";
  import * as echarts from "echarts";

  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts;
  let interval: ReturnType<typeof setInterval>;
  let ro: ResizeObserver;

  const VM = "/api/v1/query";

  onMount(async () => {
    chart = echarts.init(chartContainer);
    ro = new ResizeObserver(() => {
      if (chart) chart.resize();
    });
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
    const ridgeOI = PEAK_MIPS / ((PEAK_BW_GBS * 1e9) / 64 / 1e6);

    // Memory bandwidth roof: MIPS = OI × BW (bytes/s) / 64 / 1e6
    const bwLineData: [number, number][] = [];
    for (let oi = 0.001; oi <= ridgeOI * 1.2; oi *= 1.15) {
      const mips = (oi * ((PEAK_BW_GBS * 1e9) / 64)) / 1e6;
      bwLineData.push([oi, Math.min(mips, PEAK_MIPS)]);
    }

    // Compute ceiling: flat line from ridge OI onwards
    const computeLineData: [number, number][] = [];
    for (let oi = ridgeOI * 0.9; oi <= 1000; oi *= 1.3) {
      computeLineData.push([oi, PEAK_MIPS]);
    }

    chart.setOption(
      {
        color: ['blue', 'red', 'lightblue'],
        title: {
          text: "Roofline Model",
          subtext: "Dell PowerEdge R720 (2x Intel Xeon E5-2670) · H&P Ch.4",
          textStyle: {
            color: "#f1f5f9",
            fontSize: 16,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 700
          },
          subtextStyle: { color: "#94a3b8", fontSize: 11, fontFamily: "Inter, system-ui, sans-serif" },
          top: 12,
          left: 16,
        },
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderColor: "#334155",
          textStyle: { color: "#f8fafc", fontFamily: "Inter, sans-serif", fontSize: 11 },
          formatter: (p) => {
            if (p.seriesName === "Workload") {
              return `<b>Current Workload</b><br/>OI: ${p.value[0].toFixed(2)} ops/byte<br/>Perf: ${p.value[1].toLocaleString(undefined, {maximumFractionDigits:0})} MIPS`;
            }
            return p.seriesName;
          },
        },
        legend: {
          data: ["Memory BW Roof", "Compute Roof", "Workload"],
          top: 14,
          right: 24,
          textStyle: { color: "#94a3b8", fontSize: 11, fontFamily: "Inter, sans-serif", fontWeight: 500 },
        },
        grid: { top: "22%", right: "6%", bottom: "14%", left: "12%" },
        xAxis: {
          type: "log",
          name: "Operational Intensity (Instr / Cache-Miss × 64B)",
          nameTextStyle: {
            color: "#94a3b8",
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            padding: [10, 0, 0, 0],
          },
          nameLocation: "middle",
          nameGap: 30,
          min: 0.01,
          max: 1000,
          axisLabel: { color: "#64748b", fontSize: 10, fontFamily: "Inter, sans-serif" },
          splitLine: { show: true, lineStyle: { color: "#1e293b" } },
          minorSplitLine: { show: true, lineStyle: { color: "rgba(30, 41, 59, 0.4)" } },
          axisLine: { lineStyle: { color: "#334155" } },
        },
        yAxis: {
          type: "log",
          name: "Performance (MIPS)",
          nameTextStyle: { color: "#94a3b8", fontSize: 11, fontFamily: "Inter, sans-serif" },
          min: 1,
          max: PEAK_MIPS * 2,
          axisLabel: { color: "#64748b", fontSize: 10, fontFamily: "Inter, sans-serif" },
          splitLine: { show: true, lineStyle: { color: "#1e293b" } },
          minorSplitLine: { show: true, lineStyle: { color: "rgba(30, 41, 59, 0.4)" } },
          axisLine: { lineStyle: { color: "#334155" } },
        },
        series: [
          {
            name: "Memory BW Roof",
            type: "line",
            data: bwLineData,
            smooth: false,
            symbol: "none",
            lineStyle: { color: "blue", width: 3, type: "dashed" },
            areaStyle: { color: "rgba(0, 0, 255, 0.06)" },
            z: 1,
            markPoint: {
              symbol: "none",
              label: { show: true, formatter: "{b}" },
              data: [
                {
                  coord: [ridgeOI * 0.015, PEAK_MIPS * 0.02],
                  name: "Memory-Bound",
                  label: { color: "rgba(0, 0, 255, 0.12)", fontSize: 26, fontWeight: "bold", fontFamily: "Inter, sans-serif" }
                },
                {
                  coord: [ridgeOI * 0.05, ((ridgeOI * 0.05 * ((PEAK_BW_GBS * 1e9) / 64)) / 1e6) * 1.5],
                  name: `Peak Mem BW: ${PEAK_BW_GBS.toFixed(1)} GB/s`,
                  label: { color: "#94a3b8", fontSize: 11, fontFamily: "Inter, sans-serif", rotate: 36 }
                }
              ]
            }
          },
          {
            name: "Compute Roof",
            type: "line",
            data: computeLineData,
            smooth: false,
            symbol: "none",
            lineStyle: { color: "red", width: 3, type: "dashed" },
            z: 1,
            markPoint: {
              symbol: "none",
              label: { show: true, formatter: "{b}" },
              data: [
                {
                  coord: [ridgeOI * 4, PEAK_MIPS * 0.02],
                  name: "Compute-Bound",
                  label: { color: "rgba(255, 0, 0, 0.08)", fontSize: 26, fontWeight: "bold", fontFamily: "Inter, sans-serif" }
                },
                {
                  coord: [ridgeOI * 4, PEAK_MIPS * 0.75],
                  name: `Peak Compute: ${PEAK_MIPS.toLocaleString()} MIPS`,
                  label: { color: "#94a3b8", fontSize: 11, fontFamily: "Inter, sans-serif" }
                }
              ]
            },
            markLine: {
              symbol: ["none", "none"],
              lineStyle: { color: "#475569", width: 1, type: "dotted" },
              label: { show: true, position: "start", formatter: "Ridge OI ≈ 100", color: "#64748b", fontSize: 10, fontFamily: "Inter, sans-serif" },
              data: [ { xAxis: ridgeOI } ]
            }
          },
          {
            name: "Workload",
            type: "scatter",
            data: [],
            symbolSize: 18,
            itemStyle: {
              color: "#7dd3fc",
              borderColor: "#38bdf8",
              borderWidth: 2,
              shadowColor: "rgba(56, 189, 248, 0.6)",
              shadowBlur: 14,
            },
            z: 10,
          },
        ],
        backgroundColor: {
          type: 'radial',
          x: 0.5, y: 0.5, r: 0.7,
          colorStops: [
            { offset: 0, color: 'rgba(15, 23, 42, 0.4)' },
            { offset: 1, color: 'transparent' }
          ]
        },
      },
      true
    ); // true = notMerge, forces full rebuild
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
        fetch(`${VM}?query=hqud_cpu_cpi{host="${node}"}`).then((r) => r.json()),
        fetch(`${VM}?query=hqud_cpu_cache_miss_rate{host="${node}"}`).then(
          (r) => r.json(),
        ),
      ]);

      const ipsR = await fetch(
        `${VM}?query=hqud_cpu_ips{host="${node}"}`,
      ).then((r) => r.json());

      let cpi = 0,
        missRate = 0;
      if (instR.status === "success" && instR.data.result.length > 0) {
        cpi = parseFloat(instR.data.result[0].value[1]);
      }
      if (missR.status === "success" && missR.data.result.length > 0) {
        missRate = parseFloat(missR.data.result[0].value[1]);
      }

      let ips = 0;
      if (ipsR.status === "success" && ipsR.data.result.length > 0) {
        ips = parseFloat(ipsR.data.result[0].value[1]);
      }

      let safeOI = 1000.0;
      if (missRate > 0) {
        safeOI = Math.max(0.01, 100.0 / missRate);
      }
      const safeMIPS = Math.max(1, ips / 1e6);

      chart.setOption({
        series: [
          { name: "Workload", data: [[safeOI, safeMIPS]] },
        ],
      });
    } catch (e) {
      console.error("Roofline fetch error", e);
    }
  }
</script>

<div style="position:relative; width:100%; height:100%;">
  <div bind:this={chartContainer} style="position:absolute; inset:0;"></div>
</div>

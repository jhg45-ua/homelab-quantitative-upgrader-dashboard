import ReactECharts from 'echarts-for-react';
import { useState, useEffect } from 'preact/hooks';
import { formatMetric } from '../utils/formatters';

const HOST = 'r720-baremetal';
const LATENCY_BUCKETS = ['0.1ms', '0.5ms', '1ms', '2ms', '5ms', '10ms', '25ms', '50ms', '100ms', '+Inf'];

export function Heatmap() {
  const [devices, setDevices] = useState<string[]>(['sda']);
  const [data, setData] = useState<[number, number, number][]>([]);

  useEffect(() => {
    const fetchLatency = async () => {
      try {
        const res = await fetch(
          `/api/v1/query?query=${encodeURIComponent(`hqud_io_latency_usec_bucket{host="${HOST}"}`)}`
        );
        const json = await res.json();
        const results: any[] = json?.data?.result ?? [];

        if (results.length === 0) {
          // No data yet — render an empty placeholder row
          setDevices(['(no io data)']);
          setData(LATENCY_BUCKETS.map((_, i) => [i, 0, 0]));
          return;
        }

        // Extract unique device names from PromQL labels
        const uniqueDevices = Array.from(new Set(
          results.map((s: any) => s.metric?.device ?? s.metric?.modulo ?? 'unknown')
        ));
        setDevices(uniqueDevices);

        // Build heatmap data: [bucketIndex, deviceIndex, value]
        // The `le` label maps to the bucket index
        const bucketMap: Record<string, number> = {};
        LATENCY_BUCKETS.forEach((b, i) => { bucketMap[b] = i; });
        // Also map numeric us values to bucket indices
        const leToIdx: Record<string, number> = {
          '0': 0, '1': 1, '2': 2, '4': 3, '8': 4,
          '16': 5, '32': 6, '64': 7, '128': 8, '+Inf': 9,
        };

        const heatData: [number, number, number][] = [];
        results.forEach((series: any) => {
          const dev = series.metric?.device ?? series.metric?.modulo ?? 'unknown';
          const devIdx = uniqueDevices.indexOf(dev);
          const le = String(series.metric?.le ?? '+Inf');
          const bucketIdx = leToIdx[le] ?? bucketMap[le] ?? 9;
          const val = parseFloat(series.value?.[1] ?? '0');
          heatData.push([bucketIdx, devIdx, isNaN(val) ? 0 : val]);
        });

        setData(heatData);
      } catch (e) {
        console.warn('[Heatmap] fetch failed', e);
      }
    };

    fetchLatency();
    const iv = setInterval(fetchLatency, 10000);
    return () => clearInterval(iv);
  }, []);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      backgroundColor: '#0F172A',
      borderColor: '#334155',
      textStyle: { fontFamily: 'Space Grotesk, monospace', fontSize: 11, color: '#F8FAFC' },
      formatter: (params: any) =>
        `<div class="font-mono text-[10px] uppercase text-slate-500 mb-1">${LATENCY_BUCKETS[params.value[0]]} — ${devices[params.value[1]]}</div>` +
        `<div class="flex justify-between gap-4"><span>Count:</span><span class="text-teal-400">${formatMetric(params.value[2])}</span></div>`,
    },
    grid: { top: 10, right: 35, bottom: 25, left: 70 },
    xAxis: {
      type: 'category', data: LATENCY_BUCKETS,
      axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: '#94A3B8' },
      splitArea: { show: true, areaStyle: { color: ['rgba(15,23,42,0.6)', 'rgba(30,41,59,0)'] } }
    },
    yAxis: {
      type: 'category', data: devices,
      axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: '#94A3B8' }
    },
    visualMap: {
      min: 0, max: 500, calculable: false, orient: 'horizontal', show: false,
      inRange: { color: ['#1e3a8a', '#0ea5e9', '#0D9488', '#eab308', '#DC2626'] }
    },
    series: [{
      name: 'Block IO',
      type: 'heatmap',
      data: data,
      itemStyle: { borderColor: '#1E293B', borderWidth: 2 },
      label: {
        show: true, fontFamily: 'Space Grotesk, monospace', fontSize: 9, fontWeight: 'bold',
        align: 'center', color: '#F8FAFC',
        formatter: (params: any) => params.value[2] > 0 ? formatMetric(params.value[2]) : ''
      }
    }]
  };

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col w-full h-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">eBPF Block I/O Latency</h3>
        <span className="text-[8px] md:text-[9px] font-mono text-teal-400 border border-teal-500/50 px-1 rounded-sm bg-teal-500/10">KERNEL PROBE</span>
      </div>
      <div className="p-0 h-full flex-1 w-full bg-[#0F172A]/50">
        <ReactECharts option={option} opts={{ renderer: 'svg' }} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

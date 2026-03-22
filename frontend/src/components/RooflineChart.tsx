import ReactECharts from 'echarts-for-react';
import { formatMetric } from '../utils/formatters';

interface Props {
  ips: number;
  cacheMiss: number;
  peakMips?: number;
  memBwGbps?: number;
}

export function RooflineChart({ ips, cacheMiss, peakMips = 166400, memBwGbps = 102.4 }: Props) {
  const PEAK_MIPS = peakMips;
  const PEAK_BW_GBS = memBwGbps;
  const ridgeOI = PEAK_MIPS / ((PEAK_BW_GBS * 1e9) / 64 / 1e6);

  let safeOI = ridgeOI;
  if (cacheMiss > 0) {
    safeOI = Math.max(0.01, 100.0 / cacheMiss);
  }
  const safeMIPS = Math.max(1, ips / 1e6);

  const bwLineData: [number, number][] = [];
  for (let oi = 0.01; oi <= ridgeOI * 1.1; oi *= 1.12) {
    const perf = (oi * ((PEAK_BW_GBS * 1e9) / 64)) / 1e6;
    bwLineData.push([oi, Math.min(perf, PEAK_MIPS)]);
  }
  bwLineData.push([ridgeOI, PEAK_MIPS]);

  const computeLineData: [number, number][] = [];
  computeLineData.push([ridgeOI, PEAK_MIPS]);
  for (let oi = ridgeOI * 1.3; oi <= 10000; oi *= 1.5) {
    computeLineData.push([oi, PEAK_MIPS]);
  }
  computeLineData.push([10000, PEAK_MIPS]);

  const yMax = Math.pow(10, Math.ceil(Math.log10(PEAK_MIPS * 1.5)));

  const option = {
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'item', 
      backgroundColor: '#0F172A', 
      borderColor: '#334155', 
      textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 },
      formatter: (params: any) => {
        if (params.seriesName === 'Live Workload') {
          const [oi, mips] = params.data as [number, number];
          return `<div class="font-mono text-[10px] uppercase text-slate-500 mb-1">Live Workload</div>
                  <div class="flex justify-between gap-4"><span>OI:</span><span class="text-blue-400">${formatMetric(oi)}</span></div>
                  <div class="flex justify-between gap-4"><span>MIPS:</span><span class="text-blue-400">${formatMetric(mips)}</span></div>`;
        }
        return params.seriesName;
      }
    },
    grid: { top: 30, right: 35, bottom: 40, left: 60 },
    xAxis: {
      type: 'log', name: 'OPERATIONAL INTENSITY (Ops/Byte)', nameLocation: 'middle', nameGap: 25, min: 0.01, max: 10000,
      axisLabel: { color: '#94A3B8', fontFamily: 'Space Grotesk, monospace', fontSize: 10 }, splitLine: { lineStyle: { color: '#1E293B' } }, axisLine: { lineStyle: { color: '#475569' } },
      nameTextStyle: { color: '#64748B', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }
    },
    yAxis: {
      type: 'log', name: 'MIPS', min: 1, max: yMax,
      axisLabel: { color: '#94A3B8', fontFamily: 'Space Grotesk, monospace', fontSize: 10 }, splitLine: { lineStyle: { color: '#1E293B' } }, axisLine: { lineStyle: { color: '#475569' } },
      nameTextStyle: { color: '#64748B', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }
    },
    series: [
      { name: 'Memory BW Roof', type: 'line', data: bwLineData, symbol: 'none', lineStyle: { color: '#0D9488', width: 3, type: 'solid' }, z: 10 },
      { name: 'Compute Roof', type: 'line', data: computeLineData, symbol: 'none', lineStyle: { color: '#DC2626', width: 3, type: 'solid' }, z: 10 },
      {
        name: 'Live Workload', type: 'scatter', data: [[safeOI, safeMIPS]], symbolSize: 16, z: 20,
        itemStyle: { color: '#3B82F6', borderColor: '#BFDBFE', borderWidth: 3 },
        label: { show: true, position: 'top', formatter: 'WORKLOAD', fontFamily: 'Inter', fontSize: 9, color: '#93C5FD', fontWeight: 600 }
      }
    ]
  };

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">Architecture Roofline</h3>
        <div className="flex gap-3 items-center">
          <span className="flex items-center gap-1 text-[8px] font-mono"><span className="w-3 h-0.5 bg-[#0D9488] inline-block"></span><span className="text-slate-500">MEM BW</span></span>
          <span className="flex items-center gap-1 text-[8px] font-mono"><span className="w-3 h-0.5 bg-[#DC2626] inline-block"></span><span className="text-slate-500">COMPUTE</span></span>
          <span className="text-[8px] md:text-[9px] font-mono text-[#DC2626] border border-[#DC2626]/50 px-1 rounded-sm bg-red-500/10">BOUNDARY</span>
        </div>
      </div>
      <div className="p-0 h-full flex-1 w-full bg-[#0F172A]/50">
        <ReactECharts option={option} opts={{ renderer: 'svg' }} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

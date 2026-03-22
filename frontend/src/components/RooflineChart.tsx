import ReactECharts from 'echarts-for-react';

interface Props {
  ips: number;
  cacheMiss: number;
}

const PEAK_MIPS = 120000;
const PEAK_BW_GBS = 59.7;
const ridgeOI = PEAK_MIPS / ((PEAK_BW_GBS * 1e9) / 64 / 1e6);

export function RooflineChart({ ips, cacheMiss }: Props) {
  let safeOI = 10000.0;
  if (cacheMiss > 0) {
    safeOI = Math.max(0.01, 100.0 / cacheMiss);
  }
  const safeMIPS = Math.max(1, ips / 1e6);

  const bwLineData: [number, number][] = [];
  for (let oi = 0.01; oi <= ridgeOI * 1.2; oi *= 1.15) {
    bwLineData.push([oi, Math.min((oi * ((PEAK_BW_GBS * 1e9) / 64)) / 1e6, PEAK_MIPS)]);
  }

  const computeLineData: [number, number][] = [];
  for (let oi = ridgeOI * 0.9; oi <= 10000; oi *= 1.3) {
    computeLineData.push([oi, PEAK_MIPS]);
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: '#0F172A', borderColor: '#334155', textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 } },
    grid: { top: 30, right: 35, bottom: 40, left: 60 },
    xAxis: {
      type: 'log', name: 'OPERATIONAL INTENSITY', nameLocation: 'middle', nameGap: 25, min: 0.01, max: 10000,
      axisLabel: { color: '#94A3B8', fontFamily: 'Space Grotesk, monospace', fontSize: 10 }, splitLine: { lineStyle: { color: '#334155' } }, axisLine: { lineStyle: { color: '#475569' } },
      nameTextStyle: { color: '#64748B', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }
    },
    yAxis: {
      type: 'log', name: 'MIPS', min: 1, max: 100000,
      axisLabel: { color: '#94A3B8', fontFamily: 'Space Grotesk, monospace', fontSize: 10 }, splitLine: { lineStyle: { color: '#334155' } }, axisLine: { lineStyle: { color: '#475569' } },
      nameTextStyle: { color: '#64748B', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }
    },
    series: [
      { name: 'Memory BW Roof', type: 'line', data: bwLineData, symbol: 'none', lineStyle: { color: '#0D9488', width: 3, type: 'solid' } },
      { name: 'Compute Roof', type: 'line', data: computeLineData, symbol: 'none', lineStyle: { color: '#DC2626', width: 3, type: 'solid' } },
      { name: 'Live Workload', type: 'scatter', data: [[safeOI, safeMIPS]], symbolSize: 18, itemStyle: { color: '#0055ff', shadowBlur: 20, shadowColor: '#0ea5e9', borderColor: '#62fae3', borderWidth: 2 } }
    ]
  };

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">Architecture Roofline</h3>
        <span className="text-[8px] md:text-[9px] font-mono text-[#DC2626] border border-[#DC2626]/50 px-1 rounded-sm bg-red-500/10">COMPUTE BOUNDARY</span>
      </div>
      <div className="p-0 h-full flex-1 w-full bg-[#0F172A]/50">
        <ReactECharts option={option} opts={{ renderer: 'svg' }} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

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
  for (let oi = 0.001; oi <= ridgeOI * 1.2; oi *= 1.15) {
    bwLineData.push([oi, Math.min((oi * ((PEAK_BW_GBS * 1e9) / 64)) / 1e6, PEAK_MIPS)]);
  }

  const computeLineData: [number, number][] = [];
  for (let oi = ridgeOI * 0.9; oi <= 10000; oi *= 1.3) {
    computeLineData.push([oi, PEAK_MIPS]);
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: '#0F172A', borderColor: '#334155', textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 } },
    grid: { top: 40, right: 30, bottom: 40, left: 60 },
    xAxis: {
      type: 'log', name: 'OPERATIONAL INTENSITY (INSTR/BYTE)', nameLocation: 'middle', nameGap: 24, min: 0.01, max: 10000,
      axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0' } }, axisLine: { lineStyle: { color: '#CBD5E1' } },
      nameTextStyle: { color: '#475569', fontFamily: 'Inter', fontSize: 10, fontWeight: 600, padding: [10, 0, 0, 0] }
    },
    yAxis: {
      type: 'log', name: 'PERFORMANCE (MIPS)', min: 1, max: PEAK_MIPS * 2,
      axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 10 }, splitLine: { lineStyle: { color: '#E2E8F0' } }, axisLine: { lineStyle: { color: '#CBD5E1' } },
      nameTextStyle: { color: '#475569', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }
    },
    series: [
      { name: 'Memory BW Roof', type: 'line', data: bwLineData, symbol: 'none', lineStyle: { color: '#0D9488', width: 3, type: 'dashed' } },
      { name: 'Compute Roof', type: 'line', data: computeLineData, symbol: 'none', lineStyle: { color: '#DC2626', width: 3, type: 'dashed' } },
      { name: 'Live Workload', type: 'scatter', data: [[safeOI, safeMIPS]], symbolSize: 12, itemStyle: { color: '#0F172A', borderColor: '#475569', borderWidth: 2 } }
    ]
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col h-full w-full">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase">Compute Architecture Roofline</h3>
        <span className="text-[8px] md:text-[10px] font-mono text-[#DC2626] border border-[#DC2626] px-1 rounded-sm bg-red-50">COMPUTE BOUNDARY</span>
      </div>
      <div className="p-2 md:p-4 h-48 md:h-64 flex-1">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

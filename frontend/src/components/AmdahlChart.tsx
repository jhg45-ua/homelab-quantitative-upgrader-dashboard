import ReactECharts from 'echarts-for-react';
import type { HistoryFrame } from '../types';
import { formatMetric } from '../utils/formatters';

interface Props {
  history: HistoryFrame[];
}

export function AmdahlChart({ history }: Props) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', backgroundColor: '#0F172A', borderColor: '#334155',
      textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 },
      formatter: (params: any[]) =>
        `<div class="font-mono text-[10px] text-slate-500 uppercase mb-1">${params[0].axisValue}</div>` +
        params.map(p => `<div class="flex justify-between gap-4"><span>${p.seriesName}:</span><span class="text-teal-400">${formatMetric(p.value)}%</span></div>`).join(''),
    },
    grid: { top: 20, right: 15, bottom: 25, left: 40 },
    xAxis: { type: 'category', data: history.map(h => h.time), axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 9 } },
    yAxis: { type: 'value', name: '%', min: 0, max: 100, splitLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94A3B8', fontFamily: 'Space Grotesk, monospace', fontSize: 9 }, nameTextStyle: { color: '#94A3B8', fontSize: 9 } },
    series: [{
      name: 'Mutex Contention %',
      type: 'line',
      data: history.map(h => h.mutexContention),
      smooth: true,
      lineStyle: { color: '#0D9488', width: 2 },
      itemStyle: { color: '#0D9488' },
      areaStyle: { color: 'rgba(13, 148, 136, 0.25)' },
    }],
  };

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">Amdahl Lock Contention</h3>
        <span className="text-[8px] md:text-[9px] font-mono text-teal-400 border border-teal-500/50 px-1 rounded-sm bg-teal-500/10">MUTEX WAIT</span>
      </div>
      <div className="p-0 flex-1 w-full h-full bg-[#0F172A]/50">
        <ReactECharts option={option} opts={{ renderer: 'svg' }} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

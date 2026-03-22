import ReactECharts from 'echarts-for-react';
import type { HistoryFrame } from '../types';

interface Props {
  history: HistoryFrame[];
}

export function TimelineChart({ history }: Props) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#0F172A', borderColor: '#334155', textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 } },
    grid: { top: 30, right: 15, bottom: 25, left: 35 },
    xAxis: { type: 'category', data: history.map(h => h.time), axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 9 } },
    yAxis: { type: 'value', min: 0, splitLine: { lineStyle: { color: '#334155' } }, name: 'CYCLES', nameTextStyle: { color: '#94A3B8', fontSize: 9 }, axisLabel: { color: '#94A3B8', fontFamily: 'Space Grotesk, monospace', fontSize: 9 } },
    series: [{
      name: 'CPI',
      type: 'line',
      data: history.map(h => h.cpi),
      smooth: true,
      lineStyle: { color: '#DC2626', width: 2 },
      itemStyle: { color: '#DC2626' },
      areaStyle: { color: 'rgba(220, 38, 38, 0.15)' }
    }]
  };

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[9px] md:text-[10px] font-semibold tracking-widest text-slate-400 uppercase">CPI Timeline</h3>
      </div>
      <div className="p-0 h-full flex-1 w-full bg-[#0F172A]/50">
        <ReactECharts option={option} opts={{ renderer: 'svg' }} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

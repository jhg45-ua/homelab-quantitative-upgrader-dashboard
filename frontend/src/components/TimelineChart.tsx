import ReactECharts from 'echarts-for-react';
import type { HistoryFrame } from '../types';

interface Props {
  history: HistoryFrame[];
}

export function TimelineChart({ history }: Props) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#0F172A', borderColor: '#334155', textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 } },
    grid: { top: 30, right: 20, bottom: 30, left: 40 },
    xAxis: { type: 'category', data: history.map(h => h.time), axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 9 } },
    yAxis: { type: 'value', min: 0, name: 'CYCLES', nameTextStyle: { color: '#475569', fontSize: 9 }, axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 9 } },
    series: [{
      name: 'CPI',
      type: 'line',
      data: history.map(h => h.cpi),
      smooth: true,
      lineStyle: { color: '#DC2626', width: 2 },
      itemStyle: { color: '#DC2626' },
      areaStyle: { color: 'rgba(220, 38, 38, 0.1)' }
    }]
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col h-full w-full">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase">CPI Timeline</h3>
      </div>
      <div className="p-2 md:p-4 h-48 md:h-64 flex-1">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

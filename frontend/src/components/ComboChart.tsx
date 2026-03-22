import ReactECharts from 'echarts-for-react';
import type { HistoryFrame } from '../types';

interface Props {
  history: HistoryFrame[];
}

export function ComboChart({ history }: Props) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#0F172A', borderColor: '#334155', textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 } },
    grid: { top: 30, right: 40, bottom: 30, left: 40 },
    xAxis: { type: 'category', data: history.map(h => h.time), axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 9 } },
    yAxis: [
      { type: 'value', name: 'CS/s', nameTextStyle: { color: '#475569', fontSize: 9 }, axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 9 } },
      { type: 'value', name: 'MISS %', alignTicks: true, position: 'right', nameTextStyle: { color: '#475569', fontSize: 9 }, axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 9 } }
    ],
    series: [
      {
        name: 'Context Switches',
        type: 'bar',
        data: history.map(h => h.ctxSwitches),
        yAxisIndex: 0,
        itemStyle: { color: '#475569' }
      },
      {
        name: 'Cache Miss %',
        type: 'line',
        data: history.map(h => h.cacheMiss),
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { color: '#0D9488', width: 2 },
        itemStyle: { color: '#0D9488' }
      }
    ]
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col h-full w-full">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase">Pressure & OS Overhead</h3>
      </div>
      <div className="p-2 md:p-4 h-48 md:h-64 flex-1">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

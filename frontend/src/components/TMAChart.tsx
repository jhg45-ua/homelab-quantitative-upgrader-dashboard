import ReactECharts from 'echarts-for-react';
import type { MetricsState } from '../types';

interface Props {
  metrics: MetricsState;
}

export function TMAChart({ metrics }: Props) {
  const total = metrics.tmaRetiring + metrics.tmaBadSpec + metrics.tmaFrontEnd + metrics.tmaBackEnd;
  const norm = (v: number) => total > 0 ? (v / total) * 100 : 25;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#0F172A', borderColor: '#334155',
      textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 },
    },
    grid: { top: 20, right: 15, bottom: 20, left: 15 },
    xAxis: { type: 'value', max: 100, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: ['Pipeline Slots'], axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      { name: 'Retiring', type: 'bar', stack: 'tma', data: [norm(metrics.tmaRetiring)], itemStyle: { color: '#22c55e' }, barWidth: 40, label: { show: true, position: 'inside', formatter: '{c}%', fontFamily: 'Space Grotesk, monospace', fontSize: 11, color: '#fff' } },
      { name: 'Bad Speculation', type: 'bar', stack: 'tma', data: [norm(metrics.tmaBadSpec)], itemStyle: { color: '#f97316' }, label: { show: norm(metrics.tmaBadSpec) > 8, position: 'inside', formatter: '{c}%', fontFamily: 'Space Grotesk, monospace', fontSize: 11, color: '#fff' } },
      { name: 'Front-End Bound', type: 'bar', stack: 'tma', data: [norm(metrics.tmaFrontEnd)], itemStyle: { color: '#3b82f6' }, label: { show: norm(metrics.tmaFrontEnd) > 8, position: 'inside', formatter: '{c}%', fontFamily: 'Space Grotesk, monospace', fontSize: 11, color: '#fff' } },
      { name: 'Back-End Bound', type: 'bar', stack: 'tma', data: [norm(metrics.tmaBackEnd)], itemStyle: { color: '#ef4444' }, label: { show: true, position: 'inside', formatter: '{c}%', fontFamily: 'Space Grotesk, monospace', fontSize: 11, color: '#fff' } },
    ],
  };

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">TMA Pipeline Breakdown</h3>
      </div>
      <div className="flex items-center gap-3 px-3 pt-2">
        <span className="flex items-center gap-1 text-[9px] font-mono text-green-400"><span className="w-2 h-2 bg-green-500 inline-block"></span>Retiring</span>
        <span className="flex items-center gap-1 text-[9px] font-mono text-orange-400"><span className="w-2 h-2 bg-orange-500 inline-block"></span>Speculation</span>
        <span className="flex items-center gap-1 text-[9px] font-mono text-blue-400"><span className="w-2 h-2 bg-blue-500 inline-block"></span>Front-End</span>
        <span className="flex items-center gap-1 text-[9px] font-mono text-red-400"><span className="w-2 h-2 bg-red-500 inline-block"></span>Back-End</span>
      </div>
      <div className="p-0 flex-1 w-full h-full bg-[#0F172A]/50">
        <ReactECharts option={option} opts={{ renderer: 'svg' }} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

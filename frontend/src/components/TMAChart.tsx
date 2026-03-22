import ReactECharts from 'echarts-for-react';
import type { MetricsState } from '../types';

interface Props {
  metrics: MetricsState;
}

export function TMAChart({ metrics }: Props) {
  const total = metrics.tmaRetiring + metrics.tmaBadSpec + metrics.tmaFrontEnd + metrics.tmaBackEnd;
  // Normalize to percentages and round strictly — avoids 28.999999999999996%
  const norm = (v: number) => total > 0 ? Math.round((v / total) * 100) : 25;

  const rPct = norm(metrics.tmaRetiring);
  const bsPct = norm(metrics.tmaBadSpec);
  const fePct = norm(metrics.tmaFrontEnd);
  const bePct = norm(metrics.tmaBackEnd);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#0F172A', borderColor: '#334155',
      textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 },
      formatter: (params: any[]) =>
        params.map(p => `<div class="flex justify-between gap-4"><span>${p.seriesName}:</span><span class="text-white">${Math.round(p.value)}%</span></div>`).join(''),
    },
    grid: { top: 20, right: 15, bottom: 20, left: 15 },
    xAxis: { type: 'value', max: 100, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: ['Pipeline Slots'], axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        name: 'Retiring', type: 'bar', stack: 'tma', data: [rPct],
        itemStyle: { color: '#22c55e' }, barWidth: 56,
        label: { show: true, position: 'inside', formatter: `${rPct}%`, fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 'bold', color: '#fff' }
      },
      {
        name: 'Bad Speculation', type: 'bar', stack: 'tma', data: [bsPct],
        itemStyle: { color: '#f97316' },
        label: { show: bsPct > 7, position: 'inside', formatter: `${bsPct}%`, fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 'bold', color: '#fff' }
      },
      {
        name: 'Front-End Bound', type: 'bar', stack: 'tma', data: [fePct],
        itemStyle: { color: '#3b82f6' },
        label: { show: fePct > 7, position: 'inside', formatter: `${fePct}%`, fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 'bold', color: '#fff' }
      },
      {
        name: 'Back-End Bound', type: 'bar', stack: 'tma', data: [bePct],
        itemStyle: { color: '#ef4444' },
        label: { show: true, position: 'inside', formatter: `${bePct}%`, fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 'bold', color: '#fff' }
      },
    ],
  };

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">TMA Pipeline Breakdown</h3>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400">
            <span className="inline-block w-2 h-2 bg-green-500"></span>Retiring
          </span>
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400">
            <span className="inline-block w-2 h-2 bg-orange-500"></span>Bad Speculation
          </span>
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400">
            <span className="inline-block w-2 h-2 bg-blue-500"></span>Front-End
          </span>
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400">
            <span className="inline-block w-2 h-2 bg-red-500"></span>Back-End
          </span>
        </div>
      </div>
      <div className="p-0 flex-1 w-full h-full bg-[#0F172A]/50">
        <ReactECharts option={option} opts={{ renderer: 'svg' }} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

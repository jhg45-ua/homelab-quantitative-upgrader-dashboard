import ReactECharts from 'echarts-for-react';
import { formatMetric } from '../utils/formatters';

export function Heatmap() {
  const xData = ['0.1ms', '0.5ms', '1ms', '2ms', '5ms', '10ms', '25ms', '50ms', '100ms', '+Inf'];
  const yData = ['sda', 'sdb', 'nvme0n1', 'nvme1n1'];
  
  const data = [];
  for (let i = 0; i < xData.length; i++) {
    for (let j = 0; j < yData.length; j++) {
      const isNvme = j >= 2;
      let val = 0;
      if (isNvme && i < 4) val = Math.random() * 80 + 20;
      else if (!isNvme && i >= 3 && i < 8) val = Math.random() * 80 + 20;
      else val = Math.random() * 10;
      data.push([i, j, val > 0 ? val : 0]);
    }
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: { 
      position: 'top', 
      backgroundColor: '#0F172A', 
      borderColor: '#334155',
      textStyle: { fontFamily: 'Space Grotesk, monospace', fontSize: 11, color: '#F8FAFC' },
      formatter: (params: any) => {
        return `<div class="font-mono text-[10px] uppercase text-slate-500 mb-1">Latency Bucket</div>
                <div class="flex justify-between gap-4"><span>Value:</span><span class="text-teal-400">${formatMetric(params.value[2])}</span></div>`;
      }
    },
    grid: { top: 10, right: 35, bottom: 25, left: 60 },
    xAxis: { type: 'category', data: xData, axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: '#94A3B8' }, splitArea: { show: true, areaStyle: { color: ['rgba(15,23,42,0.6)', 'rgba(30,41,59,0)'] } } },
    yAxis: { type: 'category', data: yData, axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: '#94A3B8' } },
    visualMap: { min: 0, max: 100, calculable: false, orient: 'horizontal', left: 'center', bottom: -10, inRange: { color: ['#1e3a8a', '#0ea5e9', '#0D9488', '#eab308', '#DC2626'] }, show: false },
    series: [{
      name: 'Block IO',
      type: 'heatmap',
      data: data,
      itemStyle: { borderColor: '#1E293B', borderWidth: 2 },
      label: { show: true, fontFamily: 'Space Grotesk, monospace', fontSize: 10, fontWeight: 'bold', align: 'center', color: '#F8FAFC', formatter: (params: any) => formatMetric(params.value[2]) }
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

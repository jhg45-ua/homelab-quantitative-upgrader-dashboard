import ReactECharts from 'echarts-for-react';

export function Heatmap() {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { position: 'top', textStyle: { fontFamily: 'Space Grotesk, monospace', fontSize: 11 } },
    grid: { top: 10, right: 20, bottom: 30, left: 60 },
    xAxis: { type: 'category', data: ['0ms', '1ms', '2ms', '5ms', '10ms', '50ms', '100ms'], axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: '#64748B' } },
    yAxis: { type: 'category', data: ['sda', 'nvme0n1', 'nvme1n1'], axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: '#64748B' } },
    visualMap: { min: 0, max: 100, calculable: false, orient: 'horizontal', left: 'center', bottom: -10, inRange: { color: ['#F8FAFC', '#99F6E4', '#0D9488', '#115E59'] }, show: false },
    series: [{
      name: 'Block IO',
      type: 'heatmap',
      data: [
        [0, 0, Math.round(Math.random() * 100)], [1, 0, Math.round(Math.random() * 50)], [2, 0, Math.round(Math.random() * 20)],
        [0, 1, Math.round(Math.random() * 50)], [1, 1, Math.round(Math.random() * 100)], [2, 1, Math.round(Math.random() * 80)],
        [0, 2, Math.round(Math.random() * 10)], [1, 2, Math.round(Math.random() * 20)], [2, 2, Math.round(Math.random() * 40)]
      ],
      label: { show: true, fontFamily: 'Space Grotesk, monospace', fontSize: 10, align: 'center', formatter: (params: any) => params.value[2].toFixed(0) }
    }]
  };

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col w-full h-full">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase">eBPF Block I/O Latency Heatmap</h3>
        <span className="text-[8px] md:text-[10px] font-mono text-[#0D9488] border border-[#0D9488] px-1 rounded-sm bg-teal-50">KERNEL PROBE</span>
      </div>
      <div className="p-2 md:p-4 h-48 md:h-64 flex-1">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

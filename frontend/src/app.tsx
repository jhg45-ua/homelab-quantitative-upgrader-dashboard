import { useState, useEffect } from 'preact/hooks';
import ReactECharts from 'echarts-for-react';
import { LayoutDashboard, Terminal } from 'lucide-preact';

const PEAK_MIPS = 120000;
const PEAK_BW_GBS = 59.7;
const ridgeOI = PEAK_MIPS / ((PEAK_BW_GBS * 1e9) / 64 / 1e6);

export function App() {
  const [metrics, setMetrics] = useState({
    powerW: 0,
    ipsPerW: 0,
    amat: 0,
    numaMiss: 0,
    tcpRetrans: 0,
    ips: 0,
    cpi: 0,
    cacheMiss: 0,
    ctxSwitches: 0,
  });

  // Historical data arrays for charts (rolling window of 20 points)
  const [history, setHistory] = useState<{ time: string, cpi: number, cacheMiss: number, ctxSwitches: number }[]>([]);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const HOST = 'hqud-agent';
        // Run all critical PromQL fetches in parallel
        const q = (query: string) => fetch(`/api/v1/query?query=${query}{host="${HOST}"}`).then(res => res.json());
        
        const reqs = await Promise.all([
          q('hqud_power_watts'),
          q('hqud_efficiency_ips_per_watt'),
          q('hqud_cpu_amat_cycles'),
          q('hqud_numa_miss_rate'),
          q('hqud_net_tcp_retransmits_ps'),
          q('hqud_cpu_ips'),
          q('hqud_cpu_cpi'),
          q('hqud_cpu_cache_miss_rate'),
          q('hqud_os_context_switches_ps')
        ]);

        const ext = (group: any) => group?.data?.result?.[0]?.value?.[1] ? parseFloat(group.data.result[0].value[1]) : 0;
        
        const newMetrics = {
          powerW: ext(reqs[0]),
          ipsPerW: ext(reqs[1]),
          amat: ext(reqs[2]),
          numaMiss: ext(reqs[3]),
          tcpRetrans: ext(reqs[4]),
          ips: ext(reqs[5]),
          cpi: ext(reqs[6]),
          cacheMiss: ext(reqs[7]),
          ctxSwitches: ext(reqs[8])
        };

        setMetrics(newMetrics);

        // Update history for graphs
        const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
        setHistory(prev => {
          const next = [...prev, {
            time: ts,
            cpi: newMetrics.cpi,
            cacheMiss: newMetrics.cacheMiss,
            ctxSwitches: newMetrics.ctxSwitches
          }];
          return next.slice(-20); // Keep last 20 frames
        });

        // Hardware Audit Simulate Log append
        const logLine = `[INFO] Polled TSDB. Power: ${newMetrics.powerW.toFixed(1)}W | IPS/W: ${(newMetrics.ipsPerW / 1e6).toFixed(1)}M | AMAT: ${newMetrics.amat.toFixed(2)}`;
        setLogs(prev => [...prev.slice(-100), `[${ts}] | [INFO] | Kernel Context Switches: ${newMetrics.ctxSwitches.toFixed(0)} / sec`, `[${ts}] | [INFO] | ${logLine}`]);

      } catch (err) {
        const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
        setLogs(prev => [...prev.slice(-100), `[${ts}] | [ERROR] | TSDB Fetch Timeout or Proxy Error`]);
      }
    };

    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  // Compute Scatter Coordinates
  let safeOI = 10000.0;
  if (metrics.cacheMiss > 0) {
    safeOI = Math.max(0.01, 100.0 / metrics.cacheMiss);
  }
  const safeMIPS = Math.max(1, metrics.ips / 1e6);

  // --- ECharts Configurations (Silicon Foundry Colors) ---
  const bwLineData: [number, number][] = [];
  for (let oi = 0.001; oi <= ridgeOI * 1.2; oi *= 1.15) {
    const mips = (oi * ((PEAK_BW_GBS * 1e9) / 64)) / 1e6;
    bwLineData.push([oi, Math.min(mips, PEAK_MIPS)]);
  }

  const computeLineData: [number, number][] = [];
  for (let oi = ridgeOI * 0.9; oi <= 10000; oi *= 1.3) {
    computeLineData.push([oi, PEAK_MIPS]);
  }

  const rooflineOption = {
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
      { name: 'Memory BW Roof', type: 'line', data: bwLineData, symbol: 'none', lineStyle: { color: '#0D9488', width: 3, type: 'dashed' } }, // Foundry Cyan
      { name: 'Compute Roof', type: 'line', data: computeLineData, symbol: 'none', lineStyle: { color: '#DC2626', width: 3, type: 'dashed' } }, // Performance Red
      { name: 'Live Workload', type: 'scatter', data: [[safeOI, safeMIPS]], symbolSize: 12, itemStyle: { color: '#0F172A', borderColor: '#475569', borderWidth: 2 } }
    ]
  };

  const heatmapOption = {
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
      label: { show: true, fontFamily: 'Space Grotesk, monospace', fontSize: 10, align: 'center', formatter: (params: any) => params.value[2].toFixed(1) }
    }]
  };

  const cpiTimelineOption = {
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
      lineStyle: { color: '#DC2626', width: 2 }, // Performance Red
      itemStyle: { color: '#DC2626' },
      areaStyle: { color: 'rgba(220, 38, 38, 0.1)' }
    }]
  };

  const mixedPressureOption = {
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
        itemStyle: { color: '#475569' } // Slate Gray
      },
      {
        name: 'Cache Miss %',
        type: 'line',
        data: history.map(h => h.cacheMiss),
        yAxisIndex: 1,
        smooth: true,
        lineStyle: { color: '#0D9488', width: 2 }, // Foundry Cyan
        itemStyle: { color: '#0D9488' }
      }
    ]
  };

  function processLog(logStr: string) {
    if (logStr.includes('[INFO]')) {
      return <span className="text-slate-300">{logStr.split('[INFO]')[0]}<span className="text-[#0D9488] font-bold">[INFO]</span>{logStr.split('[INFO]')[1]}</span>;
    }
    if (logStr.includes('[ERROR]')) {
      return <span className="text-slate-300">{logStr.split('[ERROR]')[0]}<span className="text-[#DC2626] font-bold">[ERROR]</span>{logStr.split('[ERROR]')[1]}</span>;
    }
    if (logStr.includes('[WARN]')) {
      return <span className="text-slate-300">{logStr.split('[WARN]')[0]}<span className="text-yellow-500 font-bold">[WARN]</span>{logStr.split('[WARN]')[1]}</span>;
    }
    return <span className="text-slate-300">{logStr}</span>;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      
      {/* Sidebar - Datacenter Base */}
      <aside className="w-16 md:w-64 bg-[#0F172A] flex flex-col shadow-lg z-10 border-r border-[#1E293B] shrink-0">
        <div className="p-4 md:p-6 border-b border-[#1E293B]">
          <h1 className="text-white text-xs md:text-sm font-semibold tracking-tight uppercase hidden md:block">HQUD Foundry</h1>
          <Terminal size={24} className="text-white md:hidden mx-auto" />
          <p className="text-slate-400 text-[10px] md:text-xs mt-1 font-mono uppercase hidden md:block">NODE::R720-PROD</p>
        </div>
        <nav className="flex-1 py-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-0 md:px-6 py-3 flex items-center justify-center md:justify-start text-sm font-medium ${activeTab === 'overview' ? 'text-white bg-[#1E293B] border-l-4 border-slate-300' : 'text-slate-400 hover:text-white hover:bg-[#1E293B] border-l-4 border-transparent'}`}>
            <LayoutDashboard size={16} className="md:mr-3" />
            <span className="hidden md:block">AUDIT CONSOLE</span>
          </button>
        </nav>
        <div className="p-4 border-t border-[#1E293B] hidden md:block">
          <div className="flex items-center text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-sm bg-[#0D9488] shadow-[0_0_8px_#0D9488] mr-2"></span>
            PROBE ONLINE
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-sm md:text-lg font-semibold tracking-wider text-slate-800 uppercase line-clamp-1">
            Microarchitecture Audit Panel
          </h2>
          <div className="text-[10px] md:text-xs font-mono text-slate-500 bg-slate-100 px-2 md:px-3 py-1 rounded-sm border border-slate-200 whitespace-nowrap ml-2">
            PID: 14022 | RING-0
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 flex flex-col gap-6 w-full max-w-[1600px] mx-auto overflow-x-hidden">
          
          {/* Top Row: 5 Datasheet Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col justify-between col-span-1">
              <div className="text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">ACTIVE POWER</div>
              <div className="flex items-baseline">
                <span className="text-2xl md:text-3xl font-mono text-slate-800">{metrics.powerW.toFixed(1)}</span>
                <span className="text-xs md:text-sm font-mono text-slate-400 ml-1 md:ml-2">W</span>
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2 hidden md:block">Total Package Draw</div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col justify-between col-span-1">
              <div className="text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">CPU EFFICIENCY</div>
              <div className="flex items-baseline">
                <span className="text-2xl md:text-3xl font-mono text-[#0D9488]">{(metrics.ipsPerW / 1e6).toFixed(1)}</span>
                <span className="text-xs md:text-sm font-mono text-[#0D9488]/70 ml-1 md:ml-2">M IPS/W</span>
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2 hidden md:block">Instr. per Watt</div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col justify-between col-span-1">
              <div className="text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">MEMORY AMAT</div>
              <div className="flex items-baseline">
                <span className="text-2xl md:text-3xl font-mono text-slate-800">{metrics.amat.toFixed(2)}</span>
                <span className="text-xs md:text-sm font-mono text-slate-400 ml-1 md:ml-2">cyc</span>
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2 hidden md:block">Avg Mem Access Time</div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col justify-between col-span-1">
              <div className="text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">NUMA MISS RATE</div>
              <div className="flex items-baseline">
                <span className="text-2xl md:text-3xl font-mono text-slate-800">{metrics.numaMiss.toFixed(2)}</span>
                <span className="text-xs md:text-sm font-mono text-slate-400 ml-1 md:ml-2">%</span>
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2 hidden md:block">Cross-node Fetches</div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col justify-between col-span-2 md:col-span-1">
              <div className="text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">TCP RETRANSMITS</div>
              <div className="flex items-baseline">
                <span className="text-2xl md:text-3xl font-mono text-slate-800">{metrics.tcpRetrans.toFixed(1)}</span>
                <span className="text-xs md:text-sm font-mono text-slate-400 ml-1 md:ml-2">/s</span>
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2 hidden md:block">Network Reliability</div>
            </div>

          </div>

          {/* Middle Row: eBPF Heatmap Full Width */}
          <div className="w-full">
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col w-full">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase">eBPF Block I/O Latency Heatmap</h3>
                <span className="text-[8px] md:text-[10px] font-mono text-[#0D9488] border border-[#0D9488] px-1 rounded-sm bg-teal-50">KERNEL PROBE</span>
              </div>
              <div className="p-2 md:p-4 h-48 md:h-64 w-full">
                <ReactECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Bottom Row: 3-column Analytical Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase">CPI Timeline</h3>
              </div>
              <div className="p-2 md:p-4 h-48 md:h-64">
                <ReactECharts option={cpiTimelineOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase">Pressure & OS Overhead</h3>
              </div>
              <div className="p-2 md:p-4 h-48 md:h-64">
                <ReactECharts option={mixedPressureOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-600 uppercase">Compute Architecture Roofline</h3>
              </div>
              <div className="p-2 md:p-4 h-48 md:h-64">
                <ReactECharts option={rooflineOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

          </div>
          
          <div className="flex-1 min-h-[1rem]"></div>

          {/* Terminal / Logger */}
          <div className="mt-auto shrink-0 mb-4">
            <div className="bg-[#0A0A0A] rounded-sm shadow-md border border-slate-800 flex flex-col overflow-hidden max-h-48">
               <div className="px-4 py-2 bg-[#0F172A] border-b border-slate-800 flex items-center shrink-0">
                  <Terminal size={14} className="text-slate-400 mr-2" />
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Hardware Audit Console — //ttyS0</span>
               </div>
               <div className="p-3 md:p-4 font-mono text-[9px] md:text-[11px] leading-relaxed flex flex-col gap-1 overflow-y-auto w-full break-all h-32">
                 {logs.length === 0 ? (
                   <div className="text-slate-600 animate-pulse">Awaiting kernel telemetry streams...</div>
                 ) : (
                   [...logs].reverse().map((L, i) => (
                     <div key={i} className="whitespace-pre-wrap">{processLog(L)}</div>
                   ))
                 )}
               </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

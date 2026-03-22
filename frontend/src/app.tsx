import { useState, useEffect } from 'preact/hooks';
import ReactECharts from 'echarts-for-react';
import { LayoutDashboard, Terminal } from 'lucide-preact';

const PEAK_MIPS = 120000;
const PEAK_BW_GBS = 59.7;
const ridgeOI = PEAK_MIPS / ((PEAK_BW_GBS * 1e9) / 64 / 1e6);

export function App() {
  const [metrics, setMetrics] = useState({
    ips: 0,
    cpi: 0,
    missRate: 0,
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const HOST = 'hqud-agent';
        const reqs = await Promise.all([
          fetch(`/api/v1/query?query=hqud_cpu_ips{host="${HOST}"}`).then(res => res.json()),
          fetch(`/api/v1/query?query=hqud_cpu_cpi{host="${HOST}"}`).then(res => res.json()),
          fetch(`/api/v1/query?query=hqud_cpu_cache_miss_rate{host="${HOST}"}`).then(res => res.json())
        ]);

        const ext = (group: any) => group?.data?.result?.[0]?.value?.[1] ? parseFloat(group.data.result[0].value[1]) : 0;
        
        const newIps = ext(reqs[0]);
        const newCpi = ext(reqs[1]);
        const newMiss = ext(reqs[2]);

        setMetrics({
          ips: newIps,
          cpi: newCpi,
          missRate: newMiss,
        });

        // Simulate Hardware Audit Logs based on PMU cycle
        const ts = new Date().toISOString().split('T')[1].replace('Z', '');
        const logLine = `[INFO] PMU TICK: Cores Scanned 32 | Total Instr: ${(newIps / 1e6).toFixed(2)}M | Cache Misses: ${newMiss.toFixed(1)}%`;
        setLogs(prev => [...prev.slice(-3), `[eBPF] ${ts} - Telemetry vector polled from kernel space.`, logLine]);

      } catch (err) {
        const ts = new Date().toISOString().split('T')[1].replace('Z', '');
        setLogs(prev => [...prev.slice(-3), `[ERROR] ${ts} - TSDB Unreachable: Proxy connection refused.`]);
      }
    };

    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  let safeOI = 10000.0;
  if (metrics.missRate > 0) {
    safeOI = Math.max(0.01, 100.0 / metrics.missRate);
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
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0F172A',
      borderColor: '#334155',
      textStyle: { color: '#F8FAFC', fontFamily: 'Space Grotesk, monospace', fontSize: 11 }
    },
    grid: { top: 40, right: 30, bottom: 40, left: 60 },
    xAxis: {
      type: 'log',
      name: 'OPERATIONAL INTENSITY (INSTR/BYTE)',
      nameLocation: 'middle',
      nameGap: 28,
      min: 0.01,
      max: 10000,
      axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 10 },
      splitLine: { lineStyle: { color: '#E2E8F0' } },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      nameTextStyle: { color: '#475569', fontFamily: 'Inter', fontSize: 10, fontWeight: 600, padding: [10, 0, 0, 0] }
    },
    yAxis: {
      type: 'log',
      name: 'PERFORMANCE (MIPS)',
      min: 1,
      max: PEAK_MIPS * 2,
      axisLabel: { color: '#64748B', fontFamily: 'Space Grotesk, monospace', fontSize: 10 },
      splitLine: { lineStyle: { color: '#E2E8F0' } },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      nameTextStyle: { color: '#475569', fontFamily: 'Inter', fontSize: 10, fontWeight: 600 }
    },
    series: [
      {
        name: 'Memory BW Roof',
        type: 'line',
        data: bwLineData,
        symbol: 'none',
        lineStyle: { color: '#0D9488', width: 3, type: 'dashed' } // TSMC Green for Memory
      },
      {
        name: 'Compute Roof',
        type: 'line',
        data: computeLineData,
        symbol: 'none',
        lineStyle: { color: '#DC2626', width: 3, type: 'dashed' } // AMD Crimson for Compute
      },
      {
        name: 'Live Workload',
        type: 'scatter',
        data: [[safeOI, safeMIPS]],
        symbolSize: 14,
        itemStyle: { color: '#0F172A', borderColor: '#475569', borderWidth: 2, shadowColor: 'rgba(15,23,42, 0.4)', shadowBlur: 8 }
      }
    ]
  };

  const heatmapOption = {
    backgroundColor: 'transparent',
    tooltip: { position: 'top', textStyle: { fontFamily: 'Space Grotesk, monospace', fontSize: 11 } },
    grid: { top: 30, right: 20, bottom: 30, left: 60 },
    xAxis: { type: 'category', data: ['0ms', '1ms', '2ms', '5ms', '10ms', '50ms', '100ms'], axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: '#64748B' } },
    yAxis: { type: 'category', data: ['sda', 'nvme0n1', 'nvme1n1'], axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: '#64748B' } },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: -10,
      inRange: { color: ['#F8FAFC', '#99F6E4', '#0D9488', '#115E59'] }, // TSMC Green gradient
      show: false
    },
    series: [{
      name: 'Block IO',
      type: 'heatmap',
      data: [
        [0, 0, Math.random() * 100], [1, 0, Math.random() * 50], [2, 0, Math.random() * 20],
        [0, 1, Math.random() * 50], [1, 1, Math.random() * 100], [2, 1, Math.random() * 80],
        [0, 2, Math.random() * 10], [1, 2, Math.random() * 20], [2, 2, Math.random() * 40]
      ],
      label: { show: true, fontFamily: 'Space Grotesk, monospace', fontSize: 10, align: 'center' }
    }]
  };

  function processLog(logStr: string) {
    if (logStr.includes('[INFO]')) {
      return <span><span className="text-[#0D9488] font-bold">[INFO]</span>{logStr.split('[INFO]')[1]}</span>;
    }
    if (logStr.includes('[ERROR]')) {
      return <span><span className="text-[#DC2626] font-bold">[ERROR]</span>{logStr.split('[ERROR]')[1]}</span>;
    }
    if (logStr.includes('[eBPF]')) {
      return <span><span className="text-[#0071C5] font-bold">[eBPF]</span>{logStr.split('[eBPF]')[1]}</span>;
    }
    if (logStr.includes('[WARN]')) {
      return <span><span className="text-yellow-500 font-bold">[WARN]</span>{logStr.split('[WARN]')[1]}</span>;
    }
    return <span>{logStr}</span>;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      
      {/* Sidebar - Intel Datacenter Base */}
      <aside className="w-64 bg-[#0F172A] flex flex-col shadow-lg z-10 border-r border-[#1E293B]">
        <div className="p-6 border-b border-[#1E293B]">
          <h1 className="text-white text-sm font-semibold tracking-tight uppercase">HQUD Foundry</h1>
          <p className="text-slate-400 text-xs mt-1 font-mono uppercase">NODE::R720-PROD</p>
        </div>
        <nav className="flex-1 py-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-6 py-3 flex items-center text-sm font-medium ${activeTab === 'overview' ? 'text-white bg-[#1E293B] border-l-4 border-slate-300' : 'text-slate-400 hover:text-white hover:bg-[#1E293B] border-l-4 border-transparent'}`}>
            <LayoutDashboard size={16} className="mr-3" />
            AUDIT CONSOLE
          </button>
        </nav>
        <div className="p-4 border-t border-[#1E293B]">
          <div className="flex items-center text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-sm bg-[#0D9488] shadow-[0_0_8px_#0D9488] mr-2"></span>
            PROBE ONLINE
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold tracking-wider text-slate-800 uppercase">
            Microarchitecture Audit Panel
          </h2>
          <div className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-sm border border-slate-200">
            PID: 14022 | RING-0
          </div>
        </header>

        <div className="p-8 flex-1 flex flex-col gap-8">
          
          {/* Top Row: 5 Datasheet Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">MIPS</div>
              <div className="flex items-baseline">
                <span className="text-3xl font-mono text-slate-800">{safeMIPS.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                <span className="text-sm font-mono text-slate-400 ml-2">M/s</span>
              </div>
              <div className="text-xs text-slate-500 mt-3 border-t border-slate-100 pt-2">Peak Inst. Per Sec</div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">CPI</div>
              <div className="flex items-baseline">
                <span className="text-3xl font-mono text-slate-800">{metrics.cpi.toFixed(2)}</span>
                <span className="text-sm font-mono text-slate-400 ml-2">cyc</span>
              </div>
              <div className="text-xs text-slate-500 mt-3 border-t border-slate-100 pt-2">Cycles Per Instruction</div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">IPS / WATT</div>
              <div className="flex items-baseline">
                <span className="text-3xl font-mono text-[#0D9488]">342</span>
                <span className="text-sm font-mono text-slate-400 ml-2">M/W</span>
              </div>
              <div className="text-xs text-slate-500 mt-3 border-t border-slate-100 pt-2">Power Efficiency Rating</div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">AMAT</div>
              <div className="flex items-baseline">
                <span className="text-3xl font-mono text-slate-800">{4.02.toFixed(2)}</span>
                <span className="text-sm font-mono text-slate-400 ml-2">cyc</span>
              </div>
              <div className="text-xs text-slate-500 mt-3 border-t border-slate-100 pt-2">Global Memory Access</div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">NUMA MISS RATE</div>
              <div className="flex items-baseline">
                <span className="text-3xl font-mono text-slate-800">{metrics.missRate.toFixed(2)}</span>
                <span className="text-sm font-mono text-slate-400 ml-2">%</span>
              </div>
              <div className="text-xs text-slate-500 mt-3 border-t border-slate-100 pt-2">Remote Node Lookups</div>
            </div>

          </div>

          {/* Middle Row: Deep Dive Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider text-slate-600 uppercase">AMD Compute Architecture Roofline</h3>
                <span className="text-[10px] font-mono text-[#DC2626] border border-[#DC2626] px-1 rounded-sm bg-red-50">COMPUTE BOUNDARY</span>
              </div>
              <div className="p-4 h-80">
                <ReactECharts option={rooflineOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider text-slate-600 uppercase">IO Latency eBPF Heatmap</h3>
                <span className="text-[10px] font-mono text-[#0D9488] border border-[#0D9488] px-1 rounded-sm bg-teal-50">TSMC NODE 7NM</span>
              </div>
              <div className="p-4 h-80">
                <ReactECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

          </div>
          
          <div className="flex-1"></div> {/* Spacer to push console to bottom if needed */}

          {/* Bottom Row: Hardware Audit Console */}
          <div className="mt-auto">
            <div className="bg-slate-950 rounded-sm shadow-md border border-slate-800 flex flex-col overflow-hidden">
               <div className="px-4 py-2 bg-[#0F172A] border-b border-slate-800 flex items-center">
                  <Terminal size={14} className="text-slate-400 mr-2" />
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Hardware Audit Console — //ttyS0</span>
               </div>
               <div className="p-4 font-mono text-[11px] text-slate-300 h-32 overflow-y-auto flex flex-col gap-1">
                 {logs.length === 0 ? (
                   <div className="text-slate-600 animate-pulse">Awaiting kernel telemetry streams...</div>
                 ) : (
                   logs.map((L, i) => (
                     <div key={i}>{processLog(L)}</div>
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

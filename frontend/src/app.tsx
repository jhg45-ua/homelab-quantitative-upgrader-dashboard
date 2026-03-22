import { useState, useEffect } from 'preact/hooks';
import ReactECharts from 'echarts-for-react';
import { Server, Cpu, Flame, Database, LayoutDashboard, Hash } from 'lucide-preact';

const PEAK_MIPS = 120000;
const PEAK_BW_GBS = 59.7;
const ridgeOI = PEAK_MIPS / ((PEAK_BW_GBS * 1e9) / 64 / 1e6);

export function App() {
  const [metrics, setMetrics] = useState({
    ips: 0,
    cpi: 0,
    missRate: 0,
  });

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const HOST = 'hqud-agent'; // Replace with dynamic hardware config later if needed
        const reqs = await Promise.all([
          fetch(`/api/v1/query?query=hqud_cpu_ips{host="${HOST}"}`).then(res => res.json()),
          fetch(`/api/v1/query?query=hqud_cpu_cpi{host="${HOST}"}`).then(res => res.json()),
          fetch(`/api/v1/query?query=hqud_cpu_cache_miss_rate{host="${HOST}"}`).then(res => res.json())
        ]);

        const ext = (group: any) => group?.data?.result?.[0]?.value?.[1] ? parseFloat(group.data.result[0].value[1]) : 0;
        
        setMetrics({
          ips: ext(reqs[0]),
          cpi: ext(reqs[1]),
          missRate: ext(reqs[2]),
        });
      } catch (err) {
        console.error("TSDB Proxy Fetch Error:", err);
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

  // --- ECharts Configurations ---

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
      backgroundColor: 'rgba(25, 28, 30, 0.95)',
      borderColor: '#414752',
      textStyle: { color: '#f7f9fb', fontFamily: 'Inter' }
    },
    grid: { top: 40, right: 30, bottom: 40, left: 60 },
    xAxis: {
      type: 'log',
      name: 'Operational Intensity (Instr/Byte)',
      nameLocation: 'middle',
      nameGap: 24,
      min: 0.01,
      max: 10000,
      axisLabel: { color: '#414752', fontFamily: 'Space Grotesk, monospace', fontSize: 10 },
      splitLine: { lineStyle: { color: '#e0e3e5' } },
      axisLine: { lineStyle: { color: '#717783' } },
      nameTextStyle: { color: '#414752', fontFamily: 'Inter', fontSize: 11, fontWeight: 500 }
    },
    yAxis: {
      type: 'log',
      name: 'Performance (MIPS)',
      min: 1,
      max: PEAK_MIPS * 2,
      axisLabel: { color: '#414752', fontFamily: 'Space Grotesk, monospace', fontSize: 10 },
      splitLine: { lineStyle: { color: '#e0e3e5' } },
      axisLine: { lineStyle: { color: '#717783' } },
      nameTextStyle: { color: '#414752', fontFamily: 'Inter', fontSize: 11, fontWeight: 500 }
    },
    series: [
      {
        name: 'Memory BW Roof',
        type: 'line',
        data: bwLineData,
        symbol: 'none',
        lineStyle: { color: '#00589c', width: 3, type: 'dashed' }
      },
      {
        name: 'Compute Roof',
        type: 'line',
        data: computeLineData,
        symbol: 'none',
        lineStyle: { color: '#ba1a1a', width: 3, type: 'dashed' }
      },
      {
        name: 'Live Workload',
        type: 'scatter',
        data: [[safeOI, safeMIPS]],
        symbolSize: 16,
        itemStyle: { color: '#0071c5', borderColor: '#d3e4ff', borderWidth: 2, shadowColor: 'rgba(0,113,197, 0.4)', shadowBlur: 10 }
      }
    ]
  };

  const heatmapOption = {
    backgroundColor: 'transparent',
    tooltip: { position: 'top', textStyle: { fontFamily: 'Inter' } },
    grid: { top: 30, right: 20, bottom: 30, left: 60 },
    xAxis: { type: 'category', data: ['0ms', '1ms', '2ms', '5ms', '10ms', '50ms', '100ms'], axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10 } },
    yAxis: { type: 'category', data: ['sda', 'nvme0n1', 'nvme1n1'], axisLabel: { fontFamily: 'Space Grotesk, monospace', fontSize: 10 } },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: -10,
      inRange: { color: ['#f7f9fb', '#aec8ef', '#0071c5', '#004881'] },
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
      label: { show: true, fontFamily: 'Space Grotesk, monospace', fontSize: 10 }
    }]
  };

  return (
    <div className="flex h-screen bg-[#f7f9fb] text-[#191c1e] font-sans antialiased">
      {/* Sidebar - Technical Blue Nav */}
      <aside className="w-64 bg-[#001c38] flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-[#004881]">
          <h1 className="text-white text-lg font-semibold tracking-tight">HQUD Data Center</h1>
          <p className="text-[#a2c9ff] text-xs mt-1 font-mono uppercase">Node: r720-prod</p>
        </div>
        <nav className="flex-1 py-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-6 py-3 flex items-center text-sm font-medium ${activeTab === 'overview' ? 'text-white bg-[#004881] border-l-4 border-[#d3e4ff]' : 'text-[#a2c9ff] hover:text-white hover:bg-[#002b54] border-l-4 border-transparent'}`}>
            <LayoutDashboard size={18} className="mr-3" />
            Executive Overview
          </button>
          <button 
             onClick={() => setActiveTab('deepdive')}
            className={`w-full text-left px-6 py-3 flex items-center text-sm font-medium ${activeTab === 'deepdive' ? 'text-white bg-[#004881] border-l-4 border-[#d3e4ff]' : 'text-[#a2c9ff] hover:text-white hover:bg-[#002b54] border-l-4 border-transparent'}`}>
            <Database size={18} className="mr-3" />
            Scientific Deep Dive
          </button>
        </nav>
        <div className="p-4 border-t border-[#004881]">
          <div className="flex items-center text-xs text-[#a2c9ff] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#0071c5] shadow-[0_0_8px_#0071c5] mr-2"></span>
            Agent Online
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-[#191c1e]">
            {activeTab === 'overview' ? 'Executive Overview' : 'Scientific Deep Dive'}
          </h2>
        </header>

        <div className="p-8 flex-1">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Metric Card 1 */}
              <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                <div className="flex items-center text-[#414752] mb-4">
                  <Cpu size={16} className="mr-2 text-[#0071c5]" />
                  <span className="text-sm font-medium">System IPS</span>
                </div>
                <div className="text-3xl font-mono text-[#191c1e]">
                  {(metrics.ips / 1e9).toFixed(2)}B
                </div>
              </div>
              
              {/* Metric Card 2 */}
              <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                <div className="flex items-center text-[#414752] mb-4">
                  <Flame size={16} className="mr-2 text-[#ba1a1a]" />
                  <span className="text-sm font-medium">Peak CPU MIPS</span>
                </div>
                <div className="text-3xl font-mono text-[#191c1e]">
                  {safeMIPS.toLocaleString(undefined, {maximumFractionDigits:0})}
                </div>
              </div>

              {/* Metric Card 3 */}
              <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                <div className="flex items-center text-[#414752] mb-4">
                  <Server size={16} className="mr-2 text-[#0071c5]" />
                  <span className="text-sm font-medium">Global AMAT</span>
                </div>
                <div className="text-3xl font-mono text-[#191c1e]">
                  {4.02.toFixed(2)}
                </div>
              </div>

              {/* Metric Card 4 */}
              <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                <div className="flex items-center text-[#414752] mb-4">
                  <Hash size={16} className="mr-2 text-[#8c4200]" />
                  <span className="text-sm font-medium">Cache Miss Rate</span>
                </div>
                <div className="text-3xl font-mono text-[#191c1e]">
                  {metrics.missRate.toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          {/* Deep Dive Section / Charts */}
          <div className={`mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 ${activeTab === 'overview' ? 'block' : 'mt-0'}`}>
            <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold tracking-tight text-[#191c1e]">Roofline Model Computacional</h3>
              </div>
              <div className="p-4 h-96">
                <ReactECharts option={rooflineOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold tracking-tight text-[#191c1e]">IO Latency Histograms</h3>
              </div>
              <div className="p-4 h-96">
                <ReactECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

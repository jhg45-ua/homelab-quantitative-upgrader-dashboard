import { useState } from 'preact/hooks';
import { LayoutDashboard, Terminal } from 'lucide-preact';
import { useMetrics } from './hooks/useMetrics';
import { DatasheetCard } from './components/DatasheetCard';
import { Heatmap } from './components/Heatmap';
import { RooflineChart } from './components/RooflineChart';
import { ComboChart } from './components/ComboChart';
import { TimelineChart } from './components/TimelineChart';
import { HardwareConsole } from './components/HardwareConsole';

export function App() {
  const { metrics, history, logs } = useMetrics();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-hidden">
      
      {/* Sidebar - Datacenter Base */}
      <aside className="w-16 md:w-64 bg-slate-950 flex flex-col z-10 border-r border-slate-800 shrink-0">
        <div className="p-4 md:p-6 border-b border-slate-800">
          <h1 className="text-slate-100 text-xs md:text-sm font-semibold tracking-tight uppercase hidden md:block">HQUD Foundry</h1>
          <Terminal size={24} className="text-slate-100 md:hidden mx-auto" />
          <p className="text-slate-400 text-[10px] md:text-xs mt-1 font-mono uppercase hidden md:block">NODE::R720-BAREMETAL</p>
        </div>
        <nav className="flex-1 py-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-0 md:px-6 py-3 flex items-center justify-center md:justify-start text-sm font-medium ${activeTab === 'overview' ? 'text-slate-100 bg-slate-800 border-l-4 border-teal-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border-l-4 border-transparent'}`}>
            <LayoutDashboard size={16} className="md:mr-3" />
            <span className="hidden md:block">AUDIT CONSOLE</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800 hidden md:block">
          <div className="flex items-center text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-sm bg-[#0D9488] shadow-[0_0_8px_#0D9488] mr-2"></span>
            PROBE ONLINE
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full">
        <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-3 flex justify-between items-center shrink-0">
          <h2 className="text-sm md:text-lg font-semibold tracking-wider text-slate-300 uppercase line-clamp-1">
            Microarchitecture Audit Panel
          </h2>
          <div className="text-[10px] md:text-xs font-mono text-slate-400 bg-slate-800 px-2 md:px-3 py-1 border border-slate-700 whitespace-nowrap ml-2">
            PID: 14022 | RING-0
          </div>
        </header>

        <div className="p-3 md:p-6 flex-1 flex flex-col gap-4 w-full max-w-[1600px] mx-auto overflow-x-hidden pt-4">
          
          {/* Top Row: 5 Datasheet Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
             <DatasheetCard title="ACTIVE POWER" value={metrics.powerW.toFixed(1)} unit="W" footer="Total Package Draw" />
             <DatasheetCard title="CPU EFFICIENCY" value={(metrics.ipsPerW / 1e6).toFixed(1)} unit="M IPS/W" footer="Instr. per Watt" valueColor="text-teal-400" />
             <DatasheetCard title="MEMORY AMAT" value={metrics.amat.toFixed(2)} unit="cyc" footer="Avg Mem Access Time" />
             <DatasheetCard title="NUMA MISS RATE" value={metrics.numaMiss.toFixed(2)} unit="%" footer="Cross-node Fetches" />
             <DatasheetCard title="TCP RETRANSMITS" value={metrics.tcpRetrans.toFixed(1)} unit="/s" footer="Network Reliability" colSpan="2" />
          </div>

          {/* Middle Row: eBPF Heatmap Full Width */}
          <div className="w-full">
            <Heatmap />
          </div>

          {/* Bottom Row: 3-column Analytical Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
             <TimelineChart history={history} />
             <ComboChart history={history} />
             <RooflineChart ips={metrics.ips} cacheMiss={metrics.cacheMiss} />
          </div>
          
          <div className="flex-1 min-h-[0.5rem]"></div>

          {/* Terminal / Logger */}
          <div className="mt-auto shrink-0 mb-2">
             <HardwareConsole logs={logs} />
          </div>

        </div>
      </main>
    </div>
  );
}

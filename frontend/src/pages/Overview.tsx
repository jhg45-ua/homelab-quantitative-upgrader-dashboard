import { DatasheetCard } from '../components/DatasheetCard';
import type { MetricsState } from '../types';
import { Download } from 'lucide-preact';

interface Props {
  metrics: MetricsState;
}

export function Overview({ metrics }: Props) {
  return (
    <div className="flex flex-col h-full">
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-4 flex justify-between items-center shrink-0">
        <div>
           <h2 className="text-sm md:text-lg font-semibold tracking-wider text-slate-300 uppercase line-clamp-1">
             Executive Overview
           </h2>
           <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest hidden md:block">
             Real-time Performance Telemetry
           </div>
        </div>
        
        <button className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-500 transition-colors rounded-sm text-xs font-semibold tracking-wide">
          <Download size={14} />
          <span className="hidden md:inline">Export Audit Report (PDF)</span>
          <span className="inline md:hidden">PDF</span>
        </button>
      </header>

      <div className="p-4 md:p-8 flex-1 flex flex-col w-full max-w-[1600px] mx-auto overflow-y-auto">
        <h3 className="text-slate-400 font-mono uppercase tracking-widest text-xs mb-4">Core Datasheets</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
           <DatasheetCard title="ACTIVE POWER" value={metrics.powerW.toFixed(1)} unit="W" footer="Total Package Draw" />
           <DatasheetCard title="CPU EFFICIENCY" value={(metrics.ipsPerW / 1e6).toFixed(1)} unit="M IPS/W" footer="Instr. per Watt" valueColor="text-teal-400" />
           <DatasheetCard title="MEMORY AMAT" value={metrics.amat.toFixed(2)} unit="cyc" footer="Avg Mem Access Time" />
           <DatasheetCard title="NUMA MISS RATE" value={metrics.numaMiss.toFixed(2)} unit="%" footer="Cross-node Fetches" />
           <DatasheetCard title="TCP RETRANSMITS" value={metrics.tcpRetrans.toFixed(1)} unit="/s" footer="Network Reliability" colSpan="2" />
        </div>
      </div>
    </div>
  );
}

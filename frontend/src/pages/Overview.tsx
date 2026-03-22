import { DatasheetCard } from '../components/DatasheetCard';
import type { MetricsState, SystemConfig } from '../types';
import { Download, Cpu, HardDrive, Server } from 'lucide-preact';

interface Props {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
}

function formatUptime(seconds: number): string {
  if (seconds <= 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function Overview({ metrics, systemConfig }: Props) {
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
        
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-500 transition-colors rounded-sm text-xs font-semibold tracking-wide">
          <Download size={14} />
          <span className="hidden md:inline">Export Audit Report (PDF)</span>
          <span className="inline md:hidden">PDF</span>
        </button>
      </header>

      <div className="p-4 md:p-8 flex-1 flex flex-col gap-6 w-full max-w-[1600px] mx-auto overflow-y-auto">
        <div>
          <h3 className="text-slate-400 font-mono uppercase tracking-widest text-xs mb-3">Core Datasheets</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
             <DatasheetCard title="ACTIVE POWER" value={metrics.powerW.toFixed(1)} unit="W" footer="Total Package Draw" />
             <DatasheetCard title="CPU EFFICIENCY" value={(metrics.ipsPerW / 1e6).toFixed(1)} unit="M IPS/W" footer="Instr. per Watt" valueColor="text-teal-400" />
             <DatasheetCard title="MEMORY AMAT" value={metrics.amat.toFixed(2)} unit="cyc" footer="Avg Mem Access Time" />
             <DatasheetCard title="NUMA MISS RATE" value={metrics.numaMiss.toFixed(2)} unit="%" footer="Cross-node Fetches" />
             <DatasheetCard title="TCP RETRANSMITS" value={metrics.tcpRetrans.toFixed(1)} unit="/s" footer="Network Reliability" />
             <DatasheetCard title="SYSTEM UPTIME" value={formatUptime(metrics.uptimeSeconds)} unit="" footer="Dependability" valueColor="text-teal-400" />
          </div>
        </div>

        {/* System Configuration Metadata Panel */}
        <div>
          <h3 className="text-slate-400 font-mono uppercase tracking-widest text-xs mb-3">System Configuration Metadata</h3>
          <div className="bg-slate-800 border border-slate-700 p-4 md:p-6">
            {systemConfig ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <ConfigRow icon={<Server size={14} className="text-slate-500" />} label="NODE NAME" value={systemConfig.node_name || '—'} />
                <ConfigRow icon={<Cpu size={14} className="text-slate-500" />} label="HARDWARE" value={systemConfig.hardware_desc || '—'} />
                <ConfigRow icon={<Cpu size={14} className="text-slate-500" />} label="CORES" value={`${systemConfig.specs.cores} Cores`} />
                <ConfigRow icon={<HardDrive size={14} className="text-slate-500" />} label="PEAK THROUGHPUT" value={`${systemConfig.specs.peak_mips.toLocaleString()} MIPS`} />
                <ConfigRow icon={<HardDrive size={14} className="text-slate-500" />} label="MEMORY BANDWIDTH" value={`${systemConfig.specs.max_mem_bw_gbps} GB/s`} />
              </div>
            ) : (
              <div className="text-slate-500 font-mono text-xs animate-pulse">Fetching hardware configuration from /api/hardware...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-700/50 pb-3">
      {icon}
      <div className="flex-1">
        <div className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{label}</div>
        <div className="text-sm md:text-base text-slate-200 font-mono">{value}</div>
      </div>
    </div>
  );
}

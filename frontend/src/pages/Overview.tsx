import type { MetricsState, SystemConfig } from '../types';
import { FileText, Cpu, Server } from 'lucide-preact';
import { formatMetric, formatUptime } from '../utils/formatters';

interface Props {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
}

const APP_VERSION = "v2.6.11";

function generateAuditReport(metrics: MetricsState, config: SystemConfig | null) {
  const now = new Date();
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>HQUD Audit Report - ${config?.node_name || 'r720-baremetal'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Roboto+Mono:wght@400;700&display=swap');
          body { font-family: 'Inter', sans-serif; background: #fff; color: #000; margin: 0; padding: 40px; }
          .header { border-bottom: 4px solid #111827; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
          .metadata { font-family: 'Roboto Mono', monospace; font-size: 11px; color: #666; text-transform: uppercase; }
          .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #111827; padding-bottom: 5px; margin-bottom: 15px; margin-top: 30px; letter-spacing: 0.1em; color: #374151; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .metric-card { border: 1px solid #E5E7EB; padding: 15px; }
          .metric-label { font-size: 9px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin-bottom: 5px; }
          .metric-value { font-size: 20px; font-weight: 900; font-family: 'Roboto Mono', monospace; color: #111827; }
          .summary { background: #F9FAFB; padding: 20px; border-left: 6px solid #111827; margin: 30px 0; }
          .footer { font-size: 9px; color: #9CA3AF; text-align: center; margin-top: 50px; font-family: 'Roboto Mono', monospace; border-top: 1px solid #E5E7EB; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Hardware Audit Report</div>
            <div class="metadata">Node: ${config?.node_name || 'r720-baremetal'} // HW: ${config?.hardware_desc || 'Dell R720'}</div>
          </div>
          <div style="text-align: right">
            <div class="metadata">Generated: ${now.toLocaleString()}</div>
            <div class="metadata">v${APP_VERSION} // ${now.toISOString()}</div>
          </div>
        </div>

        <div class="section-title">Telemetry Snapshot</div>
        <div class="grid">
          <div class="metric-card"><div class="metric-label">Power</div><div class="metric-value">${formatMetric(metrics.powerW)} W</div></div>
          <div class="metric-card"><div class="metric-label">Efficiency</div><div class="metric-value">${formatMetric(metrics.ipsPerW / 1e6)} M IPS/W</div></div>
          <div class="metric-card"><div class="metric-label">Mem Latency</div><div class="metric-value">${formatMetric(metrics.amat)} cyc</div></div>
          <div class="metric-card"><div class="metric-label">NUMA Miss</div><div class="metric-value">${formatMetric(metrics.numaMiss)} %</div></div>
          <div class="metric-card"><div class="metric-label">TCP Retrans</div><div class="metric-value">${formatMetric(metrics.tcpRetrans)} /s</div></div>
          <div class="metric-card"><div class="metric-label">Uptime</div><div class="metric-value">${formatUptime(metrics.uptimeSeconds)}</div></div>
        </div>

        <div class="summary">
          <div class="section-title" style="border:none; margin-top:0">Foundry Assessment</div>
          <p style="font-size: 13px; line-height: 1.5; color: #374151">
            System performance is marked as <strong>${metrics.amat < 20 ? 'NOMINAL' : 'DEGRADED'}</strong>. 
            AMAT of ${formatMetric(metrics.amat)} cycles suggests the memory subsystem is ${metrics.amat < 15 ? 'efficient' : 'experiencing minor stalls'}.
          </p>
        </div>

        <div class="footer">
          DOCUMENT CLASSIFIED // HQUD QUANTITATIVE AUDIT ENGINE // v${APP_VERSION}
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

export function Overview({ metrics, systemConfig }: Props) {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-100 uppercase">
            Executive Overview
          </h2>
          <div className="text-[10px] font-mono text-slate-500 mt-2 uppercase tracking-[0.3em] font-black">
            Real-time Performance Telemetry // Foundry Engine Core
          </div>
        </div>
        <button 
          onClick={() => generateAuditReport(metrics, systemConfig)}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center gap-3 active:scale-95"
        >
          <FileText size={14} />
          Export Audit Report (PDF)
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <DatasheetCard 
          title="ACTIVE POWER" 
          value={metrics.powerW !== null ? formatMetric(metrics.powerW) : '-'} 
          unit="W" 
          footer="Total Package Draw" 
        />
        <DatasheetCard 
          title="CPU EFFICIENCY" 
          value={metrics.ipsPerW !== null ? formatMetric(metrics.ipsPerW / 1e6) : '-'} 
          unit="M IPS/W" 
          footer="Instr. per Watt" 
          valueColor="text-teal-400" 
        />
        <DatasheetCard 
          title="MEMORY AMAT" 
          value={metrics.amat !== null ? formatMetric(metrics.amat) : '-'} 
          unit="cyc" 
          footer="Avg Mem Access Time" 
        />
        <DatasheetCard 
          title="NUMA MISS RATE" 
          value={metrics.numaMiss !== null ? formatMetric(metrics.numaMiss) : '-'} 
          unit="%" 
          footer="Cross-node Fetches" 
        />
        <DatasheetCard 
          title="TCP RETRANSMITS" 
          value={metrics.tcpRetrans !== null ? formatMetric(metrics.tcpRetrans) : '-'} 
          unit="/s" 
          footer="Network Reliability" 
        />
        <DatasheetCard 
          title="SYSTEM UPTIME" 
          value={metrics.uptimeSeconds !== null ? formatUptime(metrics.uptimeSeconds) : '-'} 
          unit="" 
          footer="Node Dependability" 
          valueColor="text-emerald-400"
        />
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] font-black mb-6 flex items-center gap-4">
           <span>System Metadata</span>
           <div className="flex-1 h-px bg-slate-800"></div>
        </div>
        <div className="bg-slate-800/20 border border-slate-800/50 p-8 flex flex-col md:flex-row gap-12 text-slate-300">
           <div className="flex items-center gap-6">
              <Server size={32} className="text-slate-600" />
              <div>
                 <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black mb-1">Node Name</div>
                 <div className="font-mono text-lg md:text-xl font-bold">{systemConfig?.node_name || 'r720-baremetal'}</div>
              </div>
           </div>
           <div className="flex items-center gap-6">
              <Cpu size={32} className="text-slate-600" />
              <div>
                 <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black mb-1">Hardware</div>
                 <div className="font-bold text-lg md:text-xl">{systemConfig?.hardware_desc || 'Dell PowerEdge R720'}</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function DatasheetCard({ title, value, unit, footer, valueColor = "text-slate-100" }: any) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 p-8 flex flex-col justify-between group hover:border-teal-500/30 transition-all backdrop-blur-sm shadow-xl">
      <div>
        <div className="text-slate-400 text-[10px] font-mono font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-slate-500 group-hover:bg-teal-400 transition-colors"></div>
          {title}
        </div>
        <div className="flex items-baseline gap-4">
          <span className={`text-5xl md:text-6xl font-black ${valueColor} tabular-nums tracking-tighter drop-shadow-md`}>{value}</span>
          <span className="text-sm font-mono text-slate-500 font-bold uppercase">{unit}</span>
        </div>
      </div>
      <p className="text-[9px] font-mono text-slate-600 mt-6 uppercase tracking-widest font-bold">{footer}</p>
    </div>
  );
}

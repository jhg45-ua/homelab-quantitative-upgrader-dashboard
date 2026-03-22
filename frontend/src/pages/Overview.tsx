import type { MetricsState, SystemConfig } from '../types';
import { FileText, Cpu, Server } from 'lucide-preact';
import { formatMetric, formatUptime } from '../utils/formatters';

interface Props {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
}

const APP_VERSION = "v2.7.0";

function generateAuditReport(metrics: MetricsState, config: SystemConfig | null) {
  const isoTs = new Date().toISOString();
  let upgradeSection = '';
  // v2.6.2: Dynamic recommendations based on telemetry
  if (metrics.amat > 22 || metrics.numaMiss > 10) {
     upgradeSection = `
       <div class="summary" style="border-left-color: #f97316; background: #fff7ed; padding: 25px; margin: 30px 0; border-left: 8px solid #f97316">
          <div style="font-size:14px; font-weight:900; color: #c2410c; text-transform:uppercase; margin-bottom:10px;">Critical Path: Memory Optimization Required</div>
          <p style="font-size:12px; color: #7c2d12; margin:0; line-height:1.6;">
            The current <strong>Average Memory Access Time (AMAT: ${formatMetric(metrics.amat)} cyc)</strong> indicates significant stall cycles. 
            <strong>Recommendation:</strong> Consolidate processes to a single NUMA node or verify RAM timings in BIOS.
          </p>
       </div>
     `;
  }

  const html = `
    <html>
      <head>
        <title>HQUD Foundry Audit - ${config?.node_name || 'Node-0'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&family=Inter:wght@400;900&display=swap');
          body { font-family: 'Inter', sans-serif; background: #0A0F1D; color: #cbd5e1; margin: 0; padding: 50px; }
          .report-container { max-width: 900px; margin: 0 auto; }
          .header { border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 32px; font-weight: 900; color: #f8fafc; text-transform: uppercase; letter-spacing: -1.5px; }
          .metadata { font-family: 'Roboto Mono', monospace; font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 5px; }
          .section-title { font-size: 11px; font-weight: 900; color: #14b8a6; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 20px; border-left: 4px solid #14b8a6; padding-left: 15px; }
          .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 50px; }
          .metric-box { background: #0F172A; border: 1px solid #1e293b; padding: 25px; position: relative; }
          .m-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
          .m-value { font-size: 24px; font-weight: 900; color: #f8fafc; font-family: 'Roboto Mono', monospace; }
          .m-unit { font-size: 10px; color: #475569; margin-left: 5px; }
          .tma-bar { height: 12px; background: #1e293b; border-radius: 6px; overflow: hidden; display: flex; margin: 20px 0; }
          .tma-seg { height: 100%; transition: width 0.3s ease; }
          .footer { margin-top: 60px; border-top: 1px solid #1e293b; padding-top: 20px; display: flex; justify-content: space-between; font-family: 'Roboto Mono', monospace; font-size: 9px; color: #475569; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <div>
              <div class="title">System Qualitative Audit</div>
              <div class="metadata">Node Identifier: ${config?.node_name || 'UNSPECIFIED'} // HQ-Core ${APP_VERSION}</div>
            </div>
            <div style="text-align: right">
              <div class="metadata" style="color:#14b8a6; font-weight:bold;">REPORT: ${isoTs}</div>
              <div class="metadata">Hardware: ${config?.hardware_desc || 'Generic Hardware'}</div>
            </div>
          </div>

          <div class="section-title">Telemetry Datasheet</div>
          <div class="metric-grid">
            <div class="metric-box"><div class="m-label">Active Power</div><div class="m-value">${formatMetric(metrics.powerW)}<span class="m-unit">W</span></div></div>
            <div class="metric-box"><div class="m-label">Efficiency</div><div class="m-value">${formatMetric(metrics.ipsPerW / 1e6)}<span class="m-unit">M IPS/W</span></div></div>
            <div class="metric-box"><div class="m-label">Memory AMAT</div><div class="m-value">${formatMetric(metrics.amat)}<span class="m-unit">cyc</span></div></div>
            <div class="metric-box"><div class="m-label">NUMA Miss Rate</div><div class="m-value">${formatMetric(metrics.numaMiss)}<span class="m-unit">%</span></div></div>
            <div class="metric-box"><div class="m-label">TCP Retransmits</div><div class="m-value">${formatMetric(metrics.tcpRetrans)}<span class="m-unit">/s</span></div></div>
            <div class="metric-box"><div class="m-label">Uptime</div><div class="m-value" style="font-size:18px">${formatUptime(metrics.uptimeSeconds)}</div></div>
          </div>

          <div class="section-title">Pipeline Slot Allocation (TMA)</div>
          <div class="tma-bar">
            <div class="tma-seg" style="width:${metrics.tmaRetiring}%; background:#22c55e;"></div>
            <div class="tma-seg" style="width:${metrics.tmaBadSpec}%; background:#f97316;"></div>
            <div class="tma-seg" style="width:${metrics.tmaFrontEnd}%; background:#3b82f6;"></div>
            <div class="tma-seg" style="width:${metrics.tmaBackEnd}%; background:#ef4444;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:9px; font-family:'Roboto Mono', monospace; color:#64748b; text-transform:uppercase;">
            <span>Retiring: ${metrics.tmaRetiring}%</span>
            <span>Bad Spec: ${metrics.tmaBadSpec}%</span>
            <span>Front-End: ${metrics.tmaFrontEnd}%</span>
            <span>Back-End: ${metrics.tmaBackEnd}%</span>
          </div>

          ${upgradeSection}

          <div class="footer">
            <span>HQUD Quantitative Engine // Foundry Engine v2.7.0</span>
            <span>Classified: Confidential</span>
          </div>
        </div>
      </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 800);
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
           <span>Core v2.7.0</span>
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

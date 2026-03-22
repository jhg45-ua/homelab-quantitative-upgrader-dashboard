import { DatasheetCard } from '../components/DatasheetCard';
import type { MetricsState, SystemConfig } from '../types';
import { Download, Cpu, HardDrive, Server } from 'lucide-preact';
import { formatMetric, formatUptime } from '../utils/formatters';

interface Props {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
}

function generateAuditReport(metrics: MetricsState, config: SystemConfig | null) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const isoTs = now.toISOString();
  const nodeName = config?.node_name ?? 'Unknown';
  const hwDesc = config?.hardware_desc ?? 'Unknown';
  const cores = config?.specs.cores ?? 0;
  const peakMips = config?.specs.peak_mips ?? 0;
  const memBw = config?.specs.max_mem_bw_gbps ?? 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HQUD Audit Report — ${dateStr}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *  { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #111827; padding: 48px 56px; max-width: 960px; margin: 0 auto; font-size: 14px; line-height: 1.5; }
    
    .header { border-top: 6px solid #0F172A; padding-top: 22px; margin-bottom: 44px; }
    .title { font-weight: 800; font-size: 26px; letter-spacing: -0.04em; text-transform: uppercase; color: #0F172A; }
    .subtitle { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #6B7280; margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase; }
    
    .section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #6B7280; margin: 36px 0 14px 0; }
    
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px 32px; margin-bottom: 40px; padding: 20px 24px; background: #F9FAFB; border-left: 3px solid #0F172A; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; margin-bottom: 3px; }
    .meta-value { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: #111827; }

    /* Booktabs-style table: no vertical lines, thick top/bottom, thin header rule */
    table { width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
    thead tr { border-top: 2px solid #111827; border-bottom: 1px solid #111827; }
    th { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 10px 8px; text-align: left; color: #374151; border: none; }
    td { padding: 11px 8px; border: none; border-bottom: 1px solid #E5E7EB; color: #111827; }
    tbody tr:last-child { border-bottom: 2px solid #111827; }
    .num { text-align: right; }
    .unit { color: #6B7280; font-size: 11px; }
    
    .tma-bar { display: flex; height: 36px; border-radius: 2px; overflow: hidden; margin: 16px 0; }
    .tma-seg { display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .tma-legend { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
    .tma-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #374151; font-family: 'Inter', sans-serif; }
    .tma-dot { width: 10px; height: 10px; flex-shrink: 0; border-radius: 2px; }
    
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; font-family: 'JetBrains Mono', monospace; display: flex; justify-content: space-between; }
    
    @media print {
      body { padding: 32px 40px; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Hardware Quantitative Upgrader Dashboard</div>
    <div class="subtitle">Microarchitecture Audit Report &nbsp;// &nbsp;${isoTs}</div>
  </div>

  <div class="section-title">System Context</div>
  <div class="meta-grid">
    <div><div class="meta-label">Node Target</div><div class="meta-value">${nodeName}</div></div>
    <div><div class="meta-label">Hardware</div><div class="meta-value">${hwDesc}</div></div>
    <div><div class="meta-label">Uptime</div><div class="meta-value">${formatUptime(metrics.uptimeSeconds)}</div></div>
    <div><div class="meta-label">CPU Cores</div><div class="meta-value">${cores}</div></div>
    <div><div class="meta-label">Peak Throughput</div><div class="meta-value">${peakMips.toLocaleString()} MIPS</div></div>
    <div><div class="meta-label">Memory Bandwidth</div><div class="meta-value">${memBw} GB/s</div></div>
  </div>

  <div class="section-title">Telemetry Snapshot</div>
  <table>
    <thead><tr><th>Metric</th><th class="num">Value</th><th>Unit</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>Active Power</td><td class="num">${formatMetric(metrics.powerW)}</td><td class="unit">W</td><td>Total package draw (IPMI OOB)</td></tr>
      <tr><td>CPU Efficiency</td><td class="num">${formatMetric(metrics.ipsPerW / 1e6)}</td><td class="unit">M IPS/W</td><td>Instructions per watt</td></tr>
      <tr><td>CPI</td><td class="num">${formatMetric(metrics.cpi)}</td><td class="unit">cycles/instr</td><td>Ideal: &lt;1.0</td></tr>
      <tr><td>Memory AMAT</td><td class="num">${formatMetric(metrics.amat)}</td><td class="unit">cycles</td><td>Avg memory access time</td></tr>
      <tr><td>Cache Miss Rate</td><td class="num">${formatMetric(metrics.cacheMiss)}</td><td class="unit">%</td><td>eBPF PMU counters</td></tr>
      <tr><td>NUMA Miss Rate</td><td class="num">${formatMetric(metrics.numaMiss)}</td><td class="unit">%</td><td>Cross-NUMA-node fetches</td></tr>
      <tr><td>TCP Retransmits</td><td class="num">${formatMetric(metrics.tcpRetrans)}</td><td class="unit">/s</td><td>eBPF kprobe tcp_retransmit_skb</td></tr>
      <tr><td>Block Queue Depth</td><td class="num">${formatMetric(metrics.queueDepth)}</td><td class="unit">reqs</td><td>In-flight blk_mq requests</td></tr>
      <tr><td>Disk IOPS</td><td class="num">${formatMetric(metrics.iops)}</td><td class="unit">iops</td><td>Completions/s (eBPF)</td></tr>
    </tbody>
  </table>

  <div class="section-title" style="margin-top:36px">Top-Down Microarchitecture Analysis (TMA)</div>
  <div class="tma-bar">
    <div class="tma-seg" style="width:${metrics.tmaRetiring}%; background:#22c55e;">${metrics.tmaRetiring}%</div>
    <div class="tma-seg" style="width:${metrics.tmaBadSpec}%; background:#f97316;">${metrics.tmaBadSpec}%</div>
    <div class="tma-seg" style="width:${metrics.tmaFrontEnd}%; background:#3b82f6;">${metrics.tmaFrontEnd}%</div>
    <div class="tma-seg" style="width:${metrics.tmaBackEnd}%; background:#ef4444;">${metrics.tmaBackEnd}%</div>
  </div>
  <div class="tma-legend">
    <div class="tma-legend-item"><div class="tma-dot" style="background:#22c55e"></div> Retiring (${metrics.tmaRetiring}%)</div>
    <div class="tma-legend-item"><div class="tma-dot" style="background:#f97316"></div> Bad Speculation (${metrics.tmaBadSpec}%)</div>
    <div class="tma-legend-item"><div class="tma-dot" style="background:#3b82f6"></div> Front-End Bound (${metrics.tmaFrontEnd}%)</div>
    <div class="tma-legend-item"><div class="tma-dot" style="background:#ef4444"></div> Back-End Bound (${metrics.tmaBackEnd}%)</div>
  </div>

  <div class="footer">
    <span>HQUD Foundry v2.6.6 — Auto-generated</span>
    <span>${isoTs}</span>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 800);
  }
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
          onClick={() => generateAuditReport(metrics, systemConfig)}
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
             <DatasheetCard title="ACTIVE POWER" value={metrics.powerW !== null ? formatMetric(metrics.powerW) : '-'} unit="W" footer="Total Package Draw" />
             <DatasheetCard title="CPU EFFICIENCY" value={metrics.ipsPerW !== null ? formatMetric(metrics.ipsPerW / 1e6) : '-'} unit="M IPS/W" footer="Instr. per Watt" valueColor="text-teal-400" />
             <DatasheetCard title="MEMORY AMAT" value={metrics.amat !== null ? formatMetric(metrics.amat) : '-'} unit="cyc" footer="Avg Mem Access Time" />
             <DatasheetCard title="NUMA MISS RATE" value={metrics.numaMiss !== null ? formatMetric(metrics.numaMiss) : '-'} unit="%" footer="Cross-node Fetches" />

             {/* v2.6.2: Strict !== null guard — treats 0 as valid */}
             <div className="bg-slate-800 border border-slate-700 p-4">
               <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">TCP RETRANSMITS</div>
               <div className="text-4xl font-mono text-white">
                 {metrics.tcpRetrans !== null ? formatMetric(metrics.tcpRetrans) : '-'}
                 <span className="text-sm text-slate-400 ml-1">/s</span>
               </div>
               <div className="text-[9px] text-slate-500 mt-2">Network Reliability</div>
             </div>

             {/* v2.6.2: Strict !== null guard for Uptime */}
             <div className="bg-slate-800 border border-slate-700 p-4">
               <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">SYSTEM UPTIME</div>
               <div className="text-4xl font-mono text-teal-400">
                 {metrics.uptimeSeconds !== null ? formatUptime(metrics.uptimeSeconds) : '-'}
               </div>
               <div className="text-[9px] text-slate-500 mt-2">Dependability</div>
             </div>
          </div>
        </div>

        <div>
          <h3 className="text-slate-400 font-mono uppercase tracking-widest text-xs mb-3">System Configuration Metadata</h3>
          <div className="bg-slate-800 border border-slate-700 p-4 md:p-6 text-slate-300">
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

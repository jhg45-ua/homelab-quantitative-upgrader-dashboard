import type { MetricsState, SystemConfig } from '../types';
import { FileText, Cpu, Server } from 'lucide-preact';
import { formatMetric, formatUptime } from '../utils/formatters';
import { InfoTooltip } from '../components/UI/InfoTooltip';

interface Props {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
}

const APP_VERSION = "v2.7.10";

/**
 * Escape HTML special characters to prevent XSS in generated reports.
 * Safely converts user-controlled strings before injecting into HTML templates.
 */
function escapeHtml(text: string): string {
  const elem = document.createElement('div');
  elem.textContent = text;
  return elem.innerHTML;
}

function generateAuditReport(metrics: MetricsState, config: SystemConfig | null) {
  const now = new Date();
  const dateStr = escapeHtml(now.toISOString().split('T')[0]);
  const isoTs = escapeHtml(now.toISOString());
  const nodeName = escapeHtml(config?.node_name ?? 'r720-baremetal');
  const hwDesc = escapeHtml(config?.hardware_desc ?? 'Dell PowerEdge R720 (2x Intel Xeon E5-2670)');
  const cores = config?.specs.cores ?? 16;
  const peakMips = config?.specs.peak_mips ?? 166400;
  const memBw = config?.specs.max_mem_bw_gbps ?? 102.4;

  // --- Hardware Upgrade Recommendation Engine (v2.6.6 Logic) ---
  const cpi = metrics.cpi;
  const amat = metrics.amat;
  const queueDepth = metrics.queueDepth ?? 0;
  const iops = metrics.iops ?? 0;
  // Little's Law calculation for inferred latency
  const inferredLatencyMs = iops > 0 ? (queueDepth / iops) * 1000 : 0;

  const cpuRec = cpi > 1.2
    ? `<tr><td>CPU Subsystem</td><td>High CPI (${formatMetric(cpi)}). Pipeline stalls detected. Consider upgrading to a modern µArch or vectorizing hot workloads.</td><td class="badge-warn">UPGRADE RECOMMENDED</td></tr>`
    : `<tr><td>CPU Subsystem</td><td>Efficient CPI (${formatMetric(cpi)}). No immediate upgrade needed.</td><td class="badge-ok">OPTIMAL</td></tr>`;

  const memRec = amat > 15
    ? `<tr style="background: #fffbeb"><td>Memory / NUMA</td><td>High AMAT (${formatMetric(amat)} cyc). Consider higher-speed ECC RAM or strict NUMA CPU pinning via cpuset.</td><td class="badge-warn" style="color:#D97706">TUNING REQUIRED</td></tr>`
    : `<tr><td>Memory / NUMA</td><td>AMAT is healthy (${formatMetric(amat)} cyc). Memory hierarchy within spec.</td><td class="badge-ok">OPTIMAL</td></tr>`;

  const ioRec = queueDepth > 5 && inferredLatencyMs > 20
    ? `<tr><td>Storage I/O</td><td>Disk bottleneck detected. Little's Law W ≈ ${inferredLatencyMs.toFixed(1)} ms. NVMe upgrade strongly recommended.</td><td class="badge-crit">UPGRADE RECOMMENDED</td></tr>`
    : `<tr><td>Storage I/O</td><td>I/O latency within acceptable bounds (W ≈ ${inferredLatencyMs.toFixed(1)} ms). No storage upgrade needed.</td><td class="badge-ok">OPTIMAL</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HQUD Audit Report — ${dateStr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 60px; max-width: 1000px; margin: 0 auto; background: #fff; line-height: 1.4; }
    
    .header { border-bottom: 5px solid #0f172a; padding-bottom: 25px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-weight: 900; font-size: 32px; letter-spacing: -1.5px; text-transform: uppercase; color: #0f172a; }
    .subtitle { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #64748b; margin-top: 5px; letter-spacing: 0.1em; text-transform: uppercase; }
    
    .section-title { font-size: 11px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #64748b; margin: 35px 0 15px 0; }
    
    .context-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; margin-bottom: 30px; }
    .context-item { background: #f8fafc; padding: 15px 20px; }
    .context-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; font-weight: 800; }
    .context-value { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: #334155; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; padding: 12px 10px; border-bottom: 2px solid #0f172a; font-weight: 900; }
    td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .val { font-weight: 700; color: #0f172a; }
    .unit { color: #64748b; font-size: 10px; }
    
    .tma-container { margin: 25px 0; }
    .tma-bar { display: flex; height: 40px; border-radius: 4px; overflow: hidden; margin-bottom: 12px; border: 1px solid #e2e8f0; }
    .tma-seg { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 900; font-family: 'JetBrains Mono', monospace; }
    .tma-legend { display: flex; justify-content: space-between; gap: 10px; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .dot { width: 10px; height: 10px; border-radius: 2px; }

    .badge-ok { font-weight: 900; color: #059669; }
    .badge-warn { font-weight: 900; color: #D97706; }
    .badge-crit { font-weight: 900; color: #DC2626; }
    
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #94a3b8; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Hardware Quantitative Upgrader Dashboard</div>
      <div class="subtitle">Microarchitecture Audit Report // ${isoTs}</div>
    </div>
  </div>

  <div class="section-title">System Context</div>
  <div class="context-grid">
    <div class="context-item"><div class="context-label">Node Target</div><div class="context-value">${nodeName}</div></div>
    <div class="context-item"><div class="context-label">Hardware</div><div class="context-value">${hwDesc}</div></div>
    <div class="context-item"><div class="context-label">Uptime</div><div class="context-value">${formatUptime(metrics.uptimeSeconds)}</div></div>
    <div class="context-item"><div class="context-label">CPU Cores</div><div class="context-value">${cores}</div></div>
    <div class="context-item"><div class="context-label">Peak Throughput</div><div class="context-value">${peakMips.toLocaleString()} MIPS</div></div>
    <div class="context-item"><div class="context-label">Memory Bandwidth</div><div class="context-value">${memBw} GB/s</div></div>
  </div>

  <div class="section-title">Telemetry Snapshot</div>
  <table>
    <thead><tr><th>Metric</th><th>Value</th><th>Unit</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>Active Power</td><td class="val">${formatMetric(metrics.powerW)}</td><td class="unit">W</td><td>Total package draw (IPMI OOB)</td></tr>
      <tr><td>CPU Efficiency</td><td class="val">${formatMetric(metrics.ipsPerW / 1e6)}</td><td class="unit">M IPS/W</td><td>Instructions per watt</td></tr>
      <tr><td>CPI</td><td class="val">${formatMetric(metrics.cpi)}</td><td class="unit">cycles/instr</td><td>Ideal: &lt;1.0</td></tr>
      <tr><td>Memory AMAT</td><td class="val">${formatMetric(metrics.amat)}</td><td class="unit">cycles</td><td>Avg memory access time</td></tr>
      <tr><td>Cache Miss Rate</td><td class="val">${formatMetric(metrics.cacheMiss)}</td><td class="unit">%</td><td>eBPF PMU counters</td></tr>
      <tr><td>NUMA Miss Rate</td><td class="val">${formatMetric(metrics.numaMiss)}</td><td class="unit">%</td><td>Cross-NUMA-node fetches</td></tr>
      <tr><td>TCP Retransmits</td><td class="val">${formatMetric(metrics.tcpRetrans)}</td><td class="unit">/s</td><td>eBPF kprobe top_retransmit_skb</td></tr>
      <tr><td>Block Queue Depth</td><td class="val">${formatMetric(metrics.queueDepth)}</td><td class="unit">reqs</td><td>In-flight blk_mq requests</td></tr>
      <tr><td>Disk IOPS</td><td class="val">${formatMetric(metrics.iops)}</td><td class="unit">iops</td><td>Completions/s (eBPF)</td></tr>
    </tbody>
  </table>

  <div class="section-title">Top-Down Microarchitecture Analysis (TMA)</div>
  <div class="tma-container">
    <div class="tma-bar">
      <div class="tma-seg" style="width:${metrics.tmaRetiring}%; background:#22c55e;">${metrics.tmaRetiring}%</div>
      <div class="tma-seg" style="width:${metrics.tmaBadSpec}%; background:#f97316;">${metrics.tmaBadSpec}%</div>
      <div class="tma-seg" style="width:${metrics.tmaFrontEnd}%; background:#3b82f6;">${metrics.tmaFrontEnd}%</div>
      <div class="tma-seg" style="width:${metrics.tmaBackEnd}%; background:#ef4444;">${metrics.tmaBackEnd}%</div>
    </div>
    <div class="tma-legend">
      <div class="legend-item"><div class="dot" style="background:#22c55e"></div> Retiring (${metrics.tmaRetiring}%)</div>
      <div class="legend-item"><div class="dot" style="background:#f97316"></div> Bad Speculation (${metrics.tmaBadSpec}%)</div>
      <div class="legend-item"><div class="dot" style="background:#3b82f6"></div> Front-End Bound (${metrics.tmaFrontEnd}%)</div>
      <div class="legend-item"><div class="dot" style="background:#ef4444"></div> Back-End Bound (${metrics.tmaBackEnd}%)</div>
    </div>
  </div>

  <div class="section-title">Hardware Upgrade Analysis</div>
  <table>
    <thead><tr><th>Subsystem</th><th>Assessment</th><th>Verdict</th></tr></thead>
    <tbody>
      ${cpuRec}
      ${memRec}
      ${ioRec}
    </tbody>
  </table>

  <div class="footer">
    <span>HQUD Foundry ${APP_VERSION} — Auto-generated</span>
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
          headerRight={
            <InfoTooltip
              title="Active Power"
              shortSummary="Total package draw in watts. Rising power with flat throughput indicates efficiency loss."
              wikiHash="#roofline"
            />
          }
        />
        <DatasheetCard 
          title="CPU EFFICIENCY" 
          value={metrics.ipsPerW !== null ? formatMetric(metrics.ipsPerW / 1e6) : '-'} 
          unit="M IPS/W" 
          footer="Instr. per Watt" 
          valueColor="text-teal-400" 
          headerRight={
            <InfoTooltip
              title="CPU Efficiency"
              shortSummary="Instructions per watt. Higher values mean better performance under a fixed power envelope."
              wikiHash="#roofline"
            />
          }
        />
        <DatasheetCard 
          title="MEMORY AMAT" 
          value={metrics.amat !== null ? formatMetric(metrics.amat) : '-'} 
          unit="cyc" 
          footer="Avg Mem Access Time" 
          headerRight={
            <InfoTooltip
              title="AMAT"
              shortSummary="Average Memory Access Time calculates the cost of cache misses."
              wikiHash="#amat"
            />
          }
        />
        <DatasheetCard 
          title="NUMA MISS RATE" 
          value={metrics.numaMiss !== null ? formatMetric(metrics.numaMiss) : '-'} 
          unit="%" 
          footer="Cross-node Fetches" 
          headerRight={
            <InfoTooltip
              title="NUMA Miss Rate"
              shortSummary="Percentage of memory requests that cross NUMA nodes, increasing latency and interconnect pressure."
              wikiHash="#amat"
            />
          }
        />
        <DatasheetCard 
          title="TCP RETRANSMITS" 
          value={metrics.tcpRetrans !== null ? formatMetric(metrics.tcpRetrans) : '-'} 
          unit="/s" 
          footer="Network Reliability" 
          headerRight={
            <InfoTooltip
              title="TCP Retransmits"
              shortSummary="Packets resent due to drops or reordering. Persistent elevation often correlates with queue pressure."
              wikiHash="#littles"
            />
          }
        />
        <DatasheetCard 
          title="SYSTEM UPTIME" 
          value={metrics.uptimeSeconds !== null ? formatUptime(metrics.uptimeSeconds) : '-'} 
          unit="" 
          footer="Node Dependability" 
          valueColor="text-emerald-400"
          headerRight={
            <InfoTooltip
              title="System Uptime"
              shortSummary="Continuous service time. Useful for correlating stability incidents with thermal, memory, or I/O trends."
              wikiHash="#cpi"
            />
          }
        />
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] font-black mb-6 flex items-center gap-4">
           <span>Core v2.7.10</span>
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

interface DatasheetCardProps {
  title: string;
  value: string | number;
  unit: string;
  footer: string;
  valueColor?: string;
  headerRight?: any;
}

function DatasheetCard({ title, value, unit, footer, valueColor = "text-slate-100", headerRight = null }: DatasheetCardProps) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 p-8 flex flex-col justify-between group hover:border-teal-500/30 transition-all backdrop-blur-sm shadow-xl">
      <div>
        <div className="text-slate-400 text-[10px] font-mono font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-500 group-hover:bg-teal-400 transition-colors"></div>
            {title}
          </div>
          {headerRight}
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

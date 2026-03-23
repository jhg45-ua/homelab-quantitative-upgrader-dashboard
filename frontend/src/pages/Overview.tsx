import type { MetricsState, SystemConfig } from '../types';
import { useState } from 'preact/hooks';
import { FileText, Cpu, Server } from 'lucide-preact';
import { formatMetric, formatUptime } from '../utils/formatters';
import { InfoTooltip } from '../components/UI/InfoTooltip';
import { downloadAuditReport } from '../utils/pdfGenerator';
import { AuditReportTemplate } from '../components/AuditReportTemplate';

interface Props {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
}

const APP_VERSION = "v2.8.0 RC3";

export function Overview({ metrics, systemConfig }: Props) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  async function handleAuditReportDownload() {
    if (isGeneratingReport) {
      return;
    }

    setIsGeneratingReport(true);
    try {
      await downloadAuditReport('hqud-pdf-report');
    } catch (error) {
      console.error('Failed to generate audit report PDF:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  }

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
          onClick={handleAuditReportDownload}
          disabled={isGeneratingReport}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGeneratingReport ? (
            <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <FileText size={14} />
          )}
          {isGeneratingReport ? 'Generating...' : 'Export Audit Report (PDF)'}
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
           <span>Core v2.8.0 RC3</span>
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

      <AuditReportTemplate metrics={metrics} systemConfig={systemConfig} appVersion={APP_VERSION} />
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

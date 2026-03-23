import { lazy, Suspense } from 'preact/compat';
import { RooflineChart } from '../components/RooflineChart';
import { TMAChart } from '../components/TMAChart';
import { AmdahlChart } from '../components/AmdahlChart';
import { TimelineChart } from '../components/TimelineChart';
import { ComboChart } from '../components/ComboChart';
import { VisualNumaTopology } from '../components/DeepDive/VisualNumaTopology';
import { PanelHeader } from '../components/UI/PanelHeader';
import { InfoTooltip } from '../components/UI/InfoTooltip';
import type { MetricsState, HistoryFrame, SystemConfig } from '../types';
import { formatMetric } from '../utils/formatters';

// Lazy-loaded Heatmap component to reduce initial bundle
const Heatmap = lazy(() => import('../components/Heatmap').then(m => ({ default: m.Heatmap })));

interface Props {
  metrics: MetricsState;
  history: HistoryFrame[];
  systemConfig: SystemConfig | null;
}

export function DeepDive({ metrics, history, systemConfig }: Props) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 md:gap-6 px-4 md:px-6">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-100 uppercase">
            Scientific Deep Dive
          </h2>
          <span className="text-[10px] font-mono text-teal-400 bg-teal-400/10 border border-teal-500/30 px-4 py-2 uppercase tracking-widest font-black hidden md:block">Real-time µArch Analysis</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Renderer: Native SVG // No ECharts</div>
      </header>

      <div className="w-full bg-slate-800/40 border border-slate-700/50 p-6 md:p-7 flex flex-col h-[560px] backdrop-blur-sm shadow-xl relative group overflow-hidden">
          <PanelHeader
            title="Architecture Roofline"
            shortSummary="Maps operational intensity versus achievable throughput to identify memory-bound versus compute-bound workloads."
            wikiHash="#roofline"
            titleClassName="group-hover:text-teal-400 transition-colors"
            rightSlot={
              <div className="flex gap-6">
                <span className="text-teal-400">▬ Mem BW</span>
                <span className="text-red-500">▬ Peak Comp</span>
              </div>
            }
          />
           <div className="flex-1 bg-[#0F172A]/30 border border-slate-800/50">
             <RooflineChart 
                ips={metrics.ips} 
                cacheMiss={metrics.cacheMiss} 
                peakMips={systemConfig?.specs.peak_mips} 
                memBwGbps={systemConfig?.specs.max_mem_bw_gbps} 
             />
           </div>
      </div>

      <div className="w-full bg-slate-800/40 border border-slate-700/50 flex flex-col h-[560px] backdrop-blur-sm shadow-xl overflow-hidden">
         <Suspense fallback={
           <div className="flex items-center justify-center h-full">
             <div className="text-center">
               <div className="inline-block p-4 border border-slate-700 rounded-sm bg-slate-800/50 mb-4">
                 <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
               <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Loading Heatmap...</p>
             </div>
           </div>
         }>
           <Heatmap />
         </Suspense>
      </div>

      <div className="w-full bg-slate-800/40 border border-slate-700/50 p-6 md:p-7 flex flex-col h-[460px] backdrop-blur-sm shadow-xl overflow-hidden">
          <PanelHeader
            title="TMA Pipeline Breakdown"
            shortSummary="Top-down slot decomposition of the pipeline to isolate retiring work versus front-end, speculation, and back-end stalls."
            wikiHash="#tma"
            rightSlot={
              <div className="flex gap-4">
                <span className="text-green-500">■ Retiring</span>
                <span className="text-orange-500">■ Bad Spec</span>
                <span className="text-blue-500">■ Front-End</span>
                <span className="text-red-500">■ Back-End</span>
              </div>
            }
          />
          <div className="flex-1">
            <TMAChart metrics={metrics} />
          </div>
      </div>

      <div className="w-full bg-slate-800/40 border border-slate-700/50 flex flex-col h-[460px] backdrop-blur-sm shadow-xl overflow-hidden">
        <AmdahlChart history={history} />
      </div>

      <div className="w-full bg-slate-800/40 border border-slate-700/50 flex flex-col h-[460px] backdrop-blur-sm shadow-xl overflow-hidden">
        <TimelineChart history={history} />
      </div>

      <div className="w-full bg-slate-800/40 border border-slate-700/50 flex flex-col h-[460px] backdrop-blur-sm shadow-xl overflow-hidden">
        <ComboChart history={history} />
      </div>

      <div className="w-full bg-slate-800/40 border border-slate-700/50 p-6 md:p-7 flex flex-col min-h-[480px] h-auto backdrop-blur-sm shadow-xl overflow-hidden">
        <VisualNumaTopology metrics={metrics} />
      </div>

      {/* Little's Law Section - Balanced Premium Proportion */}
      <div className="bg-slate-950/40 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="px-10 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
           <div className="flex items-center gap-6">
              <div className="w-3 h-3 bg-teal-500 shadow-[0_0_15px_#14b8a6]"></div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-[0.35em] text-white">Queueing Theory Pipeline Assessment</h3>
                <InfoTooltip
                  title="Queueing Theory"
                  shortSummary="Applies Little's Law (L = lambda x W) to estimate residency time from queue depth and arrival rate."
                  wikiHash="#littles"
                />
              </div>
           </div>
           <span className="text-[10px] font-mono text-slate-600 font-bold tracking-[0.3em] uppercase">L = λ × W</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="p-10 md:p-12 flex flex-col items-center justify-center group overflow-hidden relative">
              <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/5 transition-colors duration-500"></div>
              <div className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest mb-6 border-b border-slate-800 pb-2">Arrival Rate (λ)</div>
              <div className="text-5xl md:text-6xl font-black text-slate-100 tracking-tighter tabular-nums drop-shadow-md">{formatMetric(metrics.iops)}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-4 font-bold uppercase tracking-widest">IOPS / SEC</div>
           </div>
            <div className="p-10 md:p-12 flex flex-col items-center justify-center group overflow-hidden relative">
              <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors duration-500"></div>
              <div className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest mb-6 border-b border-slate-800 pb-2">Mean Occupancy (L)</div>
              <div className="text-5xl md:text-6xl font-black text-slate-100 tracking-tighter tabular-nums drop-shadow-md">{formatMetric(metrics.queueDepth)}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-4 font-bold uppercase tracking-widest">In-Flight Reqs</div>
           </div>
            <div className="p-10 md:p-12 flex flex-col items-center justify-center group overflow-hidden relative">
              <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/5 transition-colors duration-500"></div>
              <div className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest mb-6 border-b border-slate-800 pb-2">Residency (W)</div>
              <div className="text-5xl md:text-6xl font-black text-teal-400 tracking-tighter tabular-nums drop-shadow-md">
                {metrics.iops > 0 ? formatMetric((metrics.queueDepth / metrics.iops) * 1000) : '0.00'}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-4 font-bold uppercase tracking-widest">MS / COMPLETION</div>
           </div>
        </div>
      </div>
      
      {/* Footer Buffer */}
      <div className="h-10"></div>
    </div>
  );
}

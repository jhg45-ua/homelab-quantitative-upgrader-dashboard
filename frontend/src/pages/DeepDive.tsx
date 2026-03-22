import { Heatmap } from '../components/Heatmap';
import { ComboChart } from '../components/ComboChart';
import { TimelineChart } from '../components/TimelineChart';
import { RooflineChart } from '../components/RooflineChart';
import { TMAChart } from '../components/TMAChart';
import { AmdahlChart } from '../components/AmdahlChart';
import type { MetricsState, HistoryFrame, SystemConfig } from '../types';
import { formatMetric } from '../utils/formatters';

interface Props {
  metrics: MetricsState;
  history: HistoryFrame[];
  systemConfig: SystemConfig | null;
}

export function DeepDive({ metrics, history, systemConfig }: Props) {
  return (
    <div className="flex flex-col h-full bg-slate-900">
      <header className="bg-slate-900 border-b border-slate-800 px-8 md:px-12 py-8 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
           <h2 className="text-2xl md:text-4xl font-extrabold tracking-tighter text-slate-100 uppercase line-clamp-1">
             Scientific Deep Dive
           </h2>
           <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/50 text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-sm hidden md:block">
             Real-time µArch Analysis
           </span>
        </div>
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest font-bold">
           Renderer: Native SVG // No ECharts
        </span>
      </header>

      <div className="flex-1 w-full h-full p-8 md:p-12 xl:p-16 flex flex-col gap-12 overflow-y-auto">
         
         {/* Row 1: Roofline + Heatmap */}
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <div className="min-h-[600px] h-[780px] bg-slate-800/40 border border-slate-700 backdrop-blur-sm p-4">
               <RooflineChart ips={metrics.ips} cacheMiss={metrics.cacheMiss} peakMips={systemConfig?.specs.peak_mips} memBwGbps={systemConfig?.specs.max_mem_bw_gbps} />
            </div>
            <div className="min-h-[600px] h-[780px] bg-slate-800/40 border border-slate-700 backdrop-blur-sm p-4">
               <Heatmap />
            </div>
         </div>

         {/* Row 2: TMA + Amdahl */}
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <div className="h-[400px] bg-slate-800/40 border border-slate-700 backdrop-blur-sm p-8">
               <TMAChart metrics={metrics} />
            </div>
            <div className="h-[400px] bg-slate-800/40 border border-slate-700 backdrop-blur-sm p-8">
               <AmdahlChart history={history} />
            </div>
         </div>

         {/* Row 3: Little's Law Panel + Mini charts */}
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 pb-24">
            {/* Little's Law: L = λW */}
            <div className="bg-slate-800/40 border border-slate-700 flex flex-col backdrop-blur-sm">
              <div className="px-8 py-6 border-b border-slate-700 bg-slate-800/50 shrink-0 flex items-center justify-between">
                <h3 className="text-sm font-black tracking-[0.2em] text-slate-300 uppercase">Little's Law: L = λW</h3>
                <span className="text-xs font-mono text-amber-400 border border-amber-500/40 px-4 py-1.5 bg-amber-500/10 font-black tracking-widest">IN-FLIGHT LATENCY</span>
              </div>
              <div className="flex-1 flex items-center justify-around p-16 gap-8">
                {(() => {
                  const L = metrics.queueDepth ?? 0;
                  const lambda = metrics.iops ?? 0;
                  const W = lambda > 0 ? (L / lambda) * 1000 : 0;
                  return (
                    <>
                      <div className="text-center">
                        <div className="text-7xl md:text-9xl font-mono text-slate-100 font-black tracking-tighter">{metrics.queueDepth !== null ? formatMetric(L) : '-'}</div>
                        <div className="text-sm font-mono text-slate-500 mt-4 uppercase tracking-[0.2em] font-bold">L (Queue)</div>
                      </div>
                      <div className="text-slate-600 text-6xl font-mono font-black">=</div>
                      <div className="text-center">
                        <div className="text-7xl md:text-9xl font-mono text-slate-100 font-black tracking-tighter">{metrics.iops !== null ? formatMetric(lambda) : '-'}</div>
                        <div className="text-sm font-mono text-slate-500 mt-4 uppercase tracking-[0.2em] font-bold">λ (IOPS)</div>
                      </div>
                      <div className="text-slate-600 text-6xl font-mono font-black">×</div>
                      <div className="text-center">
                        <div className="text-7xl md:text-9xl font-mono text-teal-400 font-black tracking-tighter">{formatMetric(W)}<span className="text-3xl ml-4 text-teal-600 font-bold">ms</span></div>
                        <div className="text-sm font-mono text-teal-600 mt-4 uppercase tracking-[0.2em] font-bold">W (Latency)</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Mini charts side by side */}
            <div className="grid grid-cols-2 gap-12">
              <div className="h-[400px] bg-slate-800/40 border border-slate-700 backdrop-blur-sm p-4">
                 <TimelineChart history={history} />
              </div>
              <div className="h-[400px] bg-slate-800/40 border border-slate-700 backdrop-blur-sm p-4">
                 <ComboChart history={history} />
              </div>
            </div>
         </div>

      </div>
    </div>
  );
}

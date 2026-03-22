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
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-3 shrink-0 flex items-center justify-between sticky top-0 z-20">
        <h2 className="text-sm md:text-lg font-semibold tracking-wider text-slate-300 uppercase">
          Scientific Deep Dive
        </h2>
        <span className="text-[9px] font-mono text-slate-500 border border-slate-700 px-2 py-1 bg-slate-800">
           RENDERER: NATIVE SVG
        </span>
      </header>

      <div className="flex-1 w-full h-full flex flex-col gap-6 overflow-y-auto">
         
         {/* Row 1: Roofline + Heatmap */}
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="min-h-[480px] h-[520px]">
               <RooflineChart ips={metrics.ips} cacheMiss={metrics.cacheMiss} peakMips={systemConfig?.specs.peak_mips} memBwGbps={systemConfig?.specs.max_mem_bw_gbps} />
            </div>
            <div className="min-h-[480px] h-[520px]">
               <Heatmap />
            </div>
         </div>

         {/* Row 2: TMA + Amdahl */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64">
               <TMAChart metrics={metrics} />
            </div>
            <div className="h-64">
               <AmdahlChart history={history} />
            </div>
         </div>

         {/* Row 3: Little's Law Panel + Mini charts */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
            {/* Little's Law: L = λW */}
            <div className="bg-slate-800 border border-slate-700 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 shrink-0 flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-widest text-slate-300 uppercase">Little's Law: L = λW</h3>
                <span className="text-[10px] font-mono text-amber-400 border border-amber-500/40 px-2 py-0.5 bg-amber-500/10 font-bold">IN-FLIGHT LATENCY</span>
              </div>
              <div className="flex-1 flex items-center justify-around p-8 gap-4">
                {(() => {
                  const L = metrics.queueDepth ?? 0;
                  const lambda = metrics.iops ?? 0;
                  const W = lambda > 0 ? (L / lambda) * 1000 : 0;
                  return (
                    <>
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl font-mono text-white font-bold">{metrics.queueDepth !== null ? formatMetric(L) : '-'}</div>
                        <div className="text-xs font-mono text-slate-500 mt-2 uppercase tracking-widest">L (Queue)</div>
                      </div>
                      <div className="text-slate-600 text-3xl font-mono">=</div>
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl font-mono text-white font-bold">{metrics.iops !== null ? formatMetric(lambda) : '-'}</div>
                        <div className="text-xs font-mono text-slate-500 mt-2 uppercase tracking-widest">λ (IOPS)</div>
                      </div>
                      <div className="text-slate-600 text-3xl font-mono">×</div>
                      <div className="text-center">
                        <div className="text-4xl md:text-5xl font-mono text-teal-400 font-bold">{formatMetric(W)}<span className="text-lg ml-1">ms</span></div>
                        <div className="text-xs font-mono text-teal-600 mt-2 uppercase tracking-widest">W (Latency)</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Mini charts side by side */}
            <div className="grid grid-cols-2 gap-6">
              <div className="h-48 md:h-64">
                 <TimelineChart history={history} />
              </div>
              <div className="h-48 md:h-64">
                 <ComboChart history={history} />
              </div>
            </div>
         </div>

      </div>
    </div>
  );
}

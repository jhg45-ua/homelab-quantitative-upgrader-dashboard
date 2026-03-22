import { Heatmap } from '../components/Heatmap';
import { ComboChart } from '../components/ComboChart';
import { TimelineChart } from '../components/TimelineChart';
import { RooflineChart } from '../components/RooflineChart';
import { TMAChart } from '../components/TMAChart';
import { AmdahlChart } from '../components/AmdahlChart';
import type { MetricsState, HistoryFrame, SystemConfig } from '../types';

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

      <div className="p-2 md:p-4 flex-1 flex flex-col gap-3 w-full max-w-[1800px] mx-auto">
         
         {/* Row 1: Roofline + Heatmap */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="h-72 md:h-[420px]">
               <RooflineChart ips={metrics.ips} cacheMiss={metrics.cacheMiss} peakMips={systemConfig?.specs.peak_mips} memBwGbps={systemConfig?.specs.max_mem_bw_gbps} />
            </div>
            <div className="h-72 md:h-[420px]">
               <Heatmap />
            </div>
         </div>

         {/* Row 2: TMA + Amdahl */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="h-48 md:h-56">
               <TMAChart metrics={metrics} />
            </div>
            <div className="h-48 md:h-56">
               <AmdahlChart history={history} />
            </div>
         </div>

         {/* Row 3: Little's Law Cards + Timeline + Combo */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-8">
            {/* Little's Law numeric cards */}
            <div className="bg-slate-800 border border-slate-700 flex flex-col">
              <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 shrink-0">
                <h3 className="text-[9px] md:text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Queue Depth (blk_mq)</h3>
              </div>
              <div className="flex-1 flex items-center justify-center p-3 text-center">
                <span className="text-3xl md:text-4xl font-mono text-teal-400 leading-none">
                  {metrics.queueDepth !== undefined ? metrics.queueDepth.toFixed(2) : '—'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 ml-2 uppercase self-end mb-1">reqs</span>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 flex flex-col">
              <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 shrink-0">
                <h3 className="text-[9px] md:text-[10px] font-semibold tracking-widest text-slate-400 uppercase">IOPS (Real)</h3>
              </div>
              <div className="flex-1 flex items-center justify-center p-3 text-center">
                <span className="text-3xl md:text-4xl font-mono text-slate-100 leading-none">
                  {metrics.iops !== undefined ? metrics.iops.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 ml-2 uppercase self-end mb-1">iops</span>
              </div>
            </div>
            {/* Mini charts */}
            <div className="h-40 md:h-48">
               <TimelineChart history={history} />
            </div>
            <div className="h-40 md:h-48">
               <ComboChart history={history} />
            </div>
         </div>

      </div>
    </div>
  );
}

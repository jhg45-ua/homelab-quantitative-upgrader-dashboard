import { Heatmap } from '../components/Heatmap';
import { ComboChart } from '../components/ComboChart';
import { TimelineChart } from '../components/TimelineChart';
import { RooflineChart } from '../components/RooflineChart';
import type { MetricsState, HistoryFrame } from '../types';

interface Props {
  metrics: MetricsState;
  history: HistoryFrame[];
}

export function DeepDive({ metrics, history }: Props) {
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

      <div className="p-2 md:p-4 flex-1 flex flex-col gap-4 w-full max-w-[1800px] mx-auto">
         {/* ECharts SVG Rendered Grids */}
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-72 md:h-[450px]">
               <RooflineChart ips={metrics.ips} cacheMiss={metrics.cacheMiss} />
            </div>
            <div className="h-72 md:h-[450px]">
               <Heatmap />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
            <div className="h-64 md:h-80">
               <TimelineChart history={history} />
            </div>
            <div className="h-64 md:h-80">
               <ComboChart history={history} />
            </div>
         </div>

      </div>
    </div>
  );
}

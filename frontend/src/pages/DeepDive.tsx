import { Heatmap } from '../components/Heatmap';
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
    <div className="flex flex-col gap-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-baseline justify-between gap-6 px-4">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-100 uppercase">
            Scientific Deep Dive
          </h2>
          <span className="text-[10px] font-mono text-teal-400 bg-teal-400/10 border border-teal-500/30 px-4 py-2 uppercase tracking-widest font-black hidden md:block">Real-time µArch Analysis</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Renderer: Native SVG // No ECharts</div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="bg-slate-800/40 border border-slate-700/50 p-8 flex flex-col h-[650px] backdrop-blur-sm shadow-xl relative group">
           <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-6 font-black flex items-center justify-between">
              <span className="group-hover:text-teal-400 transition-colors">Architecture Roofline</span>
              <div className="flex gap-6">
                <span className="text-teal-400">▬ Mem BW</span>
                <span className="text-red-500">▬ Peak Comp</span>
              </div>
           </div>
           <div className="flex-1 bg-[#0F172A]/30 border border-slate-800/50">
             <RooflineChart 
                ips={metrics.ips} 
                cacheMiss={metrics.cacheMiss} 
                peakMips={systemConfig?.specs.peak_mips} 
                memBwGbps={systemConfig?.specs.max_mem_bw_gbps} 
             />
           </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 flex flex-col h-[650px] backdrop-blur-sm shadow-xl overflow-hidden">
           <Heatmap />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-slate-800/40 border border-slate-700/50 p-8 flex flex-col h-[380px] backdrop-blur-sm shadow-xl">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-6 font-black flex items-center justify-between">
            <span>TMA Pipeline Breakdown</span>
            <div className="flex gap-4">
              <span className="text-green-500">■ Retiring</span>
              <span className="text-orange-500">■ Bad Spec</span>
              <span className="text-blue-500">■ Front-End</span>
              <span className="text-red-500">■ Back-End</span>
            </div>
          </div>
          <div className="flex-1">
            <TMAChart metrics={metrics} />
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-8 flex flex-col h-[380px] backdrop-blur-sm shadow-xl">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-6 font-black flex items-center justify-between">
            <span>Amdahl Lock Contention</span>
            <span className="text-teal-400 bg-teal-400/5 px-4 py-1.5 border border-teal-500/20 uppercase tracking-widest text-[9px]">Mutex Wait Distribution</span>
          </div>
          <div className="flex-1">
            <AmdahlChart history={history} />
          </div>
        </div>
      </div>

      {/* Little's Law Section - Balanced Premium Proportion */}
      <div className="bg-slate-950/40 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="px-10 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
           <div className="flex items-center gap-6">
              <div className="w-3 h-3 bg-teal-500 shadow-[0_0_15px_#14b8a6]"></div>
              <h3 className="text-base font-black uppercase tracking-[0.35em] text-white">Queueing Theory Pipeline Assessment</h3>
           </div>
           <span className="text-[10px] font-mono text-slate-600 font-bold tracking-[0.3em] uppercase">L = λ × W</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
           <div className="p-12 flex flex-col items-center justify-center group overflow-hidden relative">
              <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/5 transition-colors duration-500"></div>
              <div className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest mb-6 border-b border-slate-800 pb-2">Arrival Rate (λ)</div>
              <div className="text-6xl md:text-7xl font-black text-slate-100 tracking-tighter tabular-nums drop-shadow-md">{formatMetric(metrics.iops)}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-4 font-bold uppercase tracking-widest">IOPS / SEC</div>
           </div>
           <div className="p-12 flex flex-col items-center justify-center group overflow-hidden relative">
              <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors duration-500"></div>
              <div className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest mb-6 border-b border-slate-800 pb-2">Mean Occupancy (L)</div>
              <div className="text-6xl md:text-7xl font-black text-slate-100 tracking-tighter tabular-nums drop-shadow-md">{formatMetric(metrics.queueDepth)}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-4 font-bold uppercase tracking-widest">In-Flight Reqs</div>
           </div>
           <div className="p-12 flex flex-col items-center justify-center group overflow-hidden relative">
              <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/5 transition-colors duration-500"></div>
              <div className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest mb-6 border-b border-slate-800 pb-2">Residency (W)</div>
              <div className="text-6xl md:text-7xl font-black text-teal-400 tracking-tighter tabular-nums drop-shadow-md">
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

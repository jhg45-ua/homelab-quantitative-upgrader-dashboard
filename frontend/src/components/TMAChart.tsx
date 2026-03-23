/**
 * PMU guidance for Linux agent on Intel Xeon E5-2670 (Sandy Bridge-EP) to enable TMA L2 backend split:
 * - Memory Bound candidate events: CYCLE_ACTIVITY.STALLS_MEM_ANY (preferred), plus LLC miss latency signals.
 * - Core Bound candidate events: execution/resource stalls not attributed to memory wait (e.g., RS/ROB pressure)
 *   computed as residual backend stalls after memory-attributed stalls.
 * - Program these with perf_event_open raw encodings validated for Sandy Bridge-EP, then export percentages
 *   so memBound + coreBound == backEnd for frontend rendering.
 */
import type { MetricsState } from '../types';
import { formatMetric } from '../utils/formatters';

interface Props {
  metrics: MetricsState;
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function evaluateBackendStalls(memBound: number, coreBound: number): string {
  if (memBound > coreBound) {
    return 'RAM/Cache Bottleneck. Optimize memory access patterns (cache locality) or upgrade RAM speed.';
  }
  if (coreBound > memBound) {
    return 'Execution Unit Bottleneck. Code is compute-heavy. Consider vectorization (AVX) or ILP improvements.';
  }
  return 'Balanced Back-End Pressure. Validate both memory hierarchy and execution pipeline with targeted profiling.';
}

export function TMAChart({ metrics }: Props) {
  const total = metrics.tmaRetiring + metrics.tmaBadSpec + metrics.tmaFrontEnd + metrics.tmaBackEnd;
  const norm = (v: number) => total > 0 ? clampPct((v / total) * 100) : 25;

  const rPct = norm(metrics.tmaRetiring);
  const bsPct = norm(metrics.tmaBadSpec);
  const fePct = norm(metrics.tmaFrontEnd);
  const bePct = clampPct(100 - rPct - bsPct - fePct);

  const memInput = clampPct(metrics.memBound);
  const coreInput = clampPct(metrics.coreBound);
  const level2Total = memInput + coreInput;

  const memShare = level2Total > 0 ? memInput / level2Total : 0.5;
  const memWithinBackend = Number((bePct * memShare).toFixed(2));

  const recommendation = evaluateBackendStalls(memInput, coreInput);

  const width = 980;
  const height = 240;
  const mainX = 20;
  const mainY = 36;
  const mainW = 940;
  const mainH = 56;
  const subY = 116;
  const subH = 34;

  const rW = (mainW * rPct) / 100;
  const bsW = (mainW * bsPct) / 100;
  const feW = (mainW * fePct) / 100;
  const beW = Math.max(0, mainW - rW - bsW - feW);

  const rX = mainX;
  const bsX = rX + rW;
  const feX = bsX + bsW;
  const beX = feX + feW;

  const memW = (beW * memWithinBackend) / Math.max(bePct, 0.0001);
  const coreW = Math.max(0, beW - memW);

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">TMA Pipeline Breakdown</h3>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400">
            <span className="inline-block w-2 h-2 bg-green-500"></span>Retiring
          </span>
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400">
            <span className="inline-block w-2 h-2 bg-orange-500"></span>Bad Speculation
          </span>
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400">
            <span className="inline-block w-2 h-2 bg-blue-500"></span>Front-End
          </span>
          <span className="flex items-center gap-1 text-[8px] font-mono text-slate-400">
            <span className="inline-block w-2 h-2 bg-red-500"></span>Back-End
          </span>
        </div>
      </div>
      <div className="p-3 flex-1 w-full h-full bg-[#0F172A]/50">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="Top-down microarchitecture analysis">
          <rect x={mainX} y={mainY} width={mainW} height={mainH} rx={8} fill="#1e293b" stroke="#334155" strokeWidth={1} />

          <rect x={rX} y={mainY} width={rW} height={mainH} rx={8} fill="#22c55e">
            <title>Retiring: {formatMetric(rPct)}%</title>
          </rect>
          <rect x={bsX} y={mainY} width={bsW} height={mainH} fill="#f97316">
            <title>Bad Speculation: {formatMetric(bsPct)}%</title>
          </rect>
          <rect x={feX} y={mainY} width={feW} height={mainH} fill="#3b82f6">
            <title>Front-End Bound: {formatMetric(fePct)}%</title>
          </rect>
          <rect x={beX} y={mainY} width={beW} height={mainH} rx={8} fill="#ef4444">
            <title>Back-End Bound: {formatMetric(bePct)}%</title>
          </rect>

          <text x={rX + rW / 2} y={mainY + 34} textAnchor="middle" className="font-mono text-white text-xs">
            {formatMetric(rPct)}%
          </text>
          {bsPct > 6 && (
            <text x={bsX + bsW / 2} y={mainY + 34} textAnchor="middle" className="font-mono text-white text-xs">
              {formatMetric(bsPct)}%
            </text>
          )}
          {fePct > 6 && (
            <text x={feX + feW / 2} y={mainY + 34} textAnchor="middle" className="font-mono text-white text-xs">
              {formatMetric(fePct)}%
            </text>
          )}
          <text x={beX + beW / 2} y={mainY + 34} textAnchor="middle" className="font-mono text-white text-xs">
            {formatMetric(bePct)}%
          </text>

          <text x={beX + beW / 2} y={subY - 10} textAnchor="middle" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
            Back-End Bound L2
          </text>

          <rect x={beX} y={subY} width={beW} height={subH} rx={6} fill="#1e293b" stroke="#334155" strokeWidth={1} />
          <rect x={beX} y={subY} width={memW} height={subH} rx={6} fill="#9F1239">
            <title>Memory Bound: {formatMetric(memInput)}%</title>
          </rect>
          <rect x={beX + memW} y={subY} width={coreW} height={subH} rx={6} fill="#EF4444">
            <title>Core Bound: {formatMetric(coreInput)}%</title>
          </rect>

          <text x={beX + memW / 2} y={subY + 22} textAnchor="middle" className="font-mono text-white text-xs">
            MEM {formatMetric(memInput)}%
          </text>
          <text x={beX + memW + coreW / 2} y={subY + 22} textAnchor="middle" className="font-mono text-white text-xs">
            CORE {formatMetric(coreInput)}%
          </text>

          <text x={mainX} y={subY + 58} className="font-sans text-xs uppercase text-slate-400 tracking-widest">
            Recommendation
          </text>
          <text x={mainX} y={subY + 80} className="font-mono text-white text-xs">
            {recommendation}
          </text>
        </svg>
      </div>
    </div>
  );
}

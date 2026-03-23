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

export function TMAChart({ metrics }: Props) {
  const total = metrics.tmaRetiring + metrics.tmaBadSpec + metrics.tmaFrontEnd + metrics.tmaBackEnd;
  const norm = (v: number) => total > 0 ? clampPct((v / total) * 100) : 25;

  const rPct = norm(metrics.tmaRetiring);
  const bsPct = norm(metrics.tmaBadSpec);
  const fePct = norm(metrics.tmaFrontEnd);
  const bePct = clampPct(100 - rPct - bsPct - fePct);

  const safeMem = Math.max(0, Number(metrics.memBound) || 0);
  const safeCore = Math.max(0, Number(metrics.coreBound) || 0);
  const hasL2Data = safeMem + safeCore > 0;
  const level2Total = hasL2Data ? safeMem + safeCore : 1;
  const memRelativePct = hasL2Data ? (safeMem / level2Total) * 100 : 50;
  const coreRelativePct = hasL2Data ? (safeCore / level2Total) * 100 : 50;

  const width = 980;
  const height = 260;
  const mainX = 20;
  const mainY = 44;
  const mainW = 940;
  const mainH = 66;
  const subY = 140;
  const subH = 36;

  const rW = (mainW * rPct) / 100;
  const bsW = (mainW * bsPct) / 100;
  const feW = (mainW * fePct) / 100;
  const beW = Math.max(0, mainW - rW - bsW - feW);

  const rX = mainX;
  const bsX = rX + rW;
  const feX = bsX + bsW;
  const beX = feX + feW;

  const l2W = Math.max(140, Math.min(260, beW));
  const l2X = Math.max(mainX, Math.min(width - 20 - l2W, beX + (beW - l2W) / 2));
  const memW = l2W * (memRelativePct / 100);
  const coreW = l2W * (coreRelativePct / 100);
  const memLabel = Math.min(100, safeMem);
  const coreLabel = Math.min(100, safeCore);

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
          <defs>
            <clipPath id="tma-l2-clip">
              <rect x={l2X} y={subY - 18} width={l2W} height={subH + 22} />
            </clipPath>
            <clipPath id="tma-main-bar-clip">
              <rect x={mainX} y={mainY} width={mainW} height={mainH} rx={4} />
            </clipPath>
            <clipPath id="tma-l2-bar-clip">
              <rect x={l2X} y={subY} width={l2W} height={subH} rx={4} />
            </clipPath>
          </defs>

          <rect x={mainX} y={mainY} width={mainW} height={mainH} rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1} />

          <g clipPath="url(#tma-main-bar-clip)">
            <rect x={rX} y={mainY} width={rW} height={mainH} fill="#22c55e">
              <title>Retiring: {formatMetric(rPct)}%</title>
            </rect>
            <rect x={bsX} y={mainY} width={bsW} height={mainH} fill="#f97316">
              <title>Bad Speculation: {formatMetric(bsPct)}%</title>
            </rect>
            <rect x={feX} y={mainY} width={feW} height={mainH} fill="#3b82f6">
              <title>Front-End Bound: {formatMetric(fePct)}%</title>
            </rect>
            <rect x={beX} y={mainY} width={beW} height={mainH} fill="#ef4444">
              <title>Back-End Bound: {formatMetric(bePct)}%</title>
            </rect>
          </g>

          <text x={rX + rW / 2} y={mainY + 40} textAnchor="middle" className="font-mono text-white text-xs">
            {formatMetric(rPct)}%
          </text>
          {bsPct > 6 && (
            <text x={bsX + bsW / 2} y={mainY + 40} textAnchor="middle" className="font-mono text-white text-xs">
              {formatMetric(bsPct)}%
            </text>
          )}
          {fePct > 6 && (
            <text x={feX + feW / 2} y={mainY + 40} textAnchor="middle" className="font-mono text-white text-xs">
              {formatMetric(fePct)}%
            </text>
          )}
          <text x={beX + beW / 2} y={mainY + 40} textAnchor="middle" className="font-mono text-white text-xs">
            {formatMetric(bePct)}%
          </text>

          <text x={l2X + l2W / 2} y={subY - 10} textAnchor="middle" className="font-sans font-bold text-xs uppercase fill-white tracking-widest">
            Back-End Bound L2
          </text>

          <rect x={l2X} y={subY} width={l2W} height={subH} rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1} />
          <g clipPath="url(#tma-l2-bar-clip)">
            <rect x={l2X} y={subY} width={memW} height={subH} fill={hasL2Data ? '#9F1239' : '#334155'}>
              <title>Memory Bound: {formatMetric(memLabel)}%</title>
            </rect>
            <rect x={l2X + memW} y={subY} width={coreW} height={subH} fill={hasL2Data ? '#EF4444' : '#475569'}>
              <title>Core Bound: {formatMetric(coreLabel)}%</title>
            </rect>
          </g>

          <g clipPath="url(#tma-l2-clip)">
            {!hasL2Data ? (
              <text x={l2X + l2W / 2} y={subY + 24} textAnchor="middle" className="font-mono text-white text-xs">
                NO L2 DATA
              </text>
            ) : (
              <>
                {memW > 56 && (
                  <text x={l2X + memW / 2} y={subY + 24} textAnchor="middle" className="font-mono text-white text-xs">
                    MEM {formatMetric(memLabel)}%
                  </text>
                )}
                {coreW > 56 && (
                  <text x={l2X + memW + coreW / 2} y={subY + 24} textAnchor="middle" className="font-mono text-white text-xs">
                    CORE {formatMetric(coreLabel)}%
                  </text>
                )}
              </>
            )}
          </g>

        </svg>
      </div>
    </div>
  );
}

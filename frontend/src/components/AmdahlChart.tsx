import { useState } from 'preact/hooks';
import type { HistoryFrame } from '../types';
import { formatMetric } from '../utils/formatters';
import { areaPath, clamp, createLinearScale, getTickValues, niceUpperBound, polylinePath } from '../utils/chartScales';
import { HorizontalGrid, XAxisLabels } from './charts/SVGPrimitives';
import { InfoTooltip } from './UI/InfoTooltip';

interface Props {
  history: HistoryFrame[];
}

interface HoverPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

export function AmdahlChart({ history }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<HoverPoint | null>(null);
  const width = 960;
  const height = 320;
  const margin = { top: 22, right: 18, bottom: 52, left: 52 };
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;

  const safeHistory = history.length > 0 ? history : [{ time: 'N/A', cpi: 0, cacheMiss: 0, ctxSwitches: 0, mutexContention: 0 }];
  const finiteValues = safeHistory
    .map(h => h.mutexContention)
    .filter(v => Number.isFinite(v))
    .map(v => clamp(Number(v), 0, 100));
  const baseMin = finiteValues.length > 0 ? Math.min(...finiteValues) : 0;
  const baseMax = finiteValues.length > 0 ? Math.max(...finiteValues) : 1;
  const yMin = Math.max(0, baseMin);
  const yMax = Math.max(yMin + 1, niceUpperBound(baseMax));

  const xScale = createLinearScale(0, Math.max(1, safeHistory.length - 1), plotLeft, plotRight);
  const yScale = createLinearScale(yMin, yMax, plotBottom, plotTop);

  const points = safeHistory.map((h, idx) => ({
    x: xScale(idx),
    y: yScale(clamp(Number.isFinite(h.mutexContention) ? h.mutexContention : 0, 0, 100)),
  }));

  const ticks = getTickValues(yMin, yMax, 5).map(value => ({ value, y: yScale(value) }));
  const xLabelStep = Math.max(1, Math.floor(safeHistory.length / 5));
  const xLabels = safeHistory
    .map((h, idx) => ({ idx, time: h.time }))
    .filter(({ idx }) => idx % xLabelStep === 0 || idx === safeHistory.length - 1)
    .map(({ idx, time }) => ({ x: xScale(idx), text: time }));

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[9px] md:text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Amdahl Lock Contention</h3>
          <InfoTooltip
            title="Amdahl Lock Contention"
            shortSummary="Shows serialization pressure from lock contention, highlighting throughput limits predicted by Amdahl's Law."
            wikiHash="#tma"
          />
        </div>
      </div>
      <div className="p-0 flex-1 w-full h-full bg-[#0F172A]/50">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="Amdahl lock contention">
          <defs>
            <clipPath id="amdahl-plot-clip">
              <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} />
            </clipPath>
          </defs>

          <HorizontalGrid left={plotLeft} right={plotRight} ticks={ticks} />

          {ticks.map((tick, idx) => (
            <line
              key={`amdahl-dash-grid-${idx}-${tick.value}`}
              x1={plotLeft}
              x2={plotRight}
              y1={tick.y}
              y2={tick.y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          <line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} stroke="#475569" strokeWidth="1" />
          <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} stroke="#475569" strokeWidth="1" />

          <g clipPath="url(#amdahl-plot-clip)">
            <path d={areaPath(points, plotBottom)} fill="rgba(13, 148, 136, 0.25)" />
            <path d={polylinePath(points)} fill="none" stroke="#0D9488" strokeWidth="2.5" />

            {points.map((p, idx) => (
              <circle
                key={`p-${idx}`}
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#0D9488"
                onMouseEnter={(e) => setHoveredPoint({
                  x: e.clientX,
                  y: e.clientY,
                  value: safeHistory[idx].mutexContention,
                  label: safeHistory[idx].time,
                })}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <title>{`${safeHistory[idx].time} - Mutex Contention: ${formatMetric(safeHistory[idx].mutexContention)}%`}</title>
              </circle>
            ))}
          </g>

          <XAxisLabels labels={xLabels} y={height - 14} />

          <text x={10} y={plotTop + 12} className="fill-slate-400 font-mono" style={{ fontSize: '9px' }}>%</text>
        </svg>

        {hoveredPoint && (
          <div
            className="fixed z-50 pointer-events-none bg-slate-800 border border-slate-600 shadow-xl p-2 rounded"
            style={{ top: hoveredPoint.y - 40, left: hoveredPoint.x + 10 }}
          >
            <div className="font-sans text-xs text-slate-400">{hoveredPoint.label}</div>
            <div className="font-mono text-sm text-white font-bold">{formatMetric(hoveredPoint.value)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

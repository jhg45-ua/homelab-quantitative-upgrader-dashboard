import { useState } from 'preact/hooks';
import type { HistoryFrame } from '../types';
import { formatMetric } from '../utils/formatters';
import { areaPath, createLinearScale, getTickValues, niceUpperBound, polylinePath } from '../utils/chartScales';
import { HorizontalGrid, XAxisLabels } from './charts/SVGPrimitives';

interface Props {
  history: HistoryFrame[];
}

interface HoverPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

export function TimelineChart({ history }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<HoverPoint | null>(null);
  const width = 960;
  const height = 280;
  const margin = { top: 20, right: 14, bottom: 34, left: 40 };
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;

  const safeHistory = history.length > 0 ? history : [{ time: 'N/A', cpi: 0, cacheMiss: 0, ctxSwitches: 0, mutexContention: 0 }];
  const yMaxRaw = Math.max(...safeHistory.map(h => h.cpi), 1);
  const yMax = Math.max(1, niceUpperBound(yMaxRaw));

  const xScale = createLinearScale(0, Math.max(1, safeHistory.length - 1), plotLeft, plotRight);
  const yScale = createLinearScale(0, yMax, plotBottom, plotTop);

  const points = safeHistory.map((h, idx) => ({ x: xScale(idx), y: yScale(h.cpi) }));
  const ticks = getTickValues(0, yMax, 5).map(value => ({ value, y: yScale(value) }));
  const xLabelStep = Math.max(1, Math.floor(safeHistory.length / 5));
  const xLabels = safeHistory
    .map((h, idx) => ({ idx, time: h.time }))
    .filter(({ idx }) => idx % xLabelStep === 0 || idx === safeHistory.length - 1)
    .map(({ idx, time }) => ({ x: xScale(idx), text: time }));

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[9px] md:text-[10px] font-semibold tracking-widest text-slate-400 uppercase">CPI Timeline</h3>
      </div>
      <div className="p-0 h-full flex-1 w-full bg-[#0F172A]/50 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="CPI timeline">
          <HorizontalGrid left={plotLeft} right={plotRight} ticks={ticks} />

          {ticks.map((tick, idx) => (
            <line
              key={`dash-grid-${idx}-${tick.value}`}
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

          <path d={areaPath(points, plotBottom)} fill="rgba(220, 38, 38, 0.15)" />
          <path d={polylinePath(points)} fill="none" stroke="#DC2626" strokeWidth="2.5" />

          {points.map((p, idx) => (
            <circle
              key={`cpi-${idx}`}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#EF4444"
              onMouseEnter={(e) => setHoveredPoint({
                x: e.clientX,
                y: e.clientY,
                value: safeHistory[idx].cpi,
                label: safeHistory[idx].time,
              })}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <title>{`${safeHistory[idx].time} - CPI: ${formatMetric(safeHistory[idx].cpi)}`}</title>
            </circle>
          ))}

          <XAxisLabels labels={xLabels} y={height - 10} />

          <text x={10} y={plotTop + 12} className="fill-slate-400 font-mono" style={{ fontSize: '9px' }}>CYCLES</text>
        </svg>

        {hoveredPoint && (
          <div
            className="fixed z-50 pointer-events-none bg-slate-800 border border-slate-600 shadow-xl p-2 rounded"
            style={{ top: hoveredPoint.y - 40, left: hoveredPoint.x + 10 }}
          >
            <div className="font-sans text-xs text-slate-400">{hoveredPoint.label}</div>
            <div className="font-mono text-sm text-white font-bold">{formatMetric(hoveredPoint.value)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

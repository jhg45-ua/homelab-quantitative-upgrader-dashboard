import type { HistoryFrame } from '../types';
import { formatMetric } from '../utils/formatters';
import { createLinearScale, getTickValues, niceUpperBound, polylinePath } from '../utils/chartScales';
import { HorizontalGrid, XAxisLabels } from './charts/SVGPrimitives';

interface Props {
  history: HistoryFrame[];
}

export function ComboChart({ history }: Props) {
  const width = 960;
  const height = 280;
  const margin = { top: 20, right: 42, bottom: 34, left: 40 };
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;
  const plotWidth = plotRight - plotLeft;

  const safeHistory = history.length > 0 ? history : [{ time: 'N/A', cpi: 0, cacheMiss: 0, ctxSwitches: 0, mutexContention: 0 }];
  const maxCtxSwitches = Math.max(1, niceUpperBound(Math.max(...safeHistory.map(h => h.ctxSwitches), 1)));
  const maxCacheMiss = Math.max(1, niceUpperBound(Math.max(...safeHistory.map(h => h.cacheMiss), 1)));

  const xScale = createLinearScale(0, Math.max(1, safeHistory.length - 1), plotLeft, plotRight);
  const yLeftScale = createLinearScale(0, maxCtxSwitches, plotBottom, plotTop);
  const yRightScale = createLinearScale(0, maxCacheMiss, plotBottom, plotTop);

  const linePoints = safeHistory.map((h, idx) => ({ x: xScale(idx), y: yRightScale(h.cacheMiss) }));

  const leftTicks = getTickValues(0, maxCtxSwitches, 5).map(value => ({ value, y: yLeftScale(value) }));
  const rightTicks = getTickValues(0, maxCacheMiss, 5).map(value => ({ value, y: yRightScale(value) }));
  const xLabelStep = Math.max(1, Math.floor(safeHistory.length / 5));
  const xLabels = safeHistory
    .map((h, idx) => ({ idx, time: h.time }))
    .filter(({ idx }) => idx % xLabelStep === 0 || idx === safeHistory.length - 1)
    .map(({ idx, time }) => ({ x: xScale(idx), text: time }));

  const barWidth = Math.max(6, plotWidth / Math.max(1, safeHistory.length) - 6);

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[9px] md:text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Pressure & OS Overhead</h3>
      </div>
      <div className="p-0 h-full flex-1 w-full bg-[#0F172A]/50">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="Context switches and cache miss">
          <HorizontalGrid left={plotLeft} right={plotRight} ticks={leftTicks} />

          <line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} stroke="#475569" strokeWidth="1" />
          <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} stroke="#475569" strokeWidth="1" />
          <line x1={plotRight} x2={plotRight} y1={plotTop} y2={plotBottom} stroke="#475569" strokeWidth="1" />

          {safeHistory.map((h, idx) => {
            const x = xScale(idx) - barWidth / 2;
            const y = yLeftScale(h.ctxSwitches);
            const barHeight = plotBottom - y;
            return (
              <rect key={`bar-${idx}`} x={x} y={y} width={barWidth} height={barHeight} fill="#475569" opacity="0.85">
                <title>{`${h.time} - Context Switches: ${formatMetric(h.ctxSwitches)}`}</title>
              </rect>
            );
          })}

          <path d={polylinePath(linePoints)} fill="none" stroke="#0D9488" strokeWidth="2.5" />
          {linePoints.map((p, idx) => (
            <circle key={`line-${idx}`} cx={p.x} cy={p.y} r="2.5" fill="#0D9488">
              <title>{`${safeHistory[idx].time} - Cache Miss: ${formatMetric(safeHistory[idx].cacheMiss)}%`}</title>
            </circle>
          ))}

          <XAxisLabels labels={xLabels} y={height - 10} />

          <text x={8} y={plotTop + 12} className="fill-slate-400 font-mono" style={{ fontSize: '9px' }}>CS/s</text>
          <text x={plotRight + 8} y={plotTop + 12} className="fill-slate-400 font-mono" style={{ fontSize: '9px' }}>MISS %</text>

          {rightTicks.map(tick => (
            <text
              key={`right-${tick.value}`}
              x={plotRight + 6}
              y={tick.y + 3}
              textAnchor="start"
              className="fill-slate-400 font-mono"
              style={{ fontSize: '9px' }}
            >
              {formatMetric(tick.value)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

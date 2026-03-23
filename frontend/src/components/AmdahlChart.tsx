import type { HistoryFrame } from '../types';
import { formatMetric } from '../utils/formatters';
import { areaPath, clamp, createLinearScale, getTickValues, polylinePath } from '../utils/chartScales';
import { HorizontalGrid, XAxisLabels } from './charts/SVGPrimitives';

interface Props {
  history: HistoryFrame[];
}

export function AmdahlChart({ history }: Props) {
  const width = 960;
  const height = 280;
  const margin = { top: 18, right: 14, bottom: 34, left: 44 };
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;

  const safeHistory = history.length > 0 ? history : [{ time: 'N/A', cpi: 0, cacheMiss: 0, ctxSwitches: 0, mutexContention: 0 }];
  const xScale = createLinearScale(0, Math.max(1, safeHistory.length - 1), plotLeft, plotRight);
  const yScale = createLinearScale(0, 100, plotBottom, plotTop);

  const points = safeHistory.map((h, idx) => ({
    x: xScale(idx),
    y: yScale(clamp(h.mutexContention, 0, 100)),
  }));

  const ticks = getTickValues(0, 100, 5).map(value => ({ value, y: yScale(value) }));
  const xLabelStep = Math.max(1, Math.floor(safeHistory.length / 5));
  const xLabels = safeHistory
    .map((h, idx) => ({ idx, time: h.time }))
    .filter(({ idx }) => idx % xLabelStep === 0 || idx === safeHistory.length - 1)
    .map(({ idx, time }) => ({ x: xScale(idx), text: time }));

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col h-full w-full">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">Amdahl Lock Contention</h3>
        <span className="text-[8px] md:text-[9px] font-mono text-teal-400 border border-teal-500/50 px-1 rounded-sm bg-teal-500/10">MUTEX WAIT</span>
      </div>
      <div className="p-0 flex-1 w-full h-full bg-[#0F172A]/50">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="Amdahl lock contention">
          <HorizontalGrid left={plotLeft} right={plotRight} ticks={ticks} />

          <line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} stroke="#475569" strokeWidth="1" />
          <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} stroke="#475569" strokeWidth="1" />

          <path d={areaPath(points, plotBottom)} fill="rgba(13, 148, 136, 0.25)" />
          <path d={polylinePath(points)} fill="none" stroke="#0D9488" strokeWidth="2.5" />

          {points.map((p, idx) => (
            <circle key={`p-${idx}`} cx={p.x} cy={p.y} r="2.5" fill="#0D9488">
              <title>{`${safeHistory[idx].time} - Mutex Contention: ${formatMetric(safeHistory[idx].mutexContention)}%`}</title>
            </circle>
          ))}

          <XAxisLabels labels={xLabels} y={height - 10} />

          <text x={16} y={plotTop + 12} className="fill-slate-400 font-mono" style={{ fontSize: '9px' }}>%</text>
        </svg>
      </div>
    </div>
  );
}

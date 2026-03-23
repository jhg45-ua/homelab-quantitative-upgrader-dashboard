import { formatMetric } from '../utils/formatters';
import { clamp, createLogScale, getLogTickValues, polylinePath } from '../utils/chartScales';

interface Props {
  ips: number;
  cacheMiss: number;
  peakMips?: number;
  memBwGbps?: number;
}

export function RooflineChart({ ips, cacheMiss, peakMips = 166400, memBwGbps = 102.4 }: Props) {
  const width = 960;
  const height = 360;
  const margin = { top: 24, right: 24, bottom: 56, left: 74 };
  const plotLeft = margin.left;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;

  const PEAK_MIPS = peakMips;
  const PEAK_BW_GBS = memBwGbps;
  const ridgeOI = PEAK_MIPS / ((PEAK_BW_GBS * 1e9) / 64 / 1e6);

  const xMin = 0.01;
  const xMax = 10000;
  const yMin = 1;
  const yMax = Math.pow(10, Math.ceil(Math.log10(PEAK_MIPS * 1.5)));

  let safeOI = ridgeOI;
  if (cacheMiss > 0) {
    safeOI = Math.max(xMin, 100.0 / cacheMiss);
  }
  safeOI = clamp(safeOI, xMin, xMax);
  const safeMIPS = clamp(Math.max(yMin, ips / 1e6), yMin, yMax);

  const xScale = createLogScale(xMin, xMax, plotLeft, plotRight);
  const yScale = createLogScale(yMin, yMax, plotBottom, plotTop);

  const bwLineData: Array<{ x: number; y: number }> = [];
  for (let oi = xMin; oi <= Math.min(xMax, ridgeOI * 1.1); oi *= 1.12) {
    const perf = (oi * ((PEAK_BW_GBS * 1e9) / 64)) / 1e6;
    bwLineData.push({ x: xScale(oi), y: yScale(Math.min(perf, PEAK_MIPS)) });
  }
  bwLineData.push({ x: xScale(clamp(ridgeOI, xMin, xMax)), y: yScale(PEAK_MIPS) });

  const computeLineData: Array<{ x: number; y: number }> = [];
  const computeStart = clamp(ridgeOI, xMin, xMax);
  computeLineData.push({ x: xScale(computeStart), y: yScale(PEAK_MIPS) });
  for (let oi = Math.max(computeStart * 1.3, xMin); oi <= xMax; oi *= 1.5) {
    computeLineData.push({ x: xScale(oi), y: yScale(PEAK_MIPS) });
  }
  computeLineData.push({ x: xScale(xMax), y: yScale(PEAK_MIPS) });

  const xTicks = getLogTickValues(xMin, xMax);
  const yTicks = getLogTickValues(yMin, yMax);

  return (
    <div className="h-full w-full">
      <div className="h-full w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="Architecture roofline log-log chart">
          <defs>
            <clipPath id="roofline-plot-clip">
              <rect x={plotLeft} y={plotTop} width={plotRight - plotLeft} height={plotBottom - plotTop} />
            </clipPath>
          </defs>

          {yTicks.map((tick) => (
            <g key={`y-grid-${tick}`}>
              <line x1={plotLeft} x2={plotRight} y1={yScale(tick)} y2={yScale(tick)} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              <text
                x={plotLeft - 10}
                y={yScale(tick)}
                dominantBaseline="middle"
                textAnchor="end"
                className="fill-slate-400 font-mono"
                style={{ fontSize: '9px' }}
              >
                {formatMetric(tick)}
              </text>
            </g>
          ))}

          {xTicks.map((tick) => (
            <g key={`x-grid-${tick}`}>
              <line x1={xScale(tick)} x2={xScale(tick)} y1={plotTop} y2={plotBottom} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
              <text
                x={xScale(tick)}
                y={plotBottom + 16}
                textAnchor="middle"
                className="fill-slate-500 font-mono"
                style={{ fontSize: '9px' }}
              >
                {formatMetric(tick)}
              </text>
            </g>
          ))}

          <line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} stroke="#475569" strokeWidth="1" />
          <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} stroke="#475569" strokeWidth="1" />

          <g clipPath="url(#roofline-plot-clip)">
            <path d={polylinePath(bwLineData)} fill="none" stroke="#0ea5e9" strokeWidth="2">
              <title>{`Memory BW Roof - Peak BW: ${formatMetric(PEAK_BW_GBS)} GB/s`}</title>
            </path>

            <path d={polylinePath(computeLineData)} fill="none" stroke="#ef4444" strokeWidth="2">
              <title>{`Compute Roof - Peak: ${formatMetric(PEAK_MIPS)} MIPS`}</title>
            </path>

            <circle cx={xScale(safeOI)} cy={yScale(safeMIPS)} r="7" fill="#3B82F6" stroke="#BFDBFE" strokeWidth="2.5">
              <title>{`Live Workload | OI: ${formatMetric(safeOI)} | MIPS: ${formatMetric(safeMIPS)}`}</title>
            </circle>
            <text
              x={xScale(safeOI)}
              y={Math.max(plotTop + 10, yScale(safeMIPS) - 12)}
              textAnchor="middle"
              className="fill-blue-300 font-semibold"
              style={{ fontSize: '9px' }}
            >
              WORKLOAD
            </text>
          </g>

          <text x={(plotLeft + plotRight) / 2} y={height - 6} textAnchor="middle" className="fill-slate-500" style={{ fontSize: '10px' }}>
            OPERATIONAL INTENSITY (Ops/Byte)
          </text>
          <text
            x={14}
            y={(plotTop + plotBottom) / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${(plotTop + plotBottom) / 2})`}
            className="fill-slate-500"
            style={{ fontSize: '10px' }}
          >
            MIPS
          </text>
        </svg>
      </div>
    </div>
  );
}

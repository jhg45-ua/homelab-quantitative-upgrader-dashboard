import { formatMetric } from '../../utils/formatters';
import type { MetricsState } from '../../types';
import { InfoTooltip } from '../UI/InfoTooltip';

interface CpuSnapshot {
  loadPct: number;
  ipc: number;
}

interface RamSnapshot {
  used: number | null;
  total: number | null;
  available: boolean;
}

interface Props {
  metrics: MetricsState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function VisualNumaTopology({ metrics }: Props) {
  const ipcBase = metrics.cpi > 0 ? 1 / metrics.cpi : 0;
  const node1Seen = metrics.numaNode1CpuValid;
  const ramReady = metrics.memBoundValid || metrics.coreBoundValid;
  const node0Cpu: CpuSnapshot = {
    loadPct: clamp(Number(metrics.numaNode0Cpu) || 0, 0, 100),
    ipc: clamp(ipcBase, 0, 10),
  };
  const node1Cpu: CpuSnapshot = {
    loadPct: node1Seen ? clamp(Number(metrics.numaNode1Cpu) || 0, 0, 100) : 0,
    ipc: clamp(ipcBase, 0, 10),
  };

  const node0Ram: RamSnapshot = {
    used: metrics.memBoundValid ? clamp(Number(metrics.memBound) || 0, 0, 100) : null,
    total: metrics.memBoundValid ? 100 : null,
    available: metrics.memBoundValid,
  };
  const node1Ram: RamSnapshot = {
    used: metrics.coreBoundValid ? clamp(Number(metrics.coreBound) || 0, 0, 100) : null,
    total: metrics.coreBoundValid ? 100 : null,
    available: metrics.coreBoundValid,
  };
  const node0RamReady = node0Ram.available && node0Ram.used !== null;
  const node1RamReady = node1Ram.available && node1Ram.used !== null;

  const qpiCrossTrafficGbps = Math.max(0, Number(metrics.numaInterconnectTraffic) || 0);

  const qpiAlert = metrics.numaMiss >= 12 || qpiCrossTrafficGbps >= 20;
  const qpiStroke = qpiAlert ? '#dc2626' : '#14b8a6';

  const safeMetric = (val: number | null | undefined): string => {
    const parsed = formatMetric(val);
    return parsed === '-' ? '' : parsed;
  };

  const node0RamUsedText = safeMetric(node0Ram.used) || 'N/A';
  const node0RamTotalText = safeMetric(node0Ram.total) || 'N/A';
  const node1RamUsedText = safeMetric(node1Ram.used) || 'N/A';
  const node1RamTotalText = safeMetric(node1Ram.total) || 'N/A';

  const socketY = 56;
  const socketHeight = 260;
  const socketWidth = 360;
  const node0X = 36;
  const node1X = 804;
  const socketCenterY = socketY + socketHeight / 2;
  const qpiStartX = node0X + socketWidth;
  const qpiEndX = node1X;

  return (
    <div className="w-full h-full bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-sans text-xs uppercase text-slate-400 tracking-widest">Visual NUMA Topology</h3>
          <InfoTooltip
            title="Visual NUMA Topology"
            shortSummary="Socket-level view of NUMA locality, cross-node interconnect activity, and miss pressure between Node 0 and Node 1."
            wikiHash="#amat"
          />
        </div>
        <div className="font-mono text-white text-sm">
          QPI Bandwidth: {formatMetric(qpiCrossTrafficGbps)}
        </div>
      </div>

      <div className="w-full flex-1 min-h-[260px] md:min-h-[300px] flex flex-row justify-between items-center">
        <svg
          viewBox="0 0 1200 380"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          role="img"
          aria-label="NUMA topology with dual Xeon sockets and bidirectional QPI interconnect"
        >
          <defs>
            <marker
              id="qpi-arrow"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <polygon points="0,0 10,5 0,10" fill={qpiStroke} />
            </marker>
          </defs>

          <g transform={`translate(${node0X}, ${socketY})`}>
            <rect width={socketWidth} height={socketHeight} rx="16" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <text x="24" y="30" fill="#94a3b8" className="font-sans text-xs uppercase tracking-widest">
              Node 0 (NUMA)
            </text>

            <rect x="24" y="48" width="312" height="84" rx="10" fill="#111827" stroke="#1f2937" strokeWidth="2" />
            <text x="40" y="72" fill="#94a3b8" className="font-sans text-xs uppercase tracking-widest">
              CPU LOAD (IPC)
            </text>
            <text x="40" y="98" fill="#f8fafc" className="font-mono text-sm">
              {`${formatMetric(node0Cpu.loadPct)}% (${formatMetric(node0Cpu.ipc)})`}
            </text>

            <rect x="24" y="152" width="312" height="84" rx="10" fill="#111827" stroke="#1f2937" strokeWidth="2" />
            <text x="40" y="176" fill="#94a3b8" className="font-sans text-xs uppercase tracking-widest">
              LOCAL RAM USED / TOTAL
            </text>
            <text x="40" y="202" fill="#f8fafc" className="font-mono text-sm">
              {`${node0RamUsedText} / ${node0RamTotalText}`}
            </text>
          </g>

          <g
            transform={`translate(${node1X}, ${socketY})`}
            className={node1Seen ? '' : 'opacity-50'}
          >
            <rect width={socketWidth} height={socketHeight} rx="16" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <text x="24" y="30" fill="#94a3b8" className="font-sans text-xs uppercase tracking-widest">
              Node 1 (NUMA)
            </text>

            <rect x="24" y="48" width="312" height="84" rx="10" fill="#111827" stroke="#1f2937" strokeWidth="2" />
            <text x="40" y="72" fill="#94a3b8" className="font-sans text-xs uppercase tracking-widest">
              CPU LOAD (IPC)
            </text>
            <text x="40" y="98" fill="#f8fafc" className="font-mono text-sm">
              {node1Seen ? `${formatMetric(node1Cpu.loadPct)}% (${formatMetric(node1Cpu.ipc)})` : 'N/A (Awaiting Go Agent)'}
            </text>

            <rect x="24" y="152" width="312" height="84" rx="10" fill="#111827" stroke="#1f2937" strokeWidth="2" />
            <text x="40" y="176" fill="#94a3b8" className="font-sans text-xs uppercase tracking-widest">
              LOCAL RAM USED / TOTAL
            </text>
            <text x="40" y="202" fill="#f8fafc" className="font-mono text-sm">
              {`${node1RamUsedText} / ${node1RamTotalText}`}
            </text>

            {!node1Seen && (
              <g>
                <rect x="24" y="106" width="312" height="40" rx="8" fill="#0b1220" stroke="#334155" strokeWidth="1.5" />
                <text x="180" y="131" fill="#cbd5e1" textAnchor="middle" className="font-sans text-xs uppercase tracking-widest">
                  NODE 1 OFFLINE / AWAITING GO AGENT
                </text>
              </g>
            )}
          </g>

          <line
            x1={qpiStartX}
            y1={socketCenterY}
            x2={qpiEndX}
            y2={socketCenterY}
            stroke={qpiStroke}
            strokeWidth="6"
            strokeLinecap="round"
            markerStart="url(#qpi-arrow)"
            markerEnd="url(#qpi-arrow)"
            style={qpiAlert ? { filter: 'drop-shadow(0 0 5px #DC2626)' } : undefined}
          />

          <text
            x={(qpiStartX + qpiEndX) / 2}
            y={socketCenterY - 24}
            fill="#94a3b8"
            textAnchor="middle"
            className="font-sans text-xs uppercase tracking-widest"
          >
            QPI BW: {formatMetric(qpiCrossTrafficGbps)} GB/s
          </text>
          <text
            x={(qpiStartX + qpiEndX) / 2}
            y={socketCenterY + 34}
            fill="#94a3b8"
            textAnchor="middle"
            className="font-sans text-xs uppercase tracking-widest"
          >
            MISS: {formatMetric(metrics.numaMiss)} %
          </text>
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="font-mono text-xs text-slate-400">
          RAM Used (Node0/Node1): {ramReady && node0RamReady && node1RamReady ? `${node0RamUsedText}% / ${node1RamUsedText}%` : 'N/A (Awaiting PMU)'}
        </div>
        <div className="font-mono text-xs text-white">
          QPI STATUS: {qpiAlert ? 'ALERT' : 'HEALTHY'}
        </div>
      </div>
    </div>
  );
}

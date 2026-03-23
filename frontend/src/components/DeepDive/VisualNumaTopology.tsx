import { formatMetric } from '../../utils/formatters';
import type { MetricsState } from '../../types';

interface CpuSnapshot {
  loadPct: number;
  ipc: number;
}

interface RamSnapshot {
  usedGb: number;
  capacityGb: number;
}

interface Props {
  metrics: MetricsState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function VisualNumaTopology({ metrics }: Props) {
  const ipcBase = metrics.cpi > 0 ? 1 / metrics.cpi : 0;
  const node0Cpu: CpuSnapshot = {
    loadPct: clamp(metrics.tmaRetiring + metrics.tmaBackEnd * 0.45, 8, 95),
    ipc: clamp(ipcBase * 1.03, 0.2, 4),
  };
  const node1Cpu: CpuSnapshot = {
    loadPct: clamp(metrics.tmaRetiring + metrics.tmaFrontEnd * 0.4 - metrics.numaMiss * 0.2, 6, 92),
    ipc: clamp(ipcBase * 0.97, 0.2, 4),
  };

  const capacityGb = 96;
  const node0Ram: RamSnapshot = {
    usedGb: clamp(48 + metrics.memBound * 0.55 + metrics.queueDepth * 0.12, 20, capacityGb),
    capacityGb,
  };
  const node1Ram: RamSnapshot = {
    usedGb: clamp(44 + metrics.coreBound * 0.5 + metrics.numaMiss * 0.35, 18, capacityGb),
    capacityGb,
  };

  // Estimate inter-socket pressure from NUMA misses and retransmits for real-time visualization.
  const qpiCrossTrafficGbps = clamp(metrics.numaMiss * 0.9 + metrics.tcpRetrans * 0.12, 2, 42);

  const qpiAlert = metrics.numaMiss >= 12 || qpiCrossTrafficGbps >= 20;
  const qpiStroke = qpiAlert ? '#dc2626' : '#14b8a6';

  return (
    <div className="w-full h-full bg-slate-800 border border-slate-700 rounded-xl p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-sans text-xs uppercase text-slate-400 tracking-widest">Visual NUMA Topology</h3>
        <div className="font-mono text-white text-sm">
          QPI Bandwidth: {formatMetric(qpiCrossTrafficGbps)} GB/s
        </div>
      </div>

      <svg
        viewBox="0 0 1200 520"
        className="w-full h-[320px] md:h-[360px]"
        role="img"
        aria-label="NUMA topology with dual Xeon sockets and QPI interconnect"
      >
        <defs>
          <marker
            id="qpi-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={qpiStroke} />
          </marker>
        </defs>

        <rect x="40" y="40" width="500" height="420" rx="16" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <text x="70" y="80" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          Node 0 (NUMA)
        </text>

        <rect x="70" y="110" width="440" height="150" rx="12" fill="#111827" stroke="#1f2937" strokeWidth="2" />
        <text x="92" y="143" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          CPU · XEON E5-2670
        </text>
        <text x="92" y="183" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          CPU Load
        </text>
        <text x="240" y="183" className="font-mono text-white text-sm">
          {formatMetric(node0Cpu.loadPct)}%
        </text>
        <text x="92" y="220" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          IPC
        </text>
        <text x="240" y="220" className="font-mono text-white text-sm">
          {formatMetric(node0Cpu.ipc)}
        </text>

        <rect x="70" y="285" width="440" height="150" rx="12" fill="#111827" stroke="#1f2937" strokeWidth="2" />
        <text x="92" y="318" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          Local RAM
        </text>
        <text x="92" y="358" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          Used / Capacity
        </text>
        <text x="320" y="358" className="font-mono text-white text-sm">
          {formatMetric(node0Ram.usedGb)} GB / {formatMetric(node0Ram.capacityGb)} GB
        </text>

        <rect x="660" y="40" width="500" height="420" rx="16" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <text x="690" y="80" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          Node 1 (NUMA)
        </text>

        <rect x="690" y="110" width="440" height="150" rx="12" fill="#111827" stroke="#1f2937" strokeWidth="2" />
        <text x="712" y="143" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          CPU · XEON E5-2670
        </text>
        <text x="712" y="183" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          CPU Load
        </text>
        <text x="860" y="183" className="font-mono text-white text-sm">
          {formatMetric(node1Cpu.loadPct)}%
        </text>
        <text x="712" y="220" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          IPC
        </text>
        <text x="860" y="220" className="font-mono text-white text-sm">
          {formatMetric(node1Cpu.ipc)}
        </text>

        <rect x="690" y="285" width="440" height="150" rx="12" fill="#111827" stroke="#1f2937" strokeWidth="2" />
        <text x="712" y="318" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          Local RAM
        </text>
        <text x="712" y="358" className="font-sans text-xs uppercase text-slate-400 tracking-widest">
          Used / Capacity
        </text>
        <text x="940" y="358" className="font-mono text-white text-sm">
          {formatMetric(node1Ram.usedGb)} GB / {formatMetric(node1Ram.capacityGb)} GB
        </text>

        <path
          d="M 540 250 C 590 250 610 250 660 250"
          fill="none"
          stroke={qpiStroke}
          strokeWidth="10"
          strokeLinecap="round"
          markerStart="url(#qpi-arrow)"
          markerEnd="url(#qpi-arrow)"
          style={qpiAlert ? { filter: 'drop-shadow(0 0 5px #DC2626)' } : undefined}
        />

        <text x="600" y="228" textAnchor="middle" className="font-sans text-xs uppercase tracking-widest text-slate-400">
          QPI Interconnect
        </text>

        <text x="600" y="282" textAnchor="middle" className="font-sans text-xs uppercase tracking-widest text-slate-400">
          Cross-Traffic
        </text>
        <text x="600" y="307" textAnchor="middle" className="font-mono text-white text-sm">
          {formatMetric(qpiCrossTrafficGbps)} GB/s
        </text>
      </svg>

      <div className="mt-3 flex items-center justify-end">
        <div className="font-mono text-xs text-white">
          QPI STATUS: {qpiAlert ? 'ALERT' : 'HEALTHY'}
        </div>
      </div>
    </div>
  );
}

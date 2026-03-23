import type { MetricsState, SystemConfig } from '../types';
import { formatMetric, formatUptime } from '../utils/formatters';

interface AuditReportTemplateProps {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
  appVersion: string;
}

function pickNodeValue(values: Record<string, number>, nodeIndex: number): number {
  const aliases = [`node${nodeIndex}`, String(nodeIndex), `numa${nodeIndex}`];
  for (const alias of aliases) {
    if (values[alias] !== undefined) {
      return values[alias];
    }
  }

  const sortedKeys = Object.keys(values).sort();
  const fallbackKey = sortedKeys[nodeIndex];
  return fallbackKey ? values[fallbackKey] : 0;
}

function bytesToGiB(value: number): number {
  return value / (1024 ** 3);
}

function bytesToMiB(value: number): number {
  return value / (1024 ** 2);
}

function getCpuTmaConclusion(coreBound: number, memoryBound: number): string {
  if (coreBound > memoryBound) {
    return 'Execution unit bottleneck detected. The workload is highly compute-intensive. Consider AVX vectorization.';
  }

  if (memoryBound > coreBound) {
    return 'Memory subsystem bottleneck. The CPU is stalling on cache misses. Optimize data locality.';
  }

  return 'Core and memory pressure are balanced. Keep profiling before prioritizing a single optimization path.';
}

function getNumaConclusion(numaMissRate: number, qpiTrafficMiB: number): string {
  if (numaMissRate > 10 || qpiTrafficMiB > 0) {
    return "High cross-node memory traffic detected. Strict NUMA CPU pinning via 'cpuset' is strongly recommended to reduce AMAT.";
  }

  return 'Optimal local memory access. NUMA topology is well-balanced.';
}

function getIoNetworkConclusion(inferredLatencyMs: number, tcpRetransmits: number): string {
  if (inferredLatencyMs > 20 || tcpRetransmits > 1) {
    return 'I/O or Network degradation detected. High latency or packet loss is throttling the pipeline. Check block devices and network switches.';
  }

  return 'Storage and network pipeline are operating inside expected latency and loss envelopes.';
}

export function AuditReportTemplate({ metrics, systemConfig, appVersion }: AuditReportTemplateProps) {
  const now = new Date();
  const timestamp = now.toISOString();

  const nodeTarget = systemConfig?.node_name ?? 'r720-baremetal';
  const hardware = systemConfig?.hardware_desc ?? 'Dell PowerEdge R720 (2x Intel Xeon E5-2670)';

  const ramNode0Bytes = pickNodeValue(metrics.numaNodeRamUsedBytesByNode, 0);
  const ramNode1Bytes = pickNodeValue(metrics.numaNodeRamUsedBytesByNode, 1);

  const qpiTrafficBytes = Math.max(0, ...Object.values(metrics.numaInterconnectTrafficBytesTotalByNode));
  const qpiTrafficMiB = bytesToMiB(qpiTrafficBytes);
  const inferredLatencyMs = metrics.iops > 0 ? (metrics.queueDepth / metrics.iops) * 1000 : 0;

  return (
    <div id="hqud-pdf-report" className="absolute -left-[9999px] w-[210mm] min-h-[297mm] bg-white text-slate-900 p-10 font-sans">
      <header className="border-b-2 border-slate-300 pb-6 mb-8">
        <h1 className="text-2xl font-black tracking-tight uppercase">HARDWARE QUANTITATIVE UPGRADER DASHBOARD</h1>
        <div className="mt-2 text-xs text-slate-600 font-mono uppercase tracking-wide">
          <span>Version {appVersion}</span>
          <span className="mx-2">|</span>
          <span>{timestamp}</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
          <div className="border border-slate-300 bg-slate-50 p-3">
            <div className="text-slate-500 uppercase text-[10px] tracking-wide">Node Target</div>
            <div className="font-mono font-semibold mt-1">{nodeTarget}</div>
          </div>
          <div className="border border-slate-300 bg-slate-50 p-3">
            <div className="text-slate-500 uppercase text-[10px] tracking-wide">Hardware</div>
            <div className="font-mono font-semibold mt-1">{hardware}</div>
          </div>
          <div className="border border-slate-300 bg-slate-50 p-3">
            <div className="text-slate-500 uppercase text-[10px] tracking-wide">Uptime</div>
            <div className="font-mono font-semibold mt-1">{formatUptime(metrics.uptimeSeconds)}</div>
          </div>
        </div>
      </header>

      <section className="mb-7">
        <h2 className="text-sm font-black tracking-wider uppercase mb-3">Section 1: CPU &amp; TMA</h2>
        <table className="w-full border-collapse border border-slate-300 text-xs font-mono">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left border border-slate-300 px-3 py-2">Metric</th>
              <th className="text-left border border-slate-300 px-3 py-2">Value</th>
              <th className="text-left border border-slate-300 px-3 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-slate-300 px-3 py-2">CPI</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.cpi)}</td><td className="border border-slate-300 px-3 py-2">cycles/instr</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">Efficiency (IPS/W)</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.ipsPerW)}</td><td className="border border-slate-300 px-3 py-2">IPS/W</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">Retiring</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.tmaRetiring)}</td><td className="border border-slate-300 px-3 py-2">%</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">Bad Speculation</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.tmaBadSpec)}</td><td className="border border-slate-300 px-3 py-2">%</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">Front-End Bound</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.tmaFrontEnd)}</td><td className="border border-slate-300 px-3 py-2">%</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">Back-End Bound</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.tmaBackEnd)}</td><td className="border border-slate-300 px-3 py-2">%</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">Memory Bound</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.memBound)}</td><td className="border border-slate-300 px-3 py-2">%</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">Core Bound</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.coreBound)}</td><td className="border border-slate-300 px-3 py-2">%</td></tr>
          </tbody>
        </table>
        <p className="mt-3 border border-slate-300 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-semibold">Conclusion:</span> {getCpuTmaConclusion(metrics.coreBound, metrics.memBound)}
        </p>
      </section>

      <section className="mb-7">
        <h2 className="text-sm font-black tracking-wider uppercase mb-3">Section 2: NUMA &amp; Jerarquia de Memoria</h2>
        <table className="w-full border-collapse border border-slate-300 text-xs font-mono">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left border border-slate-300 px-3 py-2">Metric</th>
              <th className="text-left border border-slate-300 px-3 py-2">Value</th>
              <th className="text-left border border-slate-300 px-3 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-slate-300 px-3 py-2">AMAT</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.amat)}</td><td className="border border-slate-300 px-3 py-2">cycles</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">NUMA Miss Rate</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.numaMiss)}</td><td className="border border-slate-300 px-3 py-2">%</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">RAM Node 0</td><td className="border border-slate-300 px-3 py-2">{formatMetric(bytesToGiB(ramNode0Bytes))}</td><td className="border border-slate-300 px-3 py-2">GiB</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">RAM Node 1</td><td className="border border-slate-300 px-3 py-2">{formatMetric(bytesToGiB(ramNode1Bytes))}</td><td className="border border-slate-300 px-3 py-2">GiB</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">QPI Traffic</td><td className="border border-slate-300 px-3 py-2">{formatMetric(qpiTrafficMiB)}</td><td className="border border-slate-300 px-3 py-2">MiB</td></tr>
          </tbody>
        </table>
        <p className="mt-3 border border-slate-300 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-semibold">Conclusion:</span> {getNumaConclusion(metrics.numaMiss, qpiTrafficMiB)}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-black tracking-wider uppercase mb-3">Section 3: Storage I/O &amp; Network</h2>
        <table className="w-full border-collapse border border-slate-300 text-xs font-mono">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left border border-slate-300 px-3 py-2">Metric</th>
              <th className="text-left border border-slate-300 px-3 py-2">Value</th>
              <th className="text-left border border-slate-300 px-3 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border border-slate-300 px-3 py-2">Queue Depth</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.queueDepth)}</td><td className="border border-slate-300 px-3 py-2">reqs</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">IOPS</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.iops)}</td><td className="border border-slate-300 px-3 py-2">ops/s</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">Latency Inferred</td><td className="border border-slate-300 px-3 py-2">{formatMetric(inferredLatencyMs)}</td><td className="border border-slate-300 px-3 py-2">ms</td></tr>
            <tr><td className="border border-slate-300 px-3 py-2">TCP Retransmits</td><td className="border border-slate-300 px-3 py-2">{formatMetric(metrics.tcpRetrans)}</td><td className="border border-slate-300 px-3 py-2">/s</td></tr>
          </tbody>
        </table>
        <p className="mt-3 border border-slate-300 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-semibold">Conclusion:</span> {getIoNetworkConclusion(inferredLatencyMs, metrics.tcpRetrans)}
        </p>
      </section>
    </div>
  );
}
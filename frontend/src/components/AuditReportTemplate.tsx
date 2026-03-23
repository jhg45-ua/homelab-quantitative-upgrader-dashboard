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

  const tmaTotal = metrics.tmaRetiring + metrics.tmaBadSpec + metrics.tmaFrontEnd + metrics.tmaBackEnd;
  const tmaRetiringPct = tmaTotal > 0 ? (metrics.tmaRetiring / tmaTotal) * 100 : 25;
  const tmaBadSpecPct = tmaTotal > 0 ? (metrics.tmaBadSpec / tmaTotal) * 100 : 25;
  const tmaFrontEndPct = tmaTotal > 0 ? (metrics.tmaFrontEnd / tmaTotal) * 100 : 25;
  const tmaBackEndPct = Math.max(0, 100 - tmaRetiringPct - tmaBadSpecPct - tmaFrontEndPct);

  return (
    <div
      id="hqud-pdf-report"
      style={{
        position: 'fixed',
        left: '-100000px',
        top: 0,
        backgroundColor: '#ffffff',
        fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif',
        width: 'max-content',
      }}
    >
      <div id="report-page-1" className="pdf-page bg-white w-[210mm] h-[297mm] p-12 overflow-hidden relative box-border">
        <header className="border-b-4 border-slate-900 pb-4 mb-6">
          <h1 className="font-black text-3xl tracking-tight text-slate-900 uppercase">HARDWARE QUANTITATIVE UPGRADER DASHBOARD</h1>
          <p className="mt-2 text-xs text-slate-600 font-mono uppercase tracking-widest">Version {appVersion} // {timestamp}</p>

          <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
            <div className="border border-slate-300 bg-slate-50 p-3">
              <div className="font-bold text-xs uppercase text-slate-500">Node Target</div>
              <div className="font-mono text-slate-900 mt-1">{nodeTarget}</div>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-3">
              <div className="font-bold text-xs uppercase text-slate-500">Hardware</div>
              <div className="font-mono text-slate-900 mt-1">{hardware}</div>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-3">
              <div className="font-bold text-xs uppercase text-slate-500">Uptime</div>
              <div className="font-mono text-slate-900 mt-1">{formatUptime(metrics.uptimeSeconds)}</div>
            </div>
          </div>
        </header>

        <section>
          <h2 className="bg-slate-900 text-white font-bold uppercase text-sm p-2 mb-4">Section 1: CPU &amp; TMA</h2>
          <table className="w-full text-sm">
            <thead className="border-b-2 border-slate-900 text-left font-bold text-xs uppercase text-slate-700">
              <tr>
                <th className="py-2 pr-2">Metric</th>
                <th className="py-2 px-2">Value</th>
                <th className="py-2 pl-2">Unit</th>
                <th className="py-2 pl-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">CPI</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.cpi)}</td>
                <td className="py-2 pl-2">cycles/instr</td>
                <td className="py-2 pl-2">Ideal: &lt;1.0</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">CPU Efficiency</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.ipsPerW)}</td>
                <td className="py-2 pl-2">M IPS/W</td>
                <td className="py-2 pl-2">Instructions per watt</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">Retiring</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.tmaRetiring)}</td>
                <td className="py-2 pl-2">%</td>
                <td className="py-2 pl-2">Useful work completed</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">Bad Speculation</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.tmaBadSpec)}</td>
                <td className="py-2 pl-2">%</td>
                <td className="py-2 pl-2">Branch mispredict / machine clears</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">Front-End Bound</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.tmaFrontEnd)}</td>
                <td className="py-2 pl-2">%</td>
                <td className="py-2 pl-2">Decode / fetch stalls</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">Back-End Bound</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.tmaBackEnd)}</td>
                <td className="py-2 pl-2">%</td>
                <td className="py-2 pl-2">Execution and memory stalls</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">Memory Bound</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.memBound)}</td>
                <td className="py-2 pl-2">%</td>
                <td className="py-2 pl-2">DRAM / cache latency pressure</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">Core Bound</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.coreBound)}</td>
                <td className="py-2 pl-2">%</td>
                <td className="py-2 pl-2">Execution port/resource pressure</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4">
            <div className="flex h-6 w-full rounded border border-slate-800 overflow-hidden mb-2">
              <div style={{ width: `${tmaRetiringPct}%`, backgroundColor: '#22c55e' }} />
              <div style={{ width: `${tmaBadSpecPct}%`, backgroundColor: '#f59e0b' }} />
              <div style={{ width: `${tmaFrontEndPct}%`, backgroundColor: '#3b82f6' }} />
              <div style={{ width: `${tmaBackEndPct}%`, backgroundColor: '#ef4444' }} />
            </div>
            <div className="text-xs font-mono text-slate-700">
              Retiring {formatMetric(tmaRetiringPct)}% | Bad Spec {formatMetric(tmaBadSpecPct)}% | Front-End {formatMetric(tmaFrontEndPct)}% | Back-End {formatMetric(tmaBackEndPct)}%
            </div>
          </div>

          <div className="mt-4 p-4 border-l-4 border-slate-800 bg-slate-100 font-mono text-xs leading-relaxed">
            <span className="font-bold uppercase text-slate-900">&gt; DIAGNOSTIC OUTPUT:</span> {getCpuTmaConclusion(metrics.coreBound, metrics.memBound)}
          </div>
        </section>
      </div>

      <div id="report-page-2" className="pdf-page bg-white w-[210mm] h-[297mm] p-12 overflow-hidden relative box-border">
        <header className="border-b-4 border-slate-900 pb-4 mb-6">
          <h1 className="font-black text-3xl tracking-tight text-slate-900 uppercase">HARDWARE QUANTITATIVE UPGRADER DASHBOARD</h1>
          <p className="mt-2 text-xs text-slate-600 font-mono uppercase tracking-widest">Section Continuation // {timestamp}</p>
        </header>

        <section className="mb-8">
          <h2 className="bg-slate-900 text-white font-bold uppercase text-sm p-2 mb-4">Section 2: NUMA &amp; Memory Hierarchy</h2>
          <table className="w-full text-sm">
            <thead className="border-b-2 border-slate-900 text-left font-bold text-xs uppercase text-slate-700">
              <tr>
                <th className="py-2 pr-2">Metric</th>
                <th className="py-2 px-2">Value</th>
                <th className="py-2 pl-2">Unit</th>
                <th className="py-2 pl-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">AMAT</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.amat)}</td>
                <td className="py-2 pl-2">cycles</td>
                <td className="py-2 pl-2">Average memory access time</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">NUMA Miss Rate</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.numaMiss)}</td>
                <td className="py-2 pl-2">%</td>
                <td className="py-2 pl-2">Cross-node fetches</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">RAM Node 0</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(bytesToGiB(ramNode0Bytes))}</td>
                <td className="py-2 pl-2">GiB</td>
                <td className="py-2 pl-2">NUMA node 0 memory usage</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">RAM Node 1</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(bytesToGiB(ramNode1Bytes))}</td>
                <td className="py-2 pl-2">GiB</td>
                <td className="py-2 pl-2">NUMA node 1 memory usage</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">QPI Traffic</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(qpiTrafficMiB)}</td>
                <td className="py-2 pl-2">MiB</td>
                <td className="py-2 pl-2">Inter-socket data movement</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 p-4 border-l-4 border-slate-800 bg-slate-100 font-mono text-xs leading-relaxed">
            <span className="font-bold uppercase text-slate-900">&gt; DIAGNOSTIC OUTPUT:</span> {getNumaConclusion(metrics.numaMiss, qpiTrafficMiB)}
          </div>
        </section>

        <section>
          <h2 className="bg-slate-900 text-white font-bold uppercase text-sm p-2 mb-4">Section 3: Storage I/O &amp; Network</h2>
          <table className="w-full text-sm">
            <thead className="border-b-2 border-slate-900 text-left font-bold text-xs uppercase text-slate-700">
              <tr>
                <th className="py-2 pr-2">Metric</th>
                <th className="py-2 px-2">Value</th>
                <th className="py-2 pl-2">Unit</th>
                <th className="py-2 pl-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">Queue Depth</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.queueDepth)}</td>
                <td className="py-2 pl-2">reqs</td>
                <td className="py-2 pl-2">In-flight block queue requests</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">IOPS</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.iops)}</td>
                <td className="py-2 pl-2">ops/s</td>
                <td className="py-2 pl-2">Storage completion throughput</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">Latency Inferred</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(inferredLatencyMs)}</td>
                <td className="py-2 pl-2">ms</td>
                <td className="py-2 pl-2">Little's Law estimate W = L / λ</td>
              </tr>
              <tr className="border-b border-slate-200 even:bg-slate-50">
                <td className="py-2 pr-2">TCP Retransmits</td>
                <td className="py-2 px-2 font-mono text-sm text-slate-900 font-medium">{formatMetric(metrics.tcpRetrans)}</td>
                <td className="py-2 pl-2">/s</td>
                <td className="py-2 pl-2">Network packet loss indicator</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 p-4 border-l-4 border-slate-800 bg-slate-100 font-mono text-xs leading-relaxed">
            <span className="font-bold uppercase text-slate-900">&gt; DIAGNOSTIC OUTPUT:</span> {getIoNetworkConclusion(inferredLatencyMs, metrics.tcpRetrans)}
          </div>
        </section>
      </div>
    </div>
  );
}
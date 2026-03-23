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
    <div
      id="hqud-pdf-report"
      style={{
        position: 'fixed',
        left: '-100000px',
        top: 0,
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        padding: '40px',
        fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '24px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>HARDWARE QUANTITATIVE UPGRADER DASHBOARD</h1>
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#475569',
            fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <span>Version {appVersion}</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>{timestamp}</span>
        </div>
        <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '12px' }}>
          <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '12px' }}>
            <div style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Node Target</div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 600, marginTop: '4px' }}>{nodeTarget}</div>
          </div>
          <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '12px' }}>
            <div style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Hardware</div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 600, marginTop: '4px' }}>{hardware}</div>
          </div>
          <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '12px' }}>
            <div style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Uptime</div>
            <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 600, marginTop: '4px' }}>{formatUptime(metrics.uptimeSeconds)}</div>
          </div>
        </div>
      </header>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Section 1: CPU &amp; TMA</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Metric</th>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Value</th>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>CPI</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.cpi)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>cycles/instr</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Efficiency (IPS/W)</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.ipsPerW)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>IPS/W</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Retiring</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.tmaRetiring)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>%</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Bad Speculation</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.tmaBadSpec)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>%</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Front-End Bound</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.tmaFrontEnd)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>%</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Back-End Bound</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.tmaBackEnd)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>%</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Memory Bound</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.memBound)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>%</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Core Bound</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.coreBound)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>%</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '8px 12px', fontSize: '12px' }}>
          <span style={{ fontWeight: 700 }}>Conclusion:</span> {getCpuTmaConclusion(metrics.coreBound, metrics.memBound)}
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Section 2: NUMA &amp; Jerarquia de Memoria</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Metric</th>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Value</th>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>AMAT</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.amat)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>cycles</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>NUMA Miss Rate</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.numaMiss)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>%</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>RAM Node 0</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(bytesToGiB(ramNode0Bytes))}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>GiB</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>RAM Node 1</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(bytesToGiB(ramNode1Bytes))}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>GiB</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>QPI Traffic</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(qpiTrafficMiB)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>MiB</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '8px 12px', fontSize: '12px' }}>
          <span style={{ fontWeight: 700 }}>Conclusion:</span> {getNumaConclusion(metrics.numaMiss, qpiTrafficMiB)}
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Section 3: Storage I/O &amp; Network</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          <thead style={{ backgroundColor: '#f1f5f9' }}>
            <tr>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Metric</th>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Value</th>
              <th style={{ textAlign: 'left', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Queue Depth</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.queueDepth)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>reqs</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>IOPS</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.iops)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>ops/s</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Latency Inferred</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(inferredLatencyMs)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>ms</td></tr>
            <tr><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>TCP Retransmits</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>{formatMetric(metrics.tcpRetrans)}</td><td style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>/s</td></tr>
          </tbody>
        </table>
        <p style={{ marginTop: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '8px 12px', fontSize: '12px' }}>
          <span style={{ fontWeight: 700 }}>Conclusion:</span> {getIoNetworkConclusion(inferredLatencyMs, metrics.tcpRetrans)}
        </p>
      </section>
    </div>
  );
}
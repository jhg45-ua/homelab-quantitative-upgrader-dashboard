import type { MetricsState, SystemConfig } from '../types';
import { formatMetric, formatUptime } from '../utils/formatters';

interface AuditReportTemplateProps {
  metrics: MetricsState;
  systemConfig: SystemConfig | null;
  appVersion: string;
}

interface UpgradeRecommendation {
  component: string;
  statusColor: string;
  statusText: string;
  explanation: string;
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

function evaluateUpgradeRecommendations(metrics: MetricsState): UpgradeRecommendation[] {
  const ipc = metrics.cpi > 0 ? 1 / metrics.cpi : 0;

  const cpuNeedsUpgrade = metrics.coreBound > 20 || metrics.cpi > 2.0 || ipc < 0.5;
  const memoryNeedsUpgrade = metrics.memBound > 40 || metrics.amat > 25 || metrics.numaMiss > 15;
  const storageNeedsUpgrade = metrics.queueDepth > 50 || metrics.iops < 100;
  const networkWarning = metrics.tcpRetrans > 5;

  return [
    {
      component: 'CPU / COMPUTE UNIT',
      statusColor: cpuNeedsUpgrade ? '#dc2626' : '#16a34a',
      statusText: cpuNeedsUpgrade ? 'UPGRADE RECOMMENDED' : 'ADEQUATE (NO UPGRADE)',
      explanation: cpuNeedsUpgrade
        ? 'High execution port pressure or high CPI detected. Current compute capacity is bottlenecking the pipeline. Focus on CPU upgrade for linear performance gains.'
        : 'CPU compute capacity is adequate. Execution units are not bottlenecked. Focus on software optimization.',
    },
    {
      component: 'MEMORY / RAM HIERARCHY',
      statusColor: memoryNeedsUpgrade ? '#dc2626' : '#16a34a',
      statusText: memoryNeedsUpgrade ? 'UPGRADE RECOMMENDED' : 'OPTIMAL (NO UPGRADE)',
      explanation: memoryNeedsUpgrade
        ? 'Critical memory bottleneck detected. High AMAT or Memory Bound slots indicate CPU stalls on DRAM fetches. Upgrading to higher bandwidth/lower latency RAM or larger cache is highly recommended.'
        : 'Memory hierarchy is performing within acceptable margins. Access latency is minimized. No RAM upgrade needed.',
    },
    {
      component: 'STORAGE SUBSYSTEM',
      statusColor: storageNeedsUpgrade ? '#dc2626' : '#16a34a',
      statusText: storageNeedsUpgrade ? 'UPGRADE RECOMMENDED' : 'HEALTHY (NO UPGRADE)',
      explanation: storageNeedsUpgrade
        ? 'Severe queuing delays detected via Little\'s Law. Storage subsystem is bottlenecking I/O requests. Upgrade to PCIe NVMe solid-state devices immediately.'
        : 'Storage throughput is healthy. I/O requests are clearing the queue rapidly. No storage upgrade needed.',
    },
    {
      component: 'NETWORK INTERFACE',
      statusColor: networkWarning ? '#d97706' : '#16a34a',
      statusText: networkWarning ? 'WARNING / CHECK INFRASTRUCTURE' : 'RELIABLE (NO UPGRADE)',
      explanation: networkWarning
        ? 'Packet loss and retransmissions detected. Check physical cabling, switch buffers, or upgrade NICs with Hardware Offload (TOE).'
        : 'Network transport layer is stable. No significant packet loss. Optimal hardware condition.',
    },
  ];
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
  const upgradeRecommendations = evaluateUpgradeRecommendations(metrics);

  const tmaTotal = metrics.tmaRetiring + metrics.tmaBadSpec + metrics.tmaFrontEnd + metrics.tmaBackEnd;
  const tmaRetiringPct = tmaTotal > 0 ? (metrics.tmaRetiring / tmaTotal) * 100 : 25;
  const tmaBadSpecPct = tmaTotal > 0 ? (metrics.tmaBadSpec / tmaTotal) * 100 : 25;
  const tmaFrontEndPct = tmaTotal > 0 ? (metrics.tmaFrontEnd / tmaTotal) * 100 : 25;
  const tmaBackEndPct = Math.max(0, 100 - tmaRetiringPct - tmaBadSpecPct - tmaFrontEndPct);

  const sectionTitleStyle = {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: '14px',
    padding: '8px',
    marginBottom: '16px',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    color: '#0f172a',
  };

  const tableHeaderCellStyle = {
    textAlign: 'left',
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: '12px',
    color: '#334155',
    padding: '8px 6px',
  };

  const dataCellStyle = {
    padding: '8px 6px',
    borderBottom: '1px solid #e2e8f0',
  };

  const numericCellStyle = {
    ...dataCellStyle,
    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: 500,
  };

  const diagnosticStyle = {
    marginTop: '16px',
    padding: '16px',
    borderLeft: '4px solid #1e293b',
    backgroundColor: '#f1f5f9',
    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '12px',
    lineHeight: 1.6,
    color: '#0f172a',
  };

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
      <div
        id="report-page-1"
        className="pdf-page bg-white w-[210mm] h-[297mm] p-12 overflow-hidden relative box-border"
        style={{
          width: '210mm',
          height: '297mm',
          padding: '48px',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#0f172a',
        }}
      >
        <header style={{ borderBottom: '4px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
          <h1 style={{ fontWeight: 900, fontSize: '30px', letterSpacing: '-0.02em', color: '#0f172a', textTransform: 'uppercase' }}>HARDWARE QUANTITATIVE UPGRADER DASHBOARD</h1>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#475569', fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Version {appVersion} // {timestamp}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '24px', fontSize: '14px' }}>
            <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', color: '#64748b' }}>Node Target</div>
              <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', color: '#0f172a', marginTop: '4px' }}>{nodeTarget}</div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', color: '#64748b' }}>Hardware</div>
              <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', color: '#0f172a', marginTop: '4px' }}>{hardware}</div>
            </div>
            <div style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', color: '#64748b' }}>Uptime</div>
              <div style={{ fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', color: '#0f172a', marginTop: '4px' }}>{formatUptime(metrics.uptimeSeconds)}</div>
            </div>
          </div>
        </header>

        <section>
          <h2 style={sectionTitleStyle}>Section 1: CPU &amp; TMA</h2>
          <table style={tableStyle}>
            <thead style={{ borderBottom: '2px solid #0f172a' }}>
              <tr>
                <th style={tableHeaderCellStyle}>Metric</th>
                <th style={tableHeaderCellStyle}>Value</th>
                <th style={tableHeaderCellStyle}>Unit</th>
                <th style={tableHeaderCellStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>CPI</td>
                <td style={numericCellStyle}>{formatMetric(metrics.cpi)}</td>
                <td style={dataCellStyle}>cycles/instr</td>
                <td style={dataCellStyle}>Ideal: &lt;1.0</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={dataCellStyle}>CPU Efficiency</td>
                <td style={numericCellStyle}>{formatMetric(metrics.ipsPerW)}</td>
                <td style={dataCellStyle}>M IPS/W</td>
                <td style={dataCellStyle}>Instructions per watt</td>
              </tr>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>Retiring</td>
                <td style={numericCellStyle}>{formatMetric(metrics.tmaRetiring)}</td>
                <td style={dataCellStyle}>%</td>
                <td style={dataCellStyle}>Useful work completed</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={dataCellStyle}>Bad Speculation</td>
                <td style={numericCellStyle}>{formatMetric(metrics.tmaBadSpec)}</td>
                <td style={dataCellStyle}>%</td>
                <td style={dataCellStyle}>Branch mispredict / machine clears</td>
              </tr>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>Front-End Bound</td>
                <td style={numericCellStyle}>{formatMetric(metrics.tmaFrontEnd)}</td>
                <td style={dataCellStyle}>%</td>
                <td style={dataCellStyle}>Decode / fetch stalls</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={dataCellStyle}>Back-End Bound</td>
                <td style={numericCellStyle}>{formatMetric(metrics.tmaBackEnd)}</td>
                <td style={dataCellStyle}>%</td>
                <td style={dataCellStyle}>Execution and memory stalls</td>
              </tr>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>Memory Bound</td>
                <td style={numericCellStyle}>{formatMetric(metrics.memBound)}</td>
                <td style={dataCellStyle}>%</td>
                <td style={dataCellStyle}>DRAM / cache latency pressure</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={dataCellStyle}>Core Bound</td>
                <td style={numericCellStyle}>{formatMetric(metrics.coreBound)}</td>
                <td style={dataCellStyle}>%</td>
                <td style={dataCellStyle}>Execution port/resource pressure</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '16px' }}>
            <div className="flex h-6 w-full rounded border border-slate-800 overflow-hidden mb-2" style={{ display: 'flex', height: '24px', width: '100%', borderRadius: '4px', border: '1px solid #1e293b', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ width: `${tmaRetiringPct}%`, backgroundColor: '#22c55e' }} />
              <div style={{ width: `${tmaBadSpecPct}%`, backgroundColor: '#f59e0b' }} />
              <div style={{ width: `${tmaFrontEndPct}%`, backgroundColor: '#3b82f6' }} />
              <div style={{ width: `${tmaBackEndPct}%`, backgroundColor: '#ef4444' }} />
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', color: '#334155' }}>
              Retiring {formatMetric(tmaRetiringPct)}% | Bad Spec {formatMetric(tmaBadSpecPct)}% | Front-End {formatMetric(tmaFrontEndPct)}% | Back-End {formatMetric(tmaBackEndPct)}%
            </div>
          </div>

          <div style={diagnosticStyle}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>&gt; DIAGNOSTIC OUTPUT:</span> {getCpuTmaConclusion(metrics.coreBound, metrics.memBound)}
          </div>
        </section>
      </div>

      <div
        id="report-page-2"
        className="pdf-page bg-white w-[210mm] h-[297mm] p-12 overflow-hidden relative box-border"
        style={{
          width: '210mm',
          height: '297mm',
          padding: '48px',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#0f172a',
        }}
      >
        <header style={{ borderBottom: '4px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
          <h1 style={{ fontWeight: 900, fontSize: '30px', letterSpacing: '-0.02em', color: '#0f172a', textTransform: 'uppercase' }}>HARDWARE QUANTITATIVE UPGRADER DASHBOARD</h1>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#475569', fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Section Continuation // {timestamp}
          </p>
        </header>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={sectionTitleStyle}>Section 2: NUMA &amp; Memory Hierarchy</h2>
          <table style={tableStyle}>
            <thead style={{ borderBottom: '2px solid #0f172a' }}>
              <tr>
                <th style={tableHeaderCellStyle}>Metric</th>
                <th style={tableHeaderCellStyle}>Value</th>
                <th style={tableHeaderCellStyle}>Unit</th>
                <th style={tableHeaderCellStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>AMAT</td>
                <td style={numericCellStyle}>{formatMetric(metrics.amat)}</td>
                <td style={dataCellStyle}>cycles</td>
                <td style={dataCellStyle}>Average memory access time</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={dataCellStyle}>NUMA Miss Rate</td>
                <td style={numericCellStyle}>{formatMetric(metrics.numaMiss)}</td>
                <td style={dataCellStyle}>%</td>
                <td style={dataCellStyle}>Cross-node fetches</td>
              </tr>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>RAM Node 0</td>
                <td style={numericCellStyle}>{formatMetric(bytesToGiB(ramNode0Bytes))}</td>
                <td style={dataCellStyle}>GiB</td>
                <td style={dataCellStyle}>NUMA node 0 memory usage</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={dataCellStyle}>RAM Node 1</td>
                <td style={numericCellStyle}>{formatMetric(bytesToGiB(ramNode1Bytes))}</td>
                <td style={dataCellStyle}>GiB</td>
                <td style={dataCellStyle}>NUMA node 1 memory usage</td>
              </tr>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>QPI Traffic</td>
                <td style={numericCellStyle}>{formatMetric(qpiTrafficMiB)}</td>
                <td style={dataCellStyle}>MiB</td>
                <td style={dataCellStyle}>Inter-socket data movement</td>
              </tr>
            </tbody>
          </table>

          <div style={diagnosticStyle}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>&gt; DIAGNOSTIC OUTPUT:</span> {getNumaConclusion(metrics.numaMiss, qpiTrafficMiB)}
          </div>
        </section>

        <section>
          <h2 style={sectionTitleStyle}>Section 3: Storage I/O &amp; Network</h2>
          <table style={tableStyle}>
            <thead style={{ borderBottom: '2px solid #0f172a' }}>
              <tr>
                <th style={tableHeaderCellStyle}>Metric</th>
                <th style={tableHeaderCellStyle}>Value</th>
                <th style={tableHeaderCellStyle}>Unit</th>
                <th style={tableHeaderCellStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>Queue Depth</td>
                <td style={numericCellStyle}>{formatMetric(metrics.queueDepth)}</td>
                <td style={dataCellStyle}>reqs</td>
                <td style={dataCellStyle}>In-flight block queue requests</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={dataCellStyle}>IOPS</td>
                <td style={numericCellStyle}>{formatMetric(metrics.iops)}</td>
                <td style={dataCellStyle}>ops/s</td>
                <td style={dataCellStyle}>Storage completion throughput</td>
              </tr>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={dataCellStyle}>Latency Inferred</td>
                <td style={numericCellStyle}>{formatMetric(inferredLatencyMs)}</td>
                <td style={dataCellStyle}>ms</td>
                <td style={dataCellStyle}>Little's Law estimate W = L / λ</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={dataCellStyle}>TCP Retransmits</td>
                <td style={numericCellStyle}>{formatMetric(metrics.tcpRetrans)}</td>
                <td style={dataCellStyle}>/s</td>
                <td style={dataCellStyle}>Network packet loss indicator</td>
              </tr>
            </tbody>
          </table>

          <div style={diagnosticStyle}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>&gt; DIAGNOSTIC OUTPUT:</span> {getIoNetworkConclusion(inferredLatencyMs, metrics.tcpRetrans)}
          </div>
        </section>
      </div>

      <div
        id="report-page-3"
        className="pdf-page bg-white w-[210mm] h-[297mm] p-12 overflow-hidden relative box-border"
        style={{
          width: '210mm',
          height: '297mm',
          padding: '48px',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#0f172a',
        }}
      >
        <header style={{ borderBottom: '4px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
          <h1 style={{ fontWeight: 900, fontSize: '30px', letterSpacing: '-0.02em', color: '#0f172a', textTransform: 'uppercase' }}>HARDWARE QUANTITATIVE UPGRADER DASHBOARD</h1>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#475569', fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Section Continuation // {timestamp}
          </p>
        </header>

        <section>
          <h2
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '14px',
              padding: '8px',
              marginBottom: '16px',
              letterSpacing: '0.08em',
            }}
          >
            SECTION 4: HARDWARE LIFECYCLE &amp; UPGRADE MATRIX
          </h2>

          {upgradeRecommendations.map((recommendation) => (
            <div key={recommendation.component} style={{ marginBottom: '16px', border: '1px solid #cbd5e1' }}>
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  borderBottom: '1px solid #cbd5e1',
                  padding: '8px',
                  fontWeight: 700,
                  fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif',
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  letterSpacing: '0.03em',
                }}
              >
                <span>{recommendation.component}</span>
                <span style={{ color: recommendation.statusColor }}>{recommendation.statusText}</span>
              </div>
              <div
                style={{
                  padding: '12px',
                  fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '12px',
                  color: '#1e293b',
                  lineHeight: 1.6,
                }}
              >
                {recommendation.explanation}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

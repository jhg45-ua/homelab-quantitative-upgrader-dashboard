import { useState, useEffect } from 'preact/hooks';
import type { MetricsState, HistoryFrame, LogEntry } from '../types';
import { parsePromQLResponse, parsePromQLResponseByLabel, formatMetric, formatUptime } from '../utils/formatters';

// ============================================================================
// TMA DERIVATION CONSTANTS
// ============================================================================
// These constants calibrate the Top-Down Microarchitecture Analysis heuristics
// for Xeon E5-2670 (Sandy Bridge-EP, 16 cores, 2.6-3.3 GHz)

/** CPI scaling: divides raw CPI by this factor to normalize to [0, 1] range */
const CPI_PENALTY_SCALE = 3;

/** Cache miss rate scaling: divides miss rate by this to normalize */
const CACHE_PENALTY_SCALE = 50;

/** Context switches scaling: divides switches/sec by this to normalize */
const CTX_PENALTY_SCALE = 50000;

/** Mutex contention scaling: context switches per this unit map to % contention */
const MUTEX_SCALING_FACTOR = 10000;

function deriveTMA(cpi: number, cacheMiss: number, ctxSwitches: number) {
  const cpiPenalty = Math.min(cpi / CPI_PENALTY_SCALE, 1);
  const cachePenalty = Math.min(cacheMiss / CACHE_PENALTY_SCALE, 1);
  const ctxPenalty = Math.min(ctxSwitches / CTX_PENALTY_SCALE, 1);
  const backEnd = Math.round(Math.max(10, cpiPenalty * 40 + cachePenalty * 30));
  const badSpec = Math.round(Math.max(2, ctxPenalty * 15));
  const frontEnd = Math.round(Math.max(3, 15 - cpiPenalty * 8));
  const retiring = Math.max(5, 100 - backEnd - badSpec - frontEnd);

  return { retiring, badSpec, frontEnd, backEnd };
}

const HOST = 'r720-baremetal';

async function fetchMetric(metricName: string, rawQuery?: string): Promise<number | null> {
  const query = rawQuery ?? `${metricName}{host="${HOST}"}`;
  try {
    const res = await fetch(`/api/v1/query?query=${encodeURIComponent(query)}`);
    if (!res.ok) {
      console.error(`[HQUD] HTTP ${res.status} for query: ${query}`);
      return null;
    }
    const json = await res.json();
    return parsePromQLResponse(metricName, json);
  } catch (err: any) {
    console.error(`[HQUD] Network error for ${metricName}:`, err.message);
    return null;
  }
}

async function fetchMetricSeriesByLabel(metricName: string, labelName: string, rawQuery?: string): Promise<Record<string, number>> {
  const query = rawQuery ?? `${metricName}{host="${HOST}"}`;
  try {
    const res = await fetch(`/api/v1/query?query=${encodeURIComponent(query)}`);
    if (!res.ok) {
      console.error(`[HQUD] HTTP ${res.status} for query: ${query}`);
      return {};
    }
    const json = await res.json();
    return parsePromQLResponseByLabel(metricName, json, labelName);
  } catch (err: any) {
    console.error(`[HQUD] Network error for ${metricName}:`, err.message);
    return {};
  }
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsState>({
    powerW: 0, ipsPerW: 0, amat: 0, numaMiss: 0,
    numaNodeCpuUsagePercentByNode: {},
    numaNodeRamUsedBytesByNode: {},
    numaNodeRamTotalBytesByNode: {},
    numaInterconnectTrafficBytesTotalByNode: {},
    numaNodesAvailable: [],
    memBoundValid: false, coreBoundValid: false, tcpRetrans: 0,
    ips: 0, cpi: 0, cacheMiss: 0, ctxSwitches: 0, uptimeSeconds: 0,
    tmaRetiring: 0, tmaBadSpec: 0, tmaFrontEnd: 0, tmaBackEnd: 0,
    memBound: 0, coreBound: 0,
    queueDepth: 0, iops: 0, mutexContention: 0,
  });

  const [history, setHistory] = useState<HistoryFrame[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const pushLog = (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-99), { timestamp: ts, level, message }]);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          powerW, ipsPerW, amat, numaMiss, tcpRetrans,
          ips, cpi, cacheMiss, ctxSwitches, uptimeSeconds,
          queueDepth, iops, memBoundRaw, coreBoundRaw,
          numaNodeCpuByNode,
          numaNodeRamUsedByNode,
          numaNodeRamTotalByNode,
          numaInterconnectTrafficByNode,
        ] = await Promise.all([
          fetchMetric('hqud_power_watts'),
          fetchMetric('hqud_efficiency_ips_per_watt'),
          fetchMetric('hqud_cpu_amat_cycles'),
          fetchMetric('hqud_numa_miss_rate'),
          fetchMetric('hqud_net_tcp_retransmits_ps'),
          fetchMetric('hqud_cpu_ips'),
          fetchMetric('hqud_cpu_cpi'),
          fetchMetric('hqud_cpu_cache_miss_rate'),
          fetchMetric('hqud_os_context_switches_ps'),
          fetchMetric('hqud_os_uptime_seconds'),
          fetchMetric('hqud_blk_queue_depth'),
          fetchMetric('hqud_blk_iops'),
          fetchMetric('hqud_tma_mem_bound'),
          fetchMetric('hqud_tma_core_bound'),
          fetchMetricSeriesByLabel('hqud_numa_node_cpu_usage_percent', 'node'),
          fetchMetricSeriesByLabel('hqud_numa_node_ram_used_bytes', 'node'),
          fetchMetricSeriesByLabel('hqud_numa_node_ram_total_bytes', 'node'),
          fetchMetricSeriesByLabel('hqud_numa_interconnect_traffic_bytes_total', 'node'),
        ]);

        setMetrics(() => {
          const nextCpi = Number(cpi) || 0;
          const nextCacheMiss = Number(cacheMiss) || 0;
          const nextCtxSwitches = Number(ctxSwitches) || 0;
          const tma = deriveTMA(nextCpi, nextCacheMiss, nextCtxSwitches);

          const next: MetricsState = {
            powerW:        Number(powerW) || 0,
            ipsPerW:       Number(ipsPerW) || 0,
            amat:          Number(amat) || 0,
            numaMiss:      Number(numaMiss) || 0,
            numaNodeCpuUsagePercentByNode: numaNodeCpuByNode,
            numaNodeRamUsedBytesByNode: numaNodeRamUsedByNode,
            numaNodeRamTotalBytesByNode: numaNodeRamTotalByNode,
            numaInterconnectTrafficBytesTotalByNode: numaInterconnectTrafficByNode,
            numaNodesAvailable: Array.from(new Set([
              ...Object.keys(numaNodeCpuByNode),
              ...Object.keys(numaNodeRamUsedByNode),
              ...Object.keys(numaNodeRamTotalByNode),
              ...Object.keys(numaInterconnectTrafficByNode),
            ])).sort(),
            memBoundValid: memBoundRaw !== null,
            coreBoundValid: coreBoundRaw !== null,
            tcpRetrans:    Number(tcpRetrans) || 0,
            ips:           Number(ips) || 0,
            cpi:           nextCpi,
            cacheMiss:     nextCacheMiss,
            ctxSwitches:   nextCtxSwitches,
            uptimeSeconds: Number(uptimeSeconds) || 0,
            tmaRetiring:   tma.retiring,
            tmaBadSpec:    tma.badSpec,
            tmaFrontEnd:   tma.frontEnd,
            tmaBackEnd:    tma.backEnd,
            memBound:      Number(memBoundRaw) || 0,
            coreBound:     Number(coreBoundRaw) || 0,
            queueDepth:    Number(queueDepth) || 0,
            iops:          Number(iops) || 0,
            mutexContention: Math.min(100, (nextCtxSwitches / MUTEX_SCALING_FACTOR) * 100),
          };

          // Expanded audit log — all metrics visible in /console
          pushLog('INFO',
            `POLL — ` +
            `pwr:${formatMetric(powerW)}W ` +
            `cpi:${formatMetric(nextCpi)} ` +
            `amat:${formatMetric(amat)}cyc ` +
            `numa:${formatMetric(numaMiss)}% ` +
            `numa_nodes:${next.numaNodesAvailable.join(',') || '-'} ` +
            `numa_node0_cpu:${formatMetric(next.numaNodeCpuUsagePercentByNode.node0)} ` +
            `numa_node1_cpu:${formatMetric(next.numaNodeCpuUsagePercentByNode.node1)} ` +
            `numa_interconnect_node0_bytes_total:${formatMetric(next.numaInterconnectTrafficBytesTotalByNode.node0)} ` +
            `numa_interconnect_node1_bytes_total:${formatMetric(next.numaInterconnectTrafficBytesTotalByNode.node1)} ` +
            `tcp:${formatMetric(tcpRetrans)} ` +
            `miss:${formatMetric(cacheMiss)}% ` +
            `mem_bnd:${formatMetric(memBoundRaw)}% ` +
            `core_bnd:${formatMetric(coreBoundRaw)}% ` +
            `qd:${formatMetric(queueDepth)} ` +
            `iops:${formatMetric(iops)} ` +
            `up:${formatUptime(uptimeSeconds)}`
          );

          const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
          setHistory(h => [...h, {
            time: ts,
            cpi: next.cpi,
            cacheMiss: next.cacheMiss,
            ctxSwitches: next.ctxSwitches,
            mutexContention: next.mutexContention,
          }].slice(-20));

          return next;
        });

      } catch (err: any) {
        pushLog('ERROR', `Fatal poll error: ${err.message}`);
      }
    };

    fetchAll();
    const iv = setInterval(fetchAll, 5000);
    return () => clearInterval(iv);
  }, []);

  return { metrics, history, logs };
}

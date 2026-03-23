import { useState, useEffect } from 'preact/hooks';
import type { MetricsState, HistoryFrame, LogEntry } from '../types';
import { parsePromQLResponse, formatMetric, formatUptime } from '../utils/formatters';

function deriveTMA(cpi: number, cacheMiss: number, ctxSwitches: number) {
  const cpiPenalty = Math.min(cpi / 3, 1);
  const cachePenalty = Math.min(cacheMiss / 50, 1);
  const ctxPenalty = Math.min(ctxSwitches / 50000, 1);
  const backEnd = Math.round(Math.max(10, cpiPenalty * 40 + cachePenalty * 30));
  const badSpec = Math.round(Math.max(2, ctxPenalty * 15));
  const frontEnd = Math.round(Math.max(3, 15 - cpiPenalty * 8));
  const retiring = Math.max(5, 100 - backEnd - badSpec - frontEnd);

  // L2 split heuristic: cache pressure drives Memory Bound, remaining backend pressure is Core Bound.
  const memShare = Math.min(0.85, Math.max(0.2, cachePenalty * 0.75 + cpiPenalty * 0.15));
  const memBound = Number((backEnd * memShare).toFixed(2));
  const coreBound = Number((backEnd - memBound).toFixed(2));

  return { retiring, badSpec, frontEnd, backEnd, memBound, coreBound };
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

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsState>({
    powerW: 0, ipsPerW: 0, amat: 0, numaMiss: 0, tcpRetrans: 0,
    ips: 0, cpi: 0, cacheMiss: 0, ctxSwitches: 0, uptimeSeconds: 0,
    tmaRetiring: 25, tmaBadSpec: 5, tmaFrontEnd: 10, tmaBackEnd: 60,
    memBound: 35, coreBound: 25,
    queueDepth: 12, iops: 4500, mutexContention: 0,
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
          queueDepth, iops,
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
        ]);

        setMetrics(prev => {
          const nextCpi = cpi ?? prev.cpi;
          const nextCacheMiss = cacheMiss ?? prev.cacheMiss;
          const nextCtxSwitches = ctxSwitches ?? prev.ctxSwitches;
          const tma = deriveTMA(nextCpi, nextCacheMiss, nextCtxSwitches);

          const next: MetricsState = {
            powerW:        powerW     ?? prev.powerW,
            ipsPerW:       ipsPerW    ?? prev.ipsPerW,
            amat:          amat       ?? prev.amat,
            numaMiss:      numaMiss   ?? prev.numaMiss,
            tcpRetrans:    tcpRetrans !== null ? tcpRetrans : prev.tcpRetrans,
            ips:           ips        ?? prev.ips,
            cpi:           nextCpi,
            cacheMiss:     nextCacheMiss,
            ctxSwitches:   nextCtxSwitches,
            uptimeSeconds: uptimeSeconds ?? prev.uptimeSeconds,
            tmaRetiring:   tma.retiring,
            tmaBadSpec:    tma.badSpec,
            tmaFrontEnd:   tma.frontEnd,
            tmaBackEnd:    tma.backEnd,
            memBound:      tma.memBound,
            coreBound:     tma.coreBound,
            queueDepth:    queueDepth !== null ? queueDepth : 12,   // Mock fallback
            iops:          iops       !== null ? iops       : 4500, // Mock fallback
            mutexContention: Math.min(100, (nextCtxSwitches / 10000) * 100),
          };

          // Expanded audit log — all metrics visible in /console
          pushLog('INFO',
            `POLL — ` +
            `pwr:${formatMetric(powerW)}W ` +
            `cpi:${formatMetric(nextCpi)} ` +
            `amat:${formatMetric(amat)}cyc ` +
            `numa:${formatMetric(numaMiss)}% ` +
            `tcp:${formatMetric(tcpRetrans)} ` +
            `miss:${formatMetric(cacheMiss)}% ` +
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

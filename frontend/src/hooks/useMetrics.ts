import { useState, useEffect, useRef } from 'preact/hooks';
import type { MetricsState, HistoryFrame, PromQLResponse, LogEntry } from '../types';

/**
 * Derives TMA-like percentages from available metrics:
 * - High CPI + high cache miss → Back-End Bound
 * - High context switches → Bad Speculation proxy
 * - Remaining budget split between Retiring and Front-End
 */
function deriveTMA(cpi: number, cacheMiss: number, ctxSwitches: number) {
  // Normalize CPI: ideal is ~0.5, bad is >3
  const cpiPenalty = Math.min(cpi / 3, 1); // 0..1
  const cachePenalty = Math.min(cacheMiss / 50, 1); // 0..1
  const ctxPenalty = Math.min(ctxSwitches / 50000, 1); // 0..1

  const backEnd = Math.round(Math.max(10, (cpiPenalty * 40 + cachePenalty * 30)));
  const badSpec = Math.round(Math.max(2, ctxPenalty * 15));
  const frontEnd = Math.round(Math.max(3, 15 - cpiPenalty * 8));
  const retiring = Math.max(5, 100 - backEnd - badSpec - frontEnd);

  return { retiring, badSpec, frontEnd, backEnd };
}

export function useMetrics() {
  const startTime = useRef(Date.now());

  const [metrics, setMetrics] = useState<MetricsState>({
    powerW: 0, ipsPerW: 0, amat: 0, numaMiss: 0, tcpRetrans: 0,
    ips: 0, cpi: 0, cacheMiss: 0, ctxSwitches: 0, uptimeSeconds: 0,
    tmaRetiring: 25, tmaBadSpec: 5, tmaFrontEnd: 10, tmaBackEnd: 60,
    queueDepth: 0, iops: 0, mutexContention: 0,
  });

  const [history, setHistory] = useState<HistoryFrame[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const pushLog = (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-99), { timestamp, level, message }]);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const HOST = 'r720-baremetal';
        const q = async (query: string) => {
          const res = await fetch(`/api/v1/query?query=${query}{host="${HOST}"}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json: PromQLResponse = await res.json();
          if (!json.data || !json.data.result || json.data.result.length === 0) {
            return null;
          }
          const valStr = json.data.result[0].value[1];
          const val = parseFloat(valStr);
          pushLog('INFO', `GET ${query} -> ${valStr}`);
          return val;
        };

        const reqs = await Promise.all([
          q('hqud_power_watts').catch(() => null),
          q('hqud_efficiency_ips_per_watt').catch(() => null),
          q('hqud_cpu_amat_cycles').catch(() => null),
          q('hqud_numa_miss_rate').catch(() => null),
          q('hqud_net_tcp_retransmits_ps').catch(() => null),
          q('hqud_cpu_ips').catch(() => null),
          q('hqud_cpu_cpi').catch(() => null),
          q('hqud_cpu_cache_miss_rate').catch(() => null),
          q('hqud_os_context_switches_ps').catch(() => null),
        ]);

        setMetrics(prev => {
          const cpi = reqs[6] ?? prev.cpi;
          const cacheMiss = reqs[7] ?? prev.cacheMiss;
          const ctxSwitches = reqs[8] ?? prev.ctxSwitches;
          const tma = deriveTMA(cpi, cacheMiss, ctxSwitches);

          // Derive uptime from agent connection time
          const uptimeSeconds = (Date.now() - startTime.current) / 1000;

          // Derive approximate contention from context switches (normalized)
          const mutexContention = Math.min(100, (ctxSwitches / 10000) * 100);

          const next: MetricsState = {
            powerW: reqs[0] ?? prev.powerW,
            ipsPerW: reqs[1] ?? prev.ipsPerW,
            amat: reqs[2] ?? prev.amat,
            numaMiss: reqs[3] ?? prev.numaMiss,
            tcpRetrans: reqs[4] ?? prev.tcpRetrans,
            ips: reqs[5] ?? prev.ips,
            cpi,
            cacheMiss,
            ctxSwitches,
            uptimeSeconds,
            tmaRetiring: tma.retiring,
            tmaBadSpec: tma.badSpec,
            tmaFrontEnd: tma.frontEnd,
            tmaBackEnd: tma.backEnd,
            queueDepth: prev.queueDepth, // No source yet
            iops: prev.iops, // No source yet
            mutexContention,
          };

          const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
          setHistory(hPrev => [...hPrev, {
            time: ts, cpi: next.cpi, cacheMiss: next.cacheMiss,
            ctxSwitches: next.ctxSwitches, mutexContention: next.mutexContention,
          }].slice(-20));

          return next;
        });

      } catch (err: any) {
        pushLog('ERROR', `TSDB Fetch Timeout or Proxy Error: ${err.message}`);
      }
    };

    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  return { metrics, history, logs };
}

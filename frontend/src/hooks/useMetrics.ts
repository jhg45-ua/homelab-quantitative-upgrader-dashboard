import { useState, useEffect } from 'preact/hooks';
import type { MetricsState, HistoryFrame, PromQLResponse, LogEntry } from '../types';

function deriveTMA(cpi: number, cacheMiss: number, ctxSwitches: number) {
  const cpiPenalty = Math.min(cpi / 3, 1);
  const cachePenalty = Math.min(cacheMiss / 50, 1);
  const ctxPenalty = Math.min(ctxSwitches / 50000, 1);

  const backEnd = Math.round(Math.max(10, (cpiPenalty * 40 + cachePenalty * 30)));
  const badSpec = Math.round(Math.max(2, ctxPenalty * 15));
  const frontEnd = Math.round(Math.max(3, 15 - cpiPenalty * 8));
  const retiring = Math.max(5, 100 - backEnd - badSpec - frontEnd);

  return { retiring, badSpec, frontEnd, backEnd };
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsState>({
    powerW: 0, ipsPerW: 0, amat: 0, numaMiss: 0, tcpRetrans: 0,
    ips: 0, cpi: 0, cacheMiss: 0, ctxSwitches: 0, uptimeSeconds: 0,
    tmaRetiring: 25, tmaBadSpec: 5, tmaFrontEnd: 10, tmaBackEnd: 60,
    queueDepth: 12, iops: 4500, mutexContention: 0,
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
        const q = async (query: string, rawQuery = false) => {
          const finalQuery = rawQuery ? query : `${query}{host="${HOST}"}`;
          const res = await fetch(`/api/v1/query?query=${finalQuery}`);
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
          q(`time() - node_boot_time_seconds{host="${HOST}"}`, true).catch(() => null),
          q('hqud_blk_queue_depth').catch(() => null),
          q('hqud_blk_iops').catch(() => null),
        ]);

        setMetrics(prev => {
          const cpi = reqs[6] ?? prev.cpi;
          const cacheMiss = reqs[7] ?? prev.cacheMiss;
          const ctxSwitches = reqs[8] ?? prev.ctxSwitches;
          const tma = deriveTMA(cpi, cacheMiss, ctxSwitches);
          const mutexContention = Math.min(100, (ctxSwitches / 10000) * 100);

          return {
            powerW: reqs[0] ?? prev.powerW,
            ipsPerW: reqs[1] ?? prev.ipsPerW,
            amat: reqs[2] ?? prev.amat,
            numaMiss: reqs[3] ?? prev.numaMiss,
            tcpRetrans: reqs[4] ?? prev.tcpRetrans,
            ips: reqs[5] ?? prev.ips,
            cpi,
            cacheMiss,
            ctxSwitches,
            uptimeSeconds: reqs[9] ?? prev.uptimeSeconds,
            tmaRetiring: tma.retiring,
            tmaBadSpec: tma.badSpec,
            tmaFrontEnd: tma.frontEnd,
            tmaBackEnd: tma.backEnd,
            queueDepth: reqs[10] ?? 12, // Mock if missing
            iops: reqs[11] ?? 4500,    // Mock if missing
            mutexContention,
          };
        });

        // Update history separately to avoid nested state issues if any
        setHistory(hPrev => {
          const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
          // Note: accessing reqs directly for history to keep it simple
          return [...hPrev, {
            time: ts, 
            cpi: reqs[6] || 0, 
            cacheMiss: reqs[7] || 0,
            ctxSwitches: reqs[8] || 0, 
            mutexContention: Math.min(100, ((reqs[8] || 0) / 10000) * 100)
          }].slice(-20);
        });

      } catch (err: any) {
        pushLog('ERROR', `TSDB Fetch Timeout: ${err.message}`);
      }
    };

    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  return { metrics, history, logs };
}

import { useState, useEffect } from 'preact/hooks';
import type { MetricsState, HistoryFrame, PromQLResponse, LogEntry } from '../types';

export function useMetrics() {
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
        const q = async (query: string, silent = false) => {
          const res = await fetch(`/api/v1/query?query=${query}{host="${HOST}"}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json: PromQLResponse = await res.json();
          if (!json.data || !json.data.result || json.data.result.length === 0) {
            // Only log warnings for core metrics, not for optional/future ones
            if (!silent) pushLog('WARN', `Data empty for ${query}`);
            return null;
          }
          const valStr = json.data.result[0].value[1];
          const val = parseFloat(valStr);
          pushLog('INFO', `GET ${query} -> ${valStr}`);
          return val;
        };

        // Core metrics (warn if empty)
        const core = await Promise.all([
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

        // Optional/future metrics (silent — no WARN spam)
        const optional = await Promise.all([
          q('hqud_system_uptime_seconds', true).catch(() => null),
          q('hqud_tma_retiring_pct', true).catch(() => null),
          q('hqud_tma_bad_speculation_pct', true).catch(() => null),
          q('hqud_tma_frontend_bound_pct', true).catch(() => null),
          q('hqud_tma_backend_bound_pct', true).catch(() => null),
          q('hqud_blk_queue_depth', true).catch(() => null),
          q('hqud_blk_iops', true).catch(() => null),
          q('hqud_mutex_contention_pct', true).catch(() => null),
        ]);

        setMetrics(prev => {
          const next: MetricsState = {
            powerW: core[0] ?? prev.powerW,
            ipsPerW: core[1] ?? prev.ipsPerW,
            amat: core[2] ?? prev.amat,
            numaMiss: core[3] ?? prev.numaMiss,
            tcpRetrans: core[4] ?? prev.tcpRetrans,
            ips: core[5] ?? prev.ips,
            cpi: core[6] ?? prev.cpi,
            cacheMiss: core[7] ?? prev.cacheMiss,
            ctxSwitches: core[8] ?? prev.ctxSwitches,
            uptimeSeconds: optional[0] ?? prev.uptimeSeconds,
            tmaRetiring: optional[1] ?? prev.tmaRetiring,
            tmaBadSpec: optional[2] ?? prev.tmaBadSpec,
            tmaFrontEnd: optional[3] ?? prev.tmaFrontEnd,
            tmaBackEnd: optional[4] ?? prev.tmaBackEnd,
            queueDepth: optional[5] ?? prev.queueDepth,
            iops: optional[6] ?? prev.iops,
            mutexContention: optional[7] ?? prev.mutexContention,
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

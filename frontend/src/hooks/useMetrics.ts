import { useState, useEffect } from 'preact/hooks';
import type { MetricsState, HistoryFrame, PromQLResponse, LogEntry } from '../types';

export function useMetrics() {
  const [metrics, setMetrics] = useState<MetricsState>({
    powerW: 0, ipsPerW: 0, amat: 0, numaMiss: 0, tcpRetrans: 0,
    ips: 0, cpi: 0, cacheMiss: 0, ctxSwitches: 0, uptimeSeconds: 0,
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
            pushLog('WARN', `Data empty for ${query}`);
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
          q('hqud_system_uptime_seconds').catch(() => null)
        ]);

        setMetrics(prev => {
          const next = {
            powerW: reqs[0] ?? prev.powerW,
            ipsPerW: reqs[1] ?? prev.ipsPerW,
            amat: reqs[2] ?? prev.amat,
            numaMiss: reqs[3] ?? prev.numaMiss,
            tcpRetrans: reqs[4] ?? prev.tcpRetrans,
            ips: reqs[5] ?? prev.ips,
            cpi: reqs[6] ?? prev.cpi,
            cacheMiss: reqs[7] ?? prev.cacheMiss,
            ctxSwitches: reqs[8] ?? prev.ctxSwitches,
            uptimeSeconds: reqs[9] ?? prev.uptimeSeconds
          };

          const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
          setHistory(hPrev => [...hPrev, {
            time: ts, cpi: next.cpi, cacheMiss: next.cacheMiss, ctxSwitches: next.ctxSwitches
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

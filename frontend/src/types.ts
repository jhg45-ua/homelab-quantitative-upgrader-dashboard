export interface PromQLResult {
  metric: Record<string, string>;
  value: [number, string]; // [timestamp, valueString]
}

export interface PromQLResponse {
  status: string;
  data: {
    resultType: string;
    result: PromQLResult[];
  };
}

export interface MetricsState {
  powerW: number;
  ipsPerW: number;
  amat: number;
  numaMiss: number;
  tcpRetrans: number;
  ips: number;
  cpi: number;
  cacheMiss: number;
  ctxSwitches: number;
  uptimeSeconds: number;
}

export interface HistoryFrame {
  time: string;
  cpi: number;
  cacheMiss: number;
  ctxSwitches: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface SystemConfig {
  node_name: string;
  hardware_desc: string;
  specs: {
    cores: number;
    peak_mips: number;
    max_mem_bw_gbps: number;
  };
}

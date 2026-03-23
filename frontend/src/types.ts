export interface PromQLResult {
  metric: Record<string, string>;
  value: [number, string];
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
  numaNode0Cpu: number;
  numaInterconnectTraffic: number;
  tcpRetrans: number;
  ips: number;
  cpi: number;
  cacheMiss: number;
  ctxSwitches: number;
  uptimeSeconds: number;
  tmaRetiring: number;
  tmaBadSpec: number;
  tmaFrontEnd: number;
  tmaBackEnd: number;
  memBound: number;
  coreBound: number;
  queueDepth: number;
  iops: number;
  mutexContention: number;
}

export interface HistoryFrame {
  time: string;
  cpi: number;
  cacheMiss: number;
  ctxSwitches: number;
  mutexContention: number;
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

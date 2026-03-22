import { Terminal } from 'lucide-preact';
import type { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
}

export function HardwareConsole({ logs }: Props) {
  const getColor = (level: string) => {
    switch(level) {
      case 'INFO': return 'text-[#0D9488]';
      case 'WARN': return 'text-yellow-500';
      case 'ERROR': return 'text-[#DC2626]';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-[#0A0A0A] rounded-sm shadow-md border border-slate-800 flex flex-col overflow-hidden max-h-48 w-full">
       <div className="px-4 py-2 bg-[#0F172A] border-b border-slate-800 flex items-center shrink-0">
          <Terminal size={14} className="text-slate-400 mr-2" />
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Hardware Audit Console — //ttyS0</span>
       </div>
       <div className="p-3 md:p-4 font-mono text-[9px] md:text-[11px] leading-relaxed flex flex-col gap-1 overflow-y-auto w-full break-all h-32">
         {logs.length === 0 ? (
           <div className="text-slate-600 animate-pulse">Awaiting kernel telemetry streams...</div>
         ) : (
           [...logs].reverse().map((log, i) => (
             <div key={i} className="whitespace-pre-wrap text-slate-300">
                <span className="text-slate-500">[{log.timestamp}]</span> | <span className={`font-bold ${getColor(log.level)}`}>[{log.level}]</span> | {log.message}
             </div>
           ))
         )}
       </div>
    </div>
  );
}

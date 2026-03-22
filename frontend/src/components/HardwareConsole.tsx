import { Terminal } from 'lucide-preact';
import type { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
}

export function HardwareConsole({ logs }: Props) {
  const getColor = (level: string) => {
    switch(level) {
      case 'INFO': return 'text-teal-400';
      case 'WARN': return 'text-yellow-400';
      case 'ERROR': return 'text-red-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-slate-800 flex flex-col overflow-hidden max-h-48 w-full backdrop-blur-sm">
       <div className="px-3 py-1.5 bg-[#060e20] border-b border-slate-800 flex items-center shrink-0">
          <Terminal size={12} className="text-slate-500 mr-2" />
          <span className="text-[9px] font-semibold tracking-widest text-slate-500 uppercase">Hardware Audit Console — //ttyS0</span>
       </div>
       <div className="p-3 font-mono text-[9px] md:text-[11px] leading-relaxed flex flex-col gap-1 overflow-y-auto w-full break-all h-28 md:h-32">
         {logs.length === 0 ? (
           <div className="text-slate-600 animate-pulse">Awaiting kernel telemetry streams...</div>
         ) : (
           [...logs].reverse().map((log, i) => (
             <div key={i} className="whitespace-pre-wrap text-slate-300">
                <span className="text-slate-600">[{log.timestamp}]</span> <span className="text-slate-700">|</span> <span className={`font-bold ${getColor(log.level)}`}>[{log.level}]</span> <span className="text-slate-700">|</span> {log.message}
             </div>
           ))
         )}
       </div>
    </div>
  );
}

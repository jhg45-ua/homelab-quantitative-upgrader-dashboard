import { Terminal } from 'lucide-preact';
import type { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
  fullScreen?: boolean;
}

export function HardwareConsole({ logs, fullScreen = false }: Props) {
  const getColor = (level: string) => {
    switch(level) {
      case 'INFO': return 'text-teal-400';
      case 'WARN': return 'text-yellow-400';
      case 'ERROR': return 'text-red-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className={`bg-[#0A0A0A] border border-slate-800 flex flex-col overflow-hidden w-full backdrop-blur-sm ${fullScreen ? 'h-full border-none' : 'max-h-72'}`}>
       <div className="px-4 py-2.5 bg-[#060e20] border-b border-slate-800 flex items-center shrink-0">
          <Terminal size={14} className="text-slate-500 mr-3" />
          <span className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase">Hardware Audit Console — //ttyS0</span>
       </div>
       <div className={`p-6 font-mono text-[11px] md:text-sm leading-relaxed flex flex-col gap-1.5 overflow-y-auto w-full break-all ${fullScreen ? 'flex-1' : 'h-48'}`}>
         {logs.length === 0 ? (
            <div className="text-slate-600 animate-pulse text-xs uppercase font-black">Awaiting kernel telemetry streams...</div>
         ) : (
            [...logs].reverse().map((log, i) => (
              <div key={i} className="whitespace-pre-wrap text-slate-300 border-b border-slate-800/20 pb-1.5">
                 <span className="text-slate-600 font-bold">[{log.timestamp}]</span> <span className="text-slate-700">|</span> <span className={`font-black ${getColor(log.level)}`}>[{log.level}]</span> <span className="text-slate-700">|</span> {log.message}
              </div>
            ))
         )}
       </div>
    </div>
  );
}

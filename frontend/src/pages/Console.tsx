import type { LogEntry } from '../types';
import { HardwareConsole } from '../components/HardwareConsole';

interface Props {
  logs: LogEntry[];
}

export function Console({ logs }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] p-12 md:p-16 xl:p-24">
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between">
        <h2 className="text-xs font-mono font-semibold tracking-wider text-slate-500 uppercase">
          //ttyS0 : Global Terminal Proxy
        </h2>
        <div className="flex gap-2">
           <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
           <div className="w-2 h-2 rounded-full bg-slate-700"></div>
           <div className="w-2 h-2 rounded-full bg-slate-700"></div>
        </div>
      </header>
      
      <div className="flex-1 p-0 overflow-hidden w-full h-full relative">
         <div className="absolute inset-0 pb-12">
            {/* We reuse the component we created but remove its internal max-height constraint entirely */}
            <HardwareConsole logs={logs} fullScreen={true} />
         </div>
      </div>
    </div>
  );
}

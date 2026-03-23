import { Route, Switch, Link } from 'wouter';
import { LayoutDashboard, Terminal, Activity, BookOpen } from 'lucide-preact';
import { useMetrics } from './hooks/useMetrics';
import { useSystemConfig } from './hooks/useSystemConfig';

import { Overview } from './pages/Overview';
import { DeepDive } from './pages/DeepDive';
import { HardwareConsole } from './components/HardwareConsole';
import { MicroarchitectureWiki } from './pages/MicroarchitectureWiki';

function NavLink({ href, icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href}>
      <a className="flex items-center gap-4 px-6 py-3 text-sm font-mono font-black text-slate-500 hover:text-slate-100 hover:bg-slate-800/50 transition-all rounded-sm group uppercase tracking-widest border-l-2 border-transparent hover:border-teal-500">
        <span className="group-hover:text-teal-400 transition-colors">{icon}</span>
        {label}
      </a>
    </Link>
  );
}

export function App() {
  const { metrics, history, logs } = useMetrics();
  const systemConfig = useSystemConfig();

  return (
    <div className="flex h-screen bg-[#060B16] text-slate-300 font-sans selection:bg-teal-500/30 selection:text-teal-200 overflow-hidden">
      
      {/* Sidebar - Balanced Premium width (v2.7.5) */}
      <aside className="w-72 border-r border-slate-800 bg-[#0A0F1D]/80 backdrop-blur-md hidden md:flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-800 flex items-center gap-4">
          <div className="w-4 h-4 bg-teal-500 shadow-[0_0_10px_#14b8a6]"></div>
          <h1 className="text-xl font-black tracking-tighter text-slate-100 uppercase italic">HQUD Foundry</h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-4">
          <NavLink href="/" icon={<LayoutDashboard size={18} />} label="Overview" />
          <NavLink href="/deep-dive" icon={<Activity size={18} />} label="Scientific Deep Dive" />
          <NavLink href="/console" icon={<Terminal size={18} />} label="Hardware Console" />
          <NavLink href="/wiki" icon={<BookOpen size={18} />} label="µArch Wiki" />
        </nav>

        <div className="p-8 border-t border-slate-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
            <span className="text-[10px] font-mono text-slate-500 font-black uppercase tracking-widest">eBPF Stream Active</span>
          </div>
          <div className="text-[10px] font-mono text-slate-700 font-bold uppercase tracking-widest flex justify-between">
            <span>Core v2.7.5</span>
            <span className="text-slate-800">JH-G // R720-A</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 w-full h-full overflow-y-auto p-12 xl:p-14 bg-slate-900/50">
        <Switch>
          <Route path="/">
            <Overview metrics={metrics} systemConfig={systemConfig} />
          </Route>
          <Route path="/deep-dive">
            <DeepDive metrics={metrics} history={history} systemConfig={systemConfig} />
          </Route>
          <Route path="/console">
            <div className="flex flex-col h-full gap-8">
               <header className="flex items-center justify-between gap-6 px-4">
                 <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-100 uppercase line-clamp-1">Hardware Console</h2>
                 <span className="text-[10px] font-mono text-teal-400 bg-teal-400/10 border border-teal-500/30 px-4 py-2 uppercase tracking-widest font-black hidden md:block">Real-time Kernel Stream</span>
               </header>
               <div className="flex-1 min-h-[500px]">
                 <HardwareConsole logs={logs} fullScreen={true} />
               </div>
            </div>
          </Route>
          <Route path="/wiki">
            <MicroarchitectureWiki metrics={metrics} systemConfig={systemConfig} />
          </Route>
        </Switch>
      </main>
    </div>
  );
}

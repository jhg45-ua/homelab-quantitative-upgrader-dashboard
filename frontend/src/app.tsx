import { Route, Switch, useLocation, Link } from 'wouter';
import { LayoutDashboard, Terminal, Activity, BookOpen } from 'lucide-preact';
import { useMetrics } from './hooks/useMetrics';
import { useSystemConfig } from './hooks/useSystemConfig';

import { Overview } from './pages/Overview.tsx';
import { DeepDive } from './pages/DeepDive.tsx';
import { Console } from './pages/Console.tsx';
import { Wiki } from './pages/Wiki.tsx';

export function App() {
  const { metrics, history, logs } = useMetrics();
  const systemConfig = useSystemConfig();
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-hidden">
      
      {/* Ultra-Scaled Sidebar (v2.7.0) */}
      <aside className="w-96 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-10 border-b border-slate-800">
          <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase">HQUD FOUNDRY</h1>
          <p className="text-[10px] font-mono text-slate-500 mt-2 uppercase tracking-widest font-bold">Node :: r720-baremetal</p>
        </div>
        
        <nav className="flex-1 p-8 space-y-4">
          <Link href="/">
            <a className={`flex items-center gap-6 px-6 py-4 rounded-sm transition-all font-black text-lg md:text-xl uppercase tracking-widest ${location === '/' ? 'bg-slate-800 text-teal-400 border-l-4 border-teal-500 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'}`}>
              <LayoutDashboard size={24} />
              <span>Executive Overview</span>
            </a>
          </Link>
          <Link href="/deep-dive">
            <a className={`flex items-center gap-6 px-6 py-4 rounded-sm transition-all font-black text-lg md:text-xl uppercase tracking-widest ${location === '/deep-dive' ? 'bg-slate-800 text-teal-400 border-l-4 border-teal-500 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'}`}>
              <Activity size={24} />
              <span>Scientific Deep Dive</span>
            </a>
          </Link>
          <Link href="/console">
            <a className={`flex items-center gap-6 px-6 py-4 rounded-sm transition-all font-black text-lg md:text-xl uppercase tracking-widest ${location === '/console' ? 'bg-slate-800 text-blue-400 border-l-4 border-blue-500 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'}`}>
              <Terminal size={24} />
              <span>Audit Console</span>
            </a>
          </Link>
          <Link href="/wiki">
            <a className={`flex items-center gap-6 px-6 py-4 rounded-sm transition-all font-black text-lg md:text-xl uppercase tracking-widest ${location === '/wiki' ? 'bg-slate-800 text-amber-400 border-l-4 border-amber-500 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'}`}>
              <BookOpen size={24} />
              <span>Microarchitecture Wiki</span>
            </a>
          </Link>
        </nav>

        <div className="p-8 border-t border-slate-800/50">
          <div className="flex items-center text-xs text-slate-400 font-mono font-black tracking-widest">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 shadow-[0_0_12px_#14b8a6] mr-3 animate-pulse"></span>
            PROBE ONLINE
          </div>
        </div>
      </aside>

      {/* Main Content (Aggressive Scaling p-24) */}
      <main className="flex-1 w-full h-full p-8 md:p-16 xl:p-24 flex flex-col bg-slate-900 overflow-y-auto">
        <Switch>
          <Route path="/"><Overview metrics={metrics} systemConfig={systemConfig} /></Route>
          <Route path="/deep-dive"><DeepDive metrics={metrics} history={history} systemConfig={systemConfig} /></Route>
          <Route path="/console"><Console logs={logs} /></Route>
          <Route path="/wiki"><Wiki /></Route>
          <Route>
             <div className="p-12 text-slate-500 font-mono italic text-2xl uppercase font-black tracking-widest">404 — Terminal Null</div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

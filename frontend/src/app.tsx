import { Route, Switch, useLocation } from 'wouter';
import { LayoutDashboard, Terminal, Activity, BookOpen } from 'lucide-preact';
import { useMetrics } from './hooks/useMetrics';
import { useSystemConfig } from './hooks/useSystemConfig';

import { Overview } from './pages/Overview';
import { DeepDive } from './pages/DeepDive';
import { Console } from './pages/Console';
import { Wiki } from './pages/Wiki';

export function App() {
  const { metrics, history, logs } = useMetrics();
  const systemConfig = useSystemConfig();
  const [location, setLocation] = useLocation();

  const navLink = (path: string, label: string, Icon: any) => {
    const isActive = location === path;
    return (
      <button 
        onClick={() => setLocation(path)}
        className={`w-full text-left px-0 md:px-6 py-3 flex items-center justify-center md:justify-start text-sm font-medium ${isActive ? 'text-slate-100 bg-slate-800 border-l-4 border-teal-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border-l-4 border-transparent'}`}>
        <Icon size={16} className="md:mr-3" />
        <span className="hidden md:block">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-hidden">
      
      <aside className="w-16 md:w-64 bg-slate-950 flex flex-col z-10 border-r border-slate-800 shrink-0">
        <div className="p-4 md:p-6 border-b border-slate-800">
          <h1 className="text-slate-100 text-xs md:text-sm font-semibold tracking-tight uppercase hidden md:block">HQUD Foundry</h1>
          <Terminal size={24} className="text-slate-100 md:hidden mx-auto" />
          <p className="text-slate-400 text-[10px] md:text-xs mt-1 font-mono uppercase hidden md:block">NODE::R720-BAREMETAL</p>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1">
          {navLink('/', 'Executive Overview', LayoutDashboard)}
          {navLink('/deep-dive', 'Scientific Deep Dive', Activity)}
          {navLink('/console', 'Audit Console', Terminal)}
          {navLink('/wiki', 'Microarchitecture Wiki', BookOpen)}
        </nav>
        <div className="p-4 border-t border-slate-800 hidden md:block">
          <div className="flex items-center text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-sm bg-[#0D9488] shadow-[0_0_8px_#0D9488] mr-2 animate-pulse"></span>
            PROBE ONLINE
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative">
        <Switch>
          <Route path="/"><Overview metrics={metrics} systemConfig={systemConfig} /></Route>
          <Route path="/deep-dive"><DeepDive metrics={metrics} history={history} systemConfig={systemConfig} /></Route>
          <Route path="/console"><Console logs={logs} /></Route>
          <Route path="/wiki"><Wiki /></Route>
          <Route>
             <div className="p-8 text-slate-400 font-mono italic">404 — Route not found</div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

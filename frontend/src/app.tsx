import { Route, Switch, Link } from 'wouter';
import { lazy, Suspense } from 'preact/compat';
import { LayoutDashboard, Terminal, Activity, BookOpen } from 'lucide-preact';
import { useMetrics } from './hooks/useMetrics';
import { useSystemConfig } from './hooks/useSystemConfig';

import { Overview } from './pages/Overview';
import { HardwareConsole } from './components/HardwareConsole';

// Lazy-loaded routes to reduce initial bundle (code splitting by route)
const DeepDive = lazy(() => import('./pages/DeepDive').then(m => ({ default: m.DeepDive })));
const MicroarchitectureWiki = lazy(() => import('./pages/MicroarchitectureWiki').then(m => ({ default: m.MicroarchitectureWiki })));

// Suspense fallback component for route loading
function RouteLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-block p-4 border border-slate-700 rounded-sm bg-slate-800/50 mb-4">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Loading route...</p>
      </div>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: any; // VNode from lucide-preact icons
  label: string;
}

function NavLink({ href, icon, label }: NavLinkProps) {
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
      
      {/* Sidebar - Balanced Premium width (v2.8.0 RC0) */}
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
            <span>Core v2.8.0 RC0</span>
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
            <Suspense fallback={<RouteLoading />}>
              <DeepDive metrics={metrics} history={history} systemConfig={systemConfig} />
            </Suspense>
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
            <Suspense fallback={<RouteLoading />}>
              <MicroarchitectureWiki metrics={metrics} systemConfig={systemConfig} />
            </Suspense>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

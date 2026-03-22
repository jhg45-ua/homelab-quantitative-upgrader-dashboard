import { useState } from 'preact/hooks';

export function Wiki() {
  const [activeTab, setActiveTab] = useState('roofline');

  const sections = [
    { id: 'roofline', title: '1. Roofline Model', subtitle: 'Compute vs. Memory Bound Analysis' },
    { id: 'tma', title: '2. TMA Analysis', subtitle: 'Pipeline Slot Efficiency Decomposition' },
    { id: 'little', title: '3. Little\'s Law', subtitle: 'Queueing Theory Applied to Block I/O' },
    { id: 'amdahl', title: '4. Amdahl\'s Law', subtitle: 'Parallelism Limits & Serialization' },
    { id: 'dependability', title: '5. Dependability', subtitle: 'Reliability Engineering (MTTF & FIT)' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 shrink-0">
        <h2 className="text-sm md:text-lg font-semibold tracking-wider text-slate-300 uppercase">
          Microarchitecture Wiki
        </h2>
        <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">
          Hardware Engineering Principles — Patterson & Hennessy Reference
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Mini-nav */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 hidden md:flex flex-col">
          <nav className="flex-1 p-3 space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${activeTab === s.id ? 'bg-slate-800 text-teal-400 border-l-2 border-teal-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-900/20 p-6 md:p-10">
          <div className="max-w-4xl">
            {activeTab === 'roofline' && (
              <article className="bg-slate-800 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-lg font-semibold tracking-wide text-teal-400">{sections[0].title}</h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{sections[0].subtitle}</p>
                </div>
                <div className="p-6 md:p-10 text-slate-400 leading-relaxed space-y-6">
                  <p>
                    The Roofline model is an intuitive visual performance model used to provide performance estimates of a given compute kernel running on multi-core or accelerator architectures.
                  </p>
                  <p>
                    The key insight is the concept of <strong className="text-slate-300">Arithmetic Intensity (AI)</strong>, the ratio of floating-point operations (FLOPs) to bytes transferred from main memory.
                  </p>
                  <div className="bg-slate-950 p-4 border border-slate-700 font-mono text-sm text-teal-400">
                    AI = Total FLOPs / Total Bytes from DRAM
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-900 border border-slate-700 p-4">
                      <div className="text-teal-400 font-mono text-xs font-bold mb-2">▬ MEMORY BANDWIDTH CEILING (Diagonal)</div>
                      <p className="text-sm">Performance = AI × Peak Memory Bandwidth. In this region, performance is limited by the speed of RAM.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-4">
                      <div className="text-red-400 font-mono text-xs font-bold mb-2">▬ PEAK COMPUTE CEILING (Horizontal)</div>
                      <p className="text-sm">The maximum instructions per second your hardware can process. To the right of the ridge point, adding RAM speed doesn't help.</p>
                    </div>
                  </div>
                  <p className="text-sm italic border-l-2 border-slate-700 pl-4 py-2">
                    In your Dell R720 (E5-2670), the theoretical peak is ~166.4K MIPS with a mem bandwidth of 102.4 GB/s.
                  </p>
                </div>
              </article>
            )}

            {activeTab === 'tma' && (
              <article className="bg-slate-800 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-lg font-semibold tracking-wide text-orange-400">{sections[1].title}</h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{sections[1].subtitle}</p>
                </div>
                <div className="p-6 md:p-10 text-slate-400 leading-relaxed space-y-6">
                  <p>
                    TMA is Intel\'s official methodology for dissecting where processor pipeline slots are being wasted.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-700 p-4 border-l-green-500 border-l-4">
                      <div className="text-green-400 font-mono text-xs font-bold mb-1">RETIRING</div>
                      <p className="text-xs">Useful work. Cycles that actually pushed output.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-4 border-l-orange-500 border-l-4">
                      <div className="text-orange-400 font-mono text-xs font-bold mb-1">BAD SPECULATION</div>
                      <p className="text-xs">Wasted slots due to branch mispredictions.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-4 border-l-blue-500 border-l-4">
                      <div className="text-blue-400 font-mono text-xs font-bold mb-1">FRONT-END BOUND</div>
                      <p className="text-xs">Stuck fetching/decoding instructions.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-4 border-l-red-500 border-l-4">
                      <div className="text-red-400 font-mono text-xs font-bold mb-1">BACK-END BOUND</div>
                      <p className="text-xs">Stalled waiting for data (RAM) or execution units.</p>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {activeTab === 'little' && (
              <article className="bg-slate-800 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-lg font-semibold tracking-wide text-slate-100">{sections[2].title}</h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{sections[2].subtitle}</p>
                </div>
                <div className="p-6 md:p-10 text-slate-400 leading-relaxed space-y-6">
                  <div className="bg-slate-950 p-4 border border-slate-700 font-mono text-sm text-teal-400">L = λ × W</div>
                  <p>
                    Applied to block I/O: if your NVMe services requests at 100,000 IOPS (λ) and each spends 0.1ms in the queue (W), then average queue depth (L) is 10.
                  </p>
                  <p>
                    As queue depth increases, latency grows <strong className="text-slate-300">non-linearly</strong>. This is why the heatmap glows red during peak writes.
                  </p>
                </div>
              </article>
            )}

            {activeTab === 'amdahl' && (
              <article className="bg-slate-800 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-lg font-semibold tracking-wide text-blue-400">{sections[3].title}</h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{sections[3].subtitle}</p>
                </div>
                <div className="p-6 md:p-10 text-slate-400 leading-relaxed space-y-6">
                  <div className="bg-slate-950 p-4 border border-slate-700 font-mono text-sm text-teal-400">Speedup(N) = 1 / (S + (1 - S) / N)</div>
                  <p>
                    Dictates maximum speedup based on the inherently serial fraction (<strong className="text-slate-200">S</strong>) of your program.
                  </p>
                  <p>
                    On your 16-core R720, even a 5% serial fraction limits maximum speedup to ~10x despite having 32 threads. This is largely caused by <strong className="text-slate-200">Lock Contention</strong>.
                  </p>
                </div>
              </article>
            )}

            {activeTab === 'dependability' && (
              <article className="bg-slate-800 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-lg font-semibold tracking-wide text-slate-300">{sections[4].title}</h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{sections[4].subtitle}</p>
                </div>
                <div className="p-6 md:p-10 text-slate-400 leading-relaxed space-y-6">
                   <p>Tracks hardware health through <strong className="text-slate-100">MTTF</strong> (Mean Time To Failure) and <strong className="text-slate-100">FIT</strong> (Failures In Time).</p>
                   <p>The "Dependability" dashboard metric is driven by EDAC/ECC monitoring. Uptime tracks continuous mission duration.</p>
                </div>
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

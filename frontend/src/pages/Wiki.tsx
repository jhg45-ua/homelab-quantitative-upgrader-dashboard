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
      <header className="bg-slate-900 border-b border-slate-800 px-12 py-8 shrink-0">
        <h2 className="text-2xl md:text-4xl font-extrabold tracking-tighter text-slate-100 uppercase">
          Microarchitecture Wiki
        </h2>
        <div className="text-xs font-mono text-slate-500 mt-2 uppercase tracking-[0.3em] font-black">
          Hardware Engineering Principles — Patterson & Hennessy Reference
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Mini-nav */}
        <aside className="w-96 border-r border-slate-800 bg-slate-950/20 hidden lg:flex flex-col">
          <nav className="flex-1 p-6 space-y-4">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                className={`w-full text-left px-6 py-4 text-sm md:text-lg font-mono font-black transition-all ${activeTab === s.id ? 'bg-slate-800 text-teal-400 border-l-[6px] border-teal-500 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-900/10 p-12 md:p-20">
          <div className="max-w-7xl mx-auto xl:mx-0">
            {activeTab === 'roofline' && (
              <article className="bg-slate-800/40 border border-slate-700 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                <div className="px-10 py-8 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-3xl font-black tracking-tight text-teal-400 uppercase">{sections[0].title}</h3>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em] font-black mt-2">{sections[0].subtitle}</p>
                </div>
                <div className="p-10 md:p-16 text-slate-400 leading-relaxed space-y-12 text-xl">
                  <p>
                    The Roofline model is an intuitive visual performance model used to provide performance estimates of a given compute kernel running on multi-core or accelerator architectures.
                  </p>
                  <p>
                    The key insight is the concept of <strong className="text-slate-200">Arithmetic Intensity (AI)</strong>, the ratio of floating-point operations (FLOPs) to bytes transferred from main memory.
                  </p>
                  <div className="bg-slate-950 p-10 border border-slate-700 font-mono text-2xl md:text-3xl text-teal-400 font-black tracking-wider text-center flex flex-col gap-2">
                    <span className="text-slate-600 text-sm mb-4 tracking-widest uppercase font-bold">Mathematical Definition</span>
                    AI = Total FLOPs / Total Bytes from DRAM
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900 border border-slate-700 p-8 border-t-2 border-teal-500">
                      <div className="text-teal-400 font-mono text-sm font-black mb-4 tracking-widest">▬ MEMORY BANDWIDTH CEILING</div>
                      <p className="text-lg">Performance = AI × Peak Memory Bandwidth. In this region, performance is limited by the speed of RAM.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-8 border-t-2 border-red-500">
                      <div className="text-red-400 font-mono text-sm font-black mb-4 tracking-widest">▬ PEAK COMPUTE CEILING</div>
                      <p className="text-lg">The maximum instructions per second your hardware can process. To the right of the ridge point, adding RAM speed doesn't help.</p>
                    </div>
                  </div>
                  <p className="text-lg italic border-l-4 border-slate-700 pl-8 py-4 bg-slate-800/50">
                    In your Dell R720 (E5-2670), the theoretical peak is ~166.4K MIPS with a mem bandwidth of 102.4 GB/s.
                  </p>
                </div>
              </article>
            )}

            {activeTab === 'tma' && (
              <article className="bg-slate-800/40 border border-slate-700 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                <div className="px-10 py-8 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-3xl font-black tracking-tight text-orange-400 uppercase">{sections[1].title}</h3>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em] font-black mt-2">{sections[1].subtitle}</p>
                </div>
                <div className="p-10 md:p-16 text-slate-400 leading-relaxed space-y-12 text-xl">
                  <p>
                    TMA is Intel's official methodology for dissecting where processor pipeline slots are being wasted.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900 border border-slate-700 p-8 border-l-green-500 border-l-8">
                      <div className="text-green-400 font-mono text-sm font-black mb-2 tracking-widest">RETIRING</div>
                      <p className="text-lg">Useful work. Cycles that actually pushed output.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-8 border-l-orange-500 border-l-8">
                      <div className="text-orange-400 font-mono text-sm font-black mb-2 tracking-widest">BAD SPECULATION</div>
                      <p className="text-lg">Wasted slots due to branch mispredictions.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-8 border-l-blue-500 border-l-8">
                      <div className="text-blue-400 font-mono text-sm font-black mb-2 tracking-widest">FRONT-END BOUND</div>
                      <p className="text-lg">Stuck fetching/decoding instructions.</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-8 border-l-red-500 border-l-8">
                      <div className="text-red-400 font-mono text-sm font-black mb-2 tracking-widest">BACK-END BOUND</div>
                      <p className="text-lg">Stalled waiting for data (RAM) or execution units.</p>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {activeTab === 'little' && (
              <article className="bg-slate-800/40 border border-slate-700 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                <div className="px-10 py-8 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-3xl font-black tracking-tight text-slate-100 uppercase">{sections[2].title}</h3>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em] font-black mt-2">{sections[2].subtitle}</p>
                </div>
                <div className="p-10 md:p-16 text-slate-400 leading-relaxed space-y-12 text-xl">
                  <div className="bg-slate-950 p-10 border border-slate-700 font-mono text-4xl text-teal-400 font-black tracking-widest text-center">L = λ × W</div>
                  <p>
                    Applied to block I/O: if your NVMe services requests at 100,000 IOPS (λ) and each spends 0.1ms in the queue (W), then average queue depth (L) is 10.
                  </p>
                  <p>
                    As queue depth increases, latency grows <strong className="text-slate-200">non-linearly</strong>. This is why the heatmap glows red during peak writes.
                  </p>
                </div>
              </article>
            )}

            {activeTab === 'amdahl' && (
              <article className="bg-slate-800/40 border border-slate-700 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                <div className="px-10 py-8 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-3xl font-black tracking-tight text-blue-400 uppercase">{sections[3].title}</h3>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em] font-black mt-2">{sections[3].subtitle}</p>
                </div>
                <div className="p-10 md:p-16 text-slate-400 leading-relaxed space-y-12 text-xl">
                  <div className="bg-slate-950 p-10 border border-slate-700 font-mono text-3xl text-teal-400 font-black tracking-wider text-center">Speedup(N) = 1 / (S + (1 - S) / N)</div>
                  <p>
                    Dictates maximum speedup based on the inherently serial fraction (<strong className="text-slate-200">S</strong>) of your program.
                  </p>
                  <p>
                    On your 16-core R720, even a 5% serial fraction limits maximum speedup to ~10x despite having 32 threads. This is largely caused by <strong className="text-slate-200 font-black">Lock Contention</strong>.
                  </p>
                </div>
              </article>
            )}

            {activeTab === 'dependability' && (
              <article className="bg-slate-800/40 border border-slate-700 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                <div className="px-10 py-8 border-b border-slate-700 bg-slate-800/80">
                  <h3 className="text-3xl font-black tracking-tight text-slate-100 uppercase">{sections[4].title}</h3>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em] font-black mt-2">{sections[4].subtitle}</p>
                </div>
                <div className="p-10 md:p-16 text-slate-400 leading-relaxed space-y-12 text-xl">
                   <p>Tracks hardware health through <strong className="text-slate-100 font-black uppercase">MTTF</strong> (Mean Time To Failure) and <strong className="text-slate-100 font-black uppercase">FIT</strong> (Failures In Time).</p>
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

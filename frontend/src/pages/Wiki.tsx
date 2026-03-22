export function Wiki() {
  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-y-auto">
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-4 shrink-0">
        <h2 className="text-sm md:text-lg font-semibold tracking-wider text-slate-300 uppercase">
          Microarchitecture Wiki
        </h2>
        <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">
          Hardware Engineering Principles
        </div>
      </header>

      <div className="p-6 md:p-12 w-full max-w-prose mx-auto font-sans">
        
        <div className="space-y-12 text-slate-400 leading-relaxed">
          <section>
            <h3 className="text-slate-300 text-xl font-semibold tracking-wide mb-4 border-b border-slate-800 pb-2">
              Roofline Model: Compute vs Memory
            </h3>
            <p className="mb-4">
              The Roofline model is an intuitive visual performance model used to provide performance estimates of a given compute kernel or application running on multi-core, many-core, or accelerator architectures.
            </p>
            <p>
              By plotting Operational Intensity (FLOPs or Instructions per Byte accessed from DRAM) against the raw Performance throughput, engineers can conclusively diagnose if an application is <strong>Memory Bound</strong> (hitting the slanted ceiling constrained by DRAM bandwidth) or <strong>Compute Bound</strong> (hitting the flat ceiling constrained by raw ALU execution units).
            </p>
          </section>

          <section>
            <h3 className="text-slate-300 text-xl font-semibold tracking-wide mb-4 border-b border-slate-800 pb-2">
              AMAT (Average Memory Access Time)
            </h3>
            <p className="mb-4">
              AMAT measures the expected time (typically in processor cycles or nanoseconds) it takes to complete a memory access, fundamentally dictated by the cache hierarchy of the microprocessor.
            </p>
            <div className="bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300 my-4 rounded-sm">
              AMAT = Hit_Time + (Miss_Rate × Miss_Penalty)
            </div>
            <p>
              In extreme enterprise environments like NUMA (Non-Uniform Memory Access) systems, remote node requests can explode the Miss Penalty astronomically. The eBPF probes actively trace down to the Last Level Cache (LLC) to quantify this drift in real-time.
            </p>
          </section>

          <section>
            <h3 className="text-slate-300 text-xl font-semibold tracking-wide mb-4 border-b border-slate-800 pb-2">
              CPI (Cycles Per Instruction)
            </h3>
            <p className="mb-4">
              CPI is the ultimate macro-metric of Pipeline Efficiency. It denotes the average number of clock cycles required to execute a single hardware instruction. Ideal scalar processors hover near <code>CPI = 1</code>, while superscalar / out-of-order processors attempt to plunge into fractional CPIs (<code>CPI {'<'} 1</code>) by retiring multiple instructions per cycle.
            </p>
            <p>
              Spikes in CPI reliably signal pipeline stalls—frequently induced by branch mispredictions, instruction cache misses, or data dependency hazards deep within the arithmetic logic units.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}

export function Wiki() {
  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-y-auto">
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-4 shrink-0">
        <h2 className="text-sm md:text-lg font-semibold tracking-wider text-slate-300 uppercase">
          Microarchitecture Wiki
        </h2>
        <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">
          Hardware Engineering Principles — Patterson & Hennessy Reference
        </div>
      </header>

      <div className="p-6 md:p-12 w-full max-w-prose mx-auto font-sans">
        
        <div className="space-y-12 text-slate-400 leading-relaxed">

          {/* Section 1 */}
          <section>
            <h3 className="text-slate-300 text-xl font-semibold tracking-wide mb-4 border-b border-slate-800 pb-2">
              1. Roofline Model & Arithmetic Intensity
            </h3>
            <p className="mb-4">
              The Roofline model is an intuitive visual performance model used to provide performance estimates of a given compute kernel running on multi-core or accelerator architectures. It was formally introduced by Samuel Williams, Andrew Waterman, and David Patterson at UC Berkeley.
            </p>
            <p className="mb-4">
              The key insight is the concept of <strong className="text-slate-300">Arithmetic Intensity (AI)</strong>, defined as the ratio of floating-point operations (FLOPs) or instructions to the number of bytes transferred from main memory (DRAM). This is measured in Ops/Byte.
            </p>
            <div className="bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-teal-400 my-4">
              AI = Total FLOPs / Total Bytes from DRAM
            </div>
            <p className="mb-4">
              The model plots AI on the X-axis (logarithmic) against Attainable Performance (GFLOPs/s or MIPS) on the Y-axis (logarithmic). The "roofline" is formed by two ceilings:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong className="text-slate-300">Memory Bandwidth Ceiling (Diagonal):</strong> Performance = AI × Peak Memory Bandwidth. Applications to the left of the "ridge point" are memory-bound.</li>
              <li><strong className="text-slate-300">Peak Compute Ceiling (Horizontal):</strong> The flat line representing the processor's maximum throughput. Applications to the right are compute-bound.</li>
            </ul>
            <p className="mt-4">
              In practice, your Dell R720 with dual Xeon E5-2680 v2 processors has a theoretical peak of ~154 GIPS and a memory bandwidth of ~51.2 GB/s per socket. The ridge point occurs where AI = Peak MIPS / (BW × Bytes_per_CacheLine), establishing where your workload transitions from memory-bound to compute-bound.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-slate-300 text-xl font-semibold tracking-wide mb-4 border-b border-slate-800 pb-2">
              2. Top-Down Microarchitecture Analysis (TMA)
            </h3>
            <p className="mb-4">
              TMA is Intel's official methodology for dissecting where processor pipeline slots are being wasted. Every clock cycle, a modern superscalar CPU can potentially retire N micro-operations (μops). TMA categorizes what happens to those slots into four top-level buckets:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
              <div className="bg-slate-950 border border-slate-800 p-3">
                <div className="text-green-400 font-mono text-xs font-bold mb-1">■ RETIRING</div>
                <p className="text-xs">Useful work. Slots that successfully retired μops. The ideal state. Higher is better.</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3">
                <div className="text-orange-400 font-mono text-xs font-bold mb-1">■ BAD SPECULATION</div>
                <p className="text-xs">Wasted slots due to branch mispredictions. The branch predictor guessed wrong, and the pipeline was flushed.</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3">
                <div className="text-blue-400 font-mono text-xs font-bold mb-1">■ FRONT-END BOUND</div>
                <p className="text-xs">The instruction fetch/decode pipeline couldn't deliver μops fast enough. Caused by I-cache misses or complex decoders.</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3">
                <div className="text-red-400 font-mono text-xs font-bold mb-1">■ BACK-END BOUND</div>
                <p className="text-xs">Execution stalls waiting for data (memory-bound) or execution units (core-bound). The most common bottleneck category.</p>
              </div>
            </div>
            <p>
              On your R720's Sandy Bridge-EP architecture, TMA Level 1 counters are accessed via <code className="text-teal-400 text-xs">perf stat</code> or the eBPF agent reading hardware performance counters (PMCs). A high Back-End Bound percentage strongly correlates with elevated CPI (Cycles Per Instruction) and AMAT values.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-slate-300 text-xl font-semibold tracking-wide mb-4 border-b border-slate-800 pb-2">
              3. Little's Law in Storage Queues
            </h3>
            <div className="bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-teal-400 my-4">
              L = λ × W
            </div>
            <p className="mb-4">
              Little's Law states that the long-term average number of items in a stable system (<strong className="text-slate-300">L</strong>) equals the long-term average arrival rate (<strong className="text-slate-300">λ</strong>) multiplied by the average time an item spends in the system (<strong className="text-slate-300">W</strong>).
            </p>
            <p className="mb-4">
              Applied to block I/O: if your NVMe drive services requests at a rate of 100,000 IOPS (λ) and each request spends an average of 0.1ms in the queue (W), then the average queue depth (L) is 10.
            </p>
            <p className="mb-4">
              This becomes critical when analyzing the eBPF Block I/O Latency Heatmap: as queue depth increases beyond the device's optimal concurrency, latency grows <strong className="text-slate-300">non-linearly</strong>. This is why you see the heatmap "glow red" at higher latency buckets during peak writes — the queue depth has exceeded the NVMe controller's internal parallelism.
            </p>
            <p>
              For rotational drives (sda/sdb in your R720), the non-linearity is even more severe due to mechanical seek times adding 5-15ms of latency per random I/O.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="text-slate-300 text-xl font-semibold tracking-wide mb-4 border-b border-slate-800 pb-2">
              4. Amdahl's Law & Lock Contention
            </h3>
            <div className="bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-teal-400 my-4">
              Speedup(N) = 1 / (S + (1 - S) / N)
            </div>
            <p className="mb-4">
              Amdahl's Law dictates the maximum speedup achievable by parallelizing a program across N processors. <strong className="text-slate-300">S</strong> is the fraction of the program that is inherently serial (cannot be parallelized).
            </p>
            <p className="mb-4">
              On your Dell R720 with 20 hardware threads (2 × 10-core Xeon E5-2680 v2 with HT), even a 5% serial fraction (S=0.05) limits maximum speedup to ~10.26× regardless of thread count. At S=0.10, the ceiling drops to ~6.90×.
            </p>
            <p className="mb-4">
              In practice, the serial fraction is dominated by <strong className="text-slate-300">lock contention</strong>: mutexes, spinlocks, and atomic operations that serialize access to shared data structures. The eBPF agent's context switch counter (<code className="text-teal-400 text-xs">hqud_os_context_switches_ps</code>) is a proxy indicator — high context switch rates often correlate with excessive lock contention as threads sleep waiting to acquire contested locks.
            </p>
            <p>
              Gustafson's Law provides the optimistic counterpoint: if you scale the problem size with the number of processors, the serial fraction becomes relatively smaller. This is the regime your server operates in when running embarrassingly parallel workloads like independent VM guests.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h3 className="text-slate-300 text-xl font-semibold tracking-wide mb-4 border-b border-slate-800 pb-2">
              5. Hardware Dependability: MTTF & FIT
            </h3>
            <p className="mb-4">
              Reliability engineering quantifies hardware dependability through two reciprocal metrics:
            </p>
            <div className="bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-teal-400 my-4 space-y-1">
              <div>MTTF = Total Operating Hours / Number of Failures</div>
              <div>FIT  = 10⁹ / MTTF  (Failures In Time per billion hours)</div>
            </div>
            <p className="mb-4">
              <strong className="text-slate-300">MTTF (Mean Time To Failure)</strong> represents the average expected lifespan of a component before its first failure. Enterprise-grade DDR3 ECC DIMMs typically have MTTF ratings exceeding 1,000,000 hours ({'>'} 114 years), but in practice, environmental factors (temperature, voltage spikes) dramatically reduce effective lifespan.
            </p>
            <p className="mb-4">
              <strong className="text-slate-300">EDAC (Error Detection And Correction)</strong> subsystem in Linux monitors ECC memory for correctable errors (CE) and uncorrectable errors (UE). A rising trend in correctable errors is the classic early warning signal that a DIMM is degrading — this is the engineering basis for the "Dependability" metric on the Overview page.
            </p>
            <p>
              The System Uptime metric tracks continuous operation time. For a bare-metal hypervisor node like your R720, unplanned reboots directly impact FIT calculations. An uptime of 90+ days with zero EDAC errors indicates excellent hardware health.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}

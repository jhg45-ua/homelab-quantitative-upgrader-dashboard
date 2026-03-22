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

      <div className="p-4 md:p-8 w-full max-w-6xl mx-auto flex flex-col gap-6">

        {/* Section 1 */}
        <article className="bg-slate-800 border border-slate-700">
          <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/80">
            <h3 className="text-base md:text-lg font-semibold tracking-wide text-slate-200">
              1. Roofline Model & Arithmetic Intensity
            </h3>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">Compute vs. Memory Bound Analysis</p>
          </div>
          <div className="p-5 md:p-8 text-slate-400 leading-relaxed space-y-4">
            <p>
              The Roofline model is an intuitive visual performance model used to provide performance estimates of a given compute kernel running on multi-core or accelerator architectures. It was formally introduced by Samuel Williams, Andrew Waterman, and David Patterson at UC Berkeley.
            </p>
            <p>
              The key insight is the concept of <strong className="text-slate-300">Arithmetic Intensity (AI)</strong>, defined as the ratio of floating-point operations (FLOPs) or instructions to the number of bytes transferred from main memory (DRAM). This is measured in Ops/Byte.
            </p>
            <div className="bg-slate-950 p-4 border border-slate-700 font-mono text-sm text-teal-400">
              AI = Total FLOPs / Total Bytes from DRAM
            </div>
            <p>
              The model plots AI on the X-axis (logarithmic) against Attainable Performance (GFLOPs/s or MIPS) on the Y-axis (logarithmic). The "roofline" is formed by two ceilings:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-700 p-4">
                <div className="text-teal-400 font-mono text-xs font-bold mb-2">▬ MEMORY BANDWIDTH CEILING (Diagonal)</div>
                <p className="text-sm">Performance = AI × Peak Memory Bandwidth. Applications to the left of the "ridge point" are memory-bound. Their performance scales linearly with AI.</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 p-4">
                <div className="text-red-400 font-mono text-xs font-bold mb-2">▬ PEAK COMPUTE CEILING (Horizontal)</div>
                <p className="text-sm">The flat line representing the processor's maximum throughput. Applications to the right are compute-bound. Additional memory bandwidth won't help.</p>
              </div>
            </div>
            <p>
              In practice, your Dell R720 with dual Xeon E5-2680 v2 processors has a theoretical peak of ~154 GIPS and a memory bandwidth of ~51.2 GB/s per socket. The ridge point occurs where AI = Peak MIPS / (BW × Bytes_per_CacheLine), establishing where your workload transitions from memory-bound to compute-bound.
            </p>
          </div>
        </article>

        {/* Section 2 */}
        <article className="bg-slate-800 border border-slate-700">
          <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/80">
            <h3 className="text-base md:text-lg font-semibold tracking-wide text-slate-200">
              2. Top-Down Microarchitecture Analysis (TMA)
            </h3>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">Pipeline Slot Efficiency Decomposition</p>
          </div>
          <div className="p-5 md:p-8 text-slate-400 leading-relaxed space-y-4">
            <p>
              TMA is Intel's official methodology for dissecting where processor pipeline slots are being wasted. Every clock cycle, a modern superscalar CPU can potentially retire N micro-operations (μops). TMA categorizes what happens to those slots into four top-level buckets:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-700 p-4">
                <div className="text-green-400 font-mono text-xs font-bold mb-2">■ RETIRING</div>
                <p className="text-sm">Useful work. Slots that successfully retired μops. The ideal state — higher is always better. In a perfectly efficient pipeline, this would be 100%.</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 p-4">
                <div className="text-orange-400 font-mono text-xs font-bold mb-2">■ BAD SPECULATION</div>
                <p className="text-sm">Wasted slots due to branch mispredictions. The branch predictor guessed wrong, the pipeline was flushed, and those cycles were lost forever.</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 p-4">
                <div className="text-blue-400 font-mono text-xs font-bold mb-2">■ FRONT-END BOUND</div>
                <p className="text-sm">The instruction fetch/decode pipeline couldn't deliver μops fast enough. Caused by I-cache misses, complex micro-coded instructions, or ITLB misses.</p>
              </div>
              <div className="bg-slate-900 border border-slate-700 p-4">
                <div className="text-red-400 font-mono text-xs font-bold mb-2">■ BACK-END BOUND</div>
                <p className="text-sm">Execution stalls waiting for data (memory-bound) or execution units (core-bound). The most common bottleneck category on data-heavy workloads.</p>
              </div>
            </div>
            <p>
              On your R720's Sandy Bridge-EP architecture, TMA Level 1 counters are accessed via <code className="text-teal-400 text-xs bg-slate-900 px-1 py-0.5">perf stat</code> or the eBPF agent reading hardware performance counters (PMCs). A high Back-End Bound percentage strongly correlates with elevated CPI (Cycles Per Instruction) and AMAT values.
            </p>
          </div>
        </article>

        {/* Section 3 */}
        <article className="bg-slate-800 border border-slate-700">
          <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/80">
            <h3 className="text-base md:text-lg font-semibold tracking-wide text-slate-200">
              3. Little's Law in Storage Queues
            </h3>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">Queueing Theory Applied to Block I/O</p>
          </div>
          <div className="p-5 md:p-8 text-slate-400 leading-relaxed space-y-4">
            <div className="bg-slate-950 p-4 border border-slate-700 font-mono text-sm text-teal-400">
              L = λ × W
            </div>
            <p>
              Little's Law states that the long-term average number of items in a stable system (<strong className="text-slate-300">L</strong>) equals the long-term average arrival rate (<strong className="text-slate-300">λ</strong>) multiplied by the average time an item spends in the system (<strong className="text-slate-300">W</strong>).
            </p>
            <p>
              Applied to block I/O: if your NVMe drive services requests at a rate of 100,000 IOPS (λ) and each request spends an average of 0.1ms in the queue (W), then the average queue depth (L) is 10.
            </p>
            <p>
              This becomes critical when analyzing the eBPF Block I/O Latency Heatmap: as queue depth increases beyond the device's optimal concurrency, latency grows <strong className="text-slate-300">non-linearly</strong>. This is why you see the heatmap "glow red" at higher latency buckets during peak writes — the queue depth has exceeded the NVMe controller's internal parallelism.
            </p>
            <p>
              For rotational drives (sda/sdb in your R720), the non-linearity is even more severe due to mechanical seek times adding 5-15ms of latency per random I/O.
            </p>
          </div>
        </article>

        {/* Section 4 */}
        <article className="bg-slate-800 border border-slate-700">
          <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/80">
            <h3 className="text-base md:text-lg font-semibold tracking-wide text-slate-200">
              4. Amdahl's Law & Lock Contention
            </h3>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">Parallelism Limits & Serialization</p>
          </div>
          <div className="p-5 md:p-8 text-slate-400 leading-relaxed space-y-4">
            <div className="bg-slate-950 p-4 border border-slate-700 font-mono text-sm text-teal-400">
              Speedup(N) = 1 / (S + (1 - S) / N)
            </div>
            <p>
              Amdahl's Law dictates the maximum speedup achievable by parallelizing a program across N processors. <strong className="text-slate-300">S</strong> is the fraction of the program that is inherently serial (cannot be parallelized).
            </p>
            <p>
              On your Dell R720 with 20 hardware threads (2 × 10-core Xeon E5-2680 v2 with HT), even a 5% serial fraction (S=0.05) limits maximum speedup to ~10.26× regardless of thread count. At S=0.10, the ceiling drops to ~6.90×.
            </p>
            <p>
              In practice, the serial fraction is dominated by <strong className="text-slate-300">lock contention</strong>: mutexes, spinlocks, and atomic operations that serialize access to shared data structures. The eBPF agent's context switch counter (<code className="text-teal-400 text-xs bg-slate-900 px-1 py-0.5">hqud_os_context_switches_ps</code>) is a proxy indicator — high context switch rates often correlate with excessive lock contention as threads sleep waiting to acquire contested locks.
            </p>
            <p>
              Gustafson's Law provides the optimistic counterpoint: if you scale the problem size with the number of processors, the serial fraction becomes relatively smaller. This is the regime your server operates in when running embarrassingly parallel workloads like independent VM guests.
            </p>
          </div>
        </article>

        {/* Section 5 */}
        <article className="bg-slate-800 border border-slate-700 mb-8">
          <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/80">
            <h3 className="text-base md:text-lg font-semibold tracking-wide text-slate-200">
              5. Hardware Dependability: MTTF & FIT
            </h3>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">Reliability Engineering & Failure Prediction</p>
          </div>
          <div className="p-5 md:p-8 text-slate-400 leading-relaxed space-y-4">
            <p>
              Reliability engineering quantifies hardware dependability through two reciprocal metrics:
            </p>
            <div className="bg-slate-950 p-4 border border-slate-700 font-mono text-sm text-teal-400 space-y-1">
              <div>MTTF = Total Operating Hours / Number of Failures</div>
              <div>FIT  = 10⁹ / MTTF  (Failures In Time per billion hours)</div>
            </div>
            <p>
              <strong className="text-slate-300">MTTF (Mean Time To Failure)</strong> represents the average expected lifespan of a component before its first failure. Enterprise-grade DDR3 ECC DIMMs typically have MTTF ratings exceeding 1,000,000 hours ({'>'} 114 years), but in practice, environmental factors (temperature, voltage spikes) dramatically reduce effective lifespan.
            </p>
            <p>
              <strong className="text-slate-300">EDAC (Error Detection And Correction)</strong> subsystem in Linux monitors ECC memory for correctable errors (CE) and uncorrectable errors (UE). A rising trend in correctable errors is the classic early warning signal that a DIMM is degrading — this is the engineering basis for the "Dependability" metric on the Overview page.
            </p>
            <p>
              The System Uptime metric tracks continuous operation time. For a bare-metal hypervisor node like your R720, unplanned reboots directly impact FIT calculations. An uptime of 90+ days with zero EDAC errors indicates excellent hardware health.
            </p>
          </div>
        </article>

      </div>
    </div>
  );
}

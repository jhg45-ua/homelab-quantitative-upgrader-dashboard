<svelte:head><title>HQUD — Methodology</title></svelte:head>

<div class="page-wrap">
  <article class="article">

    <header>
      <p class="tag">Quantitative Architecture · Hennessy &amp; Patterson</p>
      <h1>Why Quantitative Metrics?</h1>
      <p class="lead">
        Traditional percentage metrics (<code>CPU %</code>, <code>MEM %</code>) are
        <strong>throughput indicators</strong>, not quality indicators.
        This dashboard implements the principles from Hennessy &amp; Patterson's
        <em>Computer Architecture: A Quantitative Approach</em>
        to provide an empirical, mathematically rigorous view of real hardware performance.
      </p>
    </header>

    <hr>

    <!-- CPI -->
    <section>
      <p class="section-tag">CPU · PMU Hardware Counter</p>
      <h2>CPI — Cycles Per Instruction</h2>
      <div class="formula">CPI = ΔCycles / ΔInstructions</div>
      <p>
        An 80% CPU reading could mean the processor executes 1 instruction per cycle
        (peak efficiency) or 0.1 instructions per cycle (stalled waiting for memory).
        CPI distinguishes both scenarios deterministically.
      </p>
      <div class="threshold-grid">
        <div class="tc ok">
          <div class="tc-val">CPI = 1.0</div>
          <div class="tc-status">OPTIMAL</div>
          <div class="tc-desc">Efficient pipeline, no stalls</div>
        </div>
        <div class="tc warn">
          <div class="tc-val">CPI 2–4</div>
          <div class="tc-status">WARNING</div>
          <div class="tc-desc">Branch mispredictions or L2 pressure</div>
        </div>
        <div class="tc crit">
          <div class="tc-val">CPI &gt; 4</div>
          <div class="tc-status">CRITICAL</div>
          <div class="tc-desc">Severe pipeline stall — L3/DRAM misses</div>
        </div>
      </div>
      <p class="impl">
        Implementation: <code>perf_event_open(2)</code> with
        <code>PERF_COUNT_HW_CPU_CYCLES</code> + <code>PERF_COUNT_HW_INSTRUCTIONS</code>,
        attached to PID=0 (any process) for KVM/Proxmox compatibility.
      </p>
    </section>

    <hr>

    <!-- AMAT -->
    <section>
      <p class="section-tag">Memory · Hennessy &amp; Patterson Ch.2</p>
      <h2>AMAT — Average Memory Access Time</h2>
      <div class="formula">
        AMAT = T<sub>hit</sub> + MissRate × T<sub>miss</sub><br>
        <span class="formula-sub">T_hit = 4 cycles (L1-cache) · T_miss = 150 cycles (DRAM)</span>
      </div>
      <p>
        Memory utilisation tells you <em>how much</em> memory is in use, but not
        <em>how costly</em> it is to access. A system at 90% RAM with a warm L1 cache
        is far more efficient than one at 50% with a working set that misses to DRAM.
      </p>
      <div class="threshold-grid">
        <div class="tc ok">
          <div class="tc-val">≈ 4 cycles</div>
          <div class="tc-status">OPTIMAL</div>
          <div class="tc-desc">All accesses resolved in L1</div>
        </div>
        <div class="tc warn">
          <div class="tc-val">10–15 cycles</div>
          <div class="tc-status">WARNING</div>
          <div class="tc-desc">Working set spilling to L2/L3</div>
        </div>
        <div class="tc crit">
          <div class="tc-val">&gt; 15 cycles</div>
          <div class="tc-status">CRITICAL</div>
          <div class="tc-desc">Frequent DRAM accesses detected</div>
        </div>
      </div>
    </section>

    <hr>

    <!-- P99 / Little's Law -->
    <section>
      <p class="section-tag">I/O · eBPF Block Layer</p>
      <h2>P99 Latency — Little's Law &amp; Queueing Theory</h2>
      <div class="formula">
        L = λ × W<br>
        <span class="formula-sub">L = jobs in system · λ = arrival rate · W = average wait time</span>
      </div>
      <p>
        Mean latency hides the outliers that destroy real-world user experience.
        P99 exposes the "typical worst case" — the slowest 1% of operations that
        any process will encounter on a regular basis.
        P99 &gt; 10 ms is an unambiguous storage bottleneck signal.
      </p>
      <div class="threshold-grid">
        <div class="tc ok">
          <div class="tc-val">&lt; 2 ms</div>
          <div class="tc-status">OPTIMAL</div>
          <div class="tc-desc">NVMe-class, healthy queue</div>
        </div>
        <div class="tc warn">
          <div class="tc-val">2–10 ms</div>
          <div class="tc-status">WARNING</div>
          <div class="tc-desc">Typical SATA SSD range</div>
        </div>
        <div class="tc crit">
          <div class="tc-val">&gt; 10 ms</div>
          <div class="tc-status">CRITICAL</div>
          <div class="tc-desc">Disk bottleneck — review I/O queue depth</div>
        </div>
      </div>
      <div class="code-block">{`kprobe  → blk_mq_start_request
kretprobe → blk_mq_complete_request

PromQL: histogram_quantile(0.99,
  sum(rate(hqud_io_latency_usec_bucket[5m])) by (le)
)`}</div>
    </section>

    <hr>

    <!-- Context Switches -->
    <section>
      <p class="section-tag">OS · Software PMU Counter</p>
      <h2>Context Switches/s — OS Scheduling Overhead</h2>
      <p>
        Every context switch forces the OS to save and restore full CPU state
        (registers, TLB, branch predictor history). Correlating context switch spikes
        with CPI spikes reveals OS scheduler inefficiencies and thread contention.
        Measured via <code>PERF_COUNT_SW_CONTEXT_SWITCHES</code>.
      </p>
    </section>

    <footer>
      <em>References:</em><br>
      <em>Computer Architecture: A Quantitative Approach</em> — Hennessy &amp; Patterson (6th ed.)<br>
      Linux <code>perf_event_open(2)</code> man page · Cilium eBPF Go library · VictoriaMetrics PromQL
    </footer>

  </article>
</div>

<style>
  .page-wrap {
    background: #080f1e;
    min-height: calc(100dvh - 3.25rem);
    overflow-y: auto;
    padding: 2.5rem 1.5rem;
    font-family: 'Space Grotesk', system-ui, sans-serif;
  }

  .article {
    max-width: 800px; margin: 0 auto;
    color: #cbd5e1; font-size: 1rem; line-height: 1.75;
    display: flex; flex-direction: column; gap: 2.5rem;
  }

  /* Header */
  .tag { font-family:'JetBrains Mono',monospace; font-size:0.65rem; font-weight:800; letter-spacing:0.15em; text-transform:uppercase; color:#38bdf8; margin:0 0 0.5rem; }
  h1 { font-size:2.4rem; font-weight:800; color:#f1f5f9; margin:0 0 1rem; line-height:1.2; }
  .lead { font-size:1.05rem; color:#94a3b8; margin:0; line-height:1.7; }
  .lead strong { color:#cbd5e1; }

  code { font-family:'JetBrains Mono',monospace; font-size:0.82em; color:#38bdf8; background:rgba(56,189,248,0.07); padding:0.1em 0.35em; border-radius:4px; }
  hr   { border:none; border-top:1px solid #1e293b; margin:0; }
  p    { margin:0; }
  em   { color:#94a3b8; }

  /* Sections */
  section { display:flex; flex-direction:column; gap:1.1rem; }
  .section-tag { font-family:'JetBrains Mono',monospace; font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#3b82f6; margin:0; }
  h2 { font-size:1.65rem; font-weight:700; color:#e2e8f0; margin:0; }
  .impl { font-size:0.82rem; color:#475569; font-family:'JetBrains Mono',monospace; line-height:1.6; }

  /* Formula */
  .formula {
    background:rgba(15,23,42,0.8); border:1px solid #1e293b;
    border-left:3px solid #38bdf8; border-radius:0 8px 8px 0;
    padding:1.25rem 1.5rem; font-family:'JetBrains Mono',monospace;
    font-size:1.3rem; color:#38bdf8; font-weight:600; line-height:1.7;
  }
  .formula-sub { font-size:0.78rem; color:#475569; font-weight:400; }

  /* Threshold cards */
  .threshold-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
  @media (max-width:600px) { .threshold-grid{grid-template-columns:1fr;} h1{font-size:1.8rem;} }

  .tc { padding:1.1rem 1.25rem; border-radius:10px; border:1px solid; display:flex; flex-direction:column; gap:0.3rem; }
  .tc.ok   { background:rgba(52,211,153,0.05);  border-color:rgba(52,211,153,0.2); }
  .tc.warn { background:rgba(251,146,60,0.05);   border-color:rgba(251,146,60,0.2); }
  .tc.crit { background:rgba(248,113,113,0.05);  border-color:rgba(248,113,113,0.2); }

  .tc-val { font-family:'JetBrains Mono',monospace; font-size:1rem; font-weight:700; color:#e2e8f0; }
  .tc-status { font-size:0.6rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; }
  .tc.ok   .tc-status { color:#34d399; }
  .tc.warn .tc-status { color:#fb923c; }
  .tc.crit .tc-status { color:#f87171; }
  .tc-desc { font-size:0.78rem; color:#64748b; }

  /* Code block */
  .code-block {
    font-family:'JetBrains Mono',monospace; font-size:0.8rem; color:#34d399;
    background:rgba(8,15,30,0.8); border:1px solid #1e293b; border-radius:8px;
    padding:1rem 1.25rem; white-space:pre; overflow-x:auto; line-height:1.7;
  }

  /* Footer */
  footer { font-size:0.8rem; color:#334155; border-top:1px solid #1e293b; padding-top:1.5rem; line-height:1.7; font-style:italic; }
  footer code { color:#334155; }
</style>

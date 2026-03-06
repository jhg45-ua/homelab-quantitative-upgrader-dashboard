<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { hwConfig } from "$lib/hwConfig";

  const VM = "/api/v1/query";

  type CardStatus = "OPTIMAL" | "WARNING" | "CRITICAL" | "NO DATA";

  interface StatusCard {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    value: string;
    unit: string;
    status: CardStatus;
    thresholds: string;
    detail: string;
  }

  let cards: StatusCard[] = [
    {
      id: "cpi",
      title: "Compute",
      subtitle: "Cycles Per Instruction",
      icon: "⚡",
      value: "---",
      unit: "CPI",
      status: "NO DATA",
      thresholds: "< 2.0 Optimal · 2–4 Warning · > 4 Critical",
      detail: "CPU pipeline efficiency measured via PMU hardware counters",
    },
    {
      id: "amat",
      title: "Memory",
      subtitle: "Avg. Memory Access Time",
      icon: "🧠",
      value: "---",
      unit: "cycles",
      status: "NO DATA",
      thresholds: "< 10 Optimal · 10–15 Warning · > 15 Critical",
      detail: "Average memory access penalty: L1=4c + MissRate × 150c (DRAM)",
    },
    {
      id: "p99",
      title: "Storage",
      subtitle: "Block I/O Latency P99",
      icon: "💾",
      value: "---",
      unit: "µs",
      status: "NO DATA",
      thresholds: "< 2000 Optimal · 2k–10k Warning · > 10k Critical",
      detail: "P99 block I/O latency captured by eBPF Kprobes on blk_mq",
    },
    {
      id: "tcp",
      title: "Network",
      subtitle: "TCP Health (Retransmits)",
      icon: "🌐",
      value: "---",
      unit: "/s",
      status: "NO DATA",
      thresholds: "0 Optimal · 1–5 Warning · > 5 Critical",
      detail:
        "TCP retransmission rate captured by eBPF kprobe on tcp_retransmit_skb",
    },
  ];

  let lastUpdated = "---";
  let interval: ReturnType<typeof setInterval>;

  function getStatus(id: string, val: number): CardStatus {
    if (id === "cpi")
      return val < 2.0 ? "OPTIMAL" : val < 4.0 ? "WARNING" : "CRITICAL";
    if (id === "amat")
      return val < 10 ? "OPTIMAL" : val < 15 ? "WARNING" : "CRITICAL";
    if (id === "p99")
      return val < 2000 ? "OPTIMAL" : val < 10000 ? "WARNING" : "CRITICAL";
    if (id === "tcp")
      return val <= 0 ? "OPTIMAL" : val < 5 ? "WARNING" : "CRITICAL";
    return "NO DATA";
  }

  const statusStyle: Record<
    CardStatus,
    { border: string; badgeClass: string; glow: string }
  > = {
    OPTIMAL: {
      border: "#34d399",
      badgeClass: "badge-ok",
      glow: "rgba(52,211,153,0.08)",
    },
    WARNING: {
      border: "#fb923c",
      badgeClass: "badge-warn",
      glow: "rgba(251,146,60,0.08)",
    },
    CRITICAL: {
      border: "#f87171",
      badgeClass: "badge-crit",
      glow: "rgba(248,113,113,0.12)",
    },
    "NO DATA": {
      border: "#334155",
      badgeClass: "badge-none",
      glow: "transparent",
    },
  };

  async function fetchData() {
    const node = $hwConfig.node_name;
    try {
      const [cpiD, amatD, p99D, tcpD] = await Promise.all([
        fetch(`${VM}?query=hqud_cpu_cpi{host="${node}"}`).then((r) => r.json()),
        fetch(`${VM}?query=hqud_cpu_amat_cycles{host="${node}"}`).then((r) =>
          r.json(),
        ),
        fetch(
          `${VM}?query=${encodeURIComponent(`histogram_quantile(0.99, sum(rate(hqud_io_latency_usec_bucket{host="${node}"}[5m])) by (le))`)}`,
        ).then((r) => r.json()),
        fetch(`${VM}?query=hqud_net_tcp_retransmits_ps{host="${node}"}`).then(
          (r) => r.json(),
        ),
      ]);

      const updated = [...cards];

      if (cpiD.status === "success" && cpiD.data.result.length > 0) {
        const v = parseFloat(cpiD.data.result[0].value[1]);
        updated[0] = {
          ...updated[0],
          value: v.toFixed(2),
          status: getStatus("cpi", v),
        };
      } else {
        updated[0] = { ...updated[0], value: "---", status: "NO DATA" };
      }

      if (amatD.status === "success" && amatD.data.result.length > 0) {
        const v = parseFloat(amatD.data.result[0].value[1]);
        updated[1] = {
          ...updated[1],
          value: v.toFixed(2),
          status: getStatus("amat", v),
        };
      } else {
        updated[1] = { ...updated[1], value: "---", status: "NO DATA" };
      }

      if (p99D.status === "success" && p99D.data.result.length > 0) {
        const v = parseFloat(p99D.data.result[0].value[1]);
        updated[2] = {
          ...updated[2],
          value: v.toFixed(0),
          status: getStatus("p99", v),
        };
      } else {
        updated[2] = { ...updated[2], value: "---", status: "NO DATA" };
      }

      if (tcpD.status === "success" && tcpD.data.result.length > 0) {
        const v = parseFloat(tcpD.data.result[0].value[1]);
        updated[3] = {
          ...updated[3],
          value: v.toFixed(1),
          status: getStatus("tcp", v),
        };
      } else {
        updated[3] = { ...updated[3], value: "---", status: "NO DATA" };
      }

      cards = updated;
      lastUpdated = new Date().toLocaleTimeString("en-GB");
    } catch (e) {
      console.error("Executive fetch error", e);
    }
  }

  onMount(() => {
    fetchData();
    interval = setInterval(fetchData, 5000);
  });
  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  // ── Audit ────────────────────────────────────────────────────────────
  let auditLoading = false;
  let auditMarkdown = "";
  let auditError = "";
  let showModal = false;

  async function generateAudit() {
    auditLoading = true;
    auditError = "";
    auditMarkdown = "";
    try {
      const res = await fetch("/api/generate-audit");
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      auditMarkdown = await res.text();
      showModal = true;
    } catch (e: any) {
      auditError = e.message ?? String(e);
      showModal = true;
    } finally {
      auditLoading = false;
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([auditMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hqud-audit-${new Date().toISOString().slice(0, 16).replace("T", "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head><title>HQUD — Executive Overview</title></svelte:head>

<div class="page-bg">
  <!-- Page header -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Executive Overview</h2>
      <p class="page-sub">
        System health at a glance · Updated every 5 seconds
      </p>
    </div>
    <div class="last-updated">
      <span class="status-dot"></span>
      <span>{lastUpdated}</span>
    </div>
  </div>

  <!-- Status cards -->
  <div class="cards-grid">
    {#each cards as card}
      {@const s = statusStyle[card.status]}
      <div
        class="status-card"
        style="--border-color:{s.border}; --glow-color:{s.glow};"
      >
        <div class="card-top">
          <span class="card-icon">{card.icon}</span>
          <span class="badge {s.badgeClass}">{card.status}</span>
        </div>
        <div class="card-title">{card.title}</div>
        <div class="card-subtitle">{card.subtitle}</div>
        <div class="card-value-row">
          <span class="card-value" style="color:{s.border};">{card.value}</span>
          <span class="card-unit">{card.unit}</span>
        </div>
        <div class="card-detail">{card.detail}</div>
        <div class="card-thresholds">{card.thresholds}</div>
      </div>
    {/each}
  </div>

  <!-- Audit trigger card -->
  <div class="audit-card">
    <div class="audit-left">
      <div class="audit-icon">📋</div>
      <div>
        <div class="audit-title">Empirical Audit Report</div>
        <div class="audit-desc">
          Generates a quantitative Markdown report from live VictoriaMetrics
          data. Evaluates P99 I/O latency against the 10ms threshold and
          produces an architectural verdict with upgrade recommendations.
        </div>
      </div>
    </div>
    <button class="audit-btn" on:click={generateAudit} disabled={auditLoading}>
      {#if auditLoading}
        <span class="spinner"></span> Generating…
      {:else}
        ⚡ Generate Empirical Audit
      {/if}
    </button>
  </div>

  <!-- Audit modal -->
  {#if showModal}
    <div
      class="modal-backdrop"
      on:click|self={() => (showModal = false)}
      role="dialog"
      aria-modal="true"
    >
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title"
            >📋 Audit Report — {new Date().toLocaleDateString("en-GB")}</span
          >
          <div class="modal-actions">
            {#if auditMarkdown}
              <button class="modal-btn-dl" on:click={downloadMarkdown}
                >⬇ Download .md</button
              >
            {/if}
            <button class="modal-btn-close" on:click={() => (showModal = false)}
              >✕ Close</button
            >
          </div>
        </div>
        <div class="modal-body">
          {#if auditError}
            <pre class="modal-error">{auditError}</pre>
          {:else}
            <pre class="modal-content">{auditMarkdown}</pre>
          {/if}
        </div>
      </div>
    </div>
  {/if}
  <div class="info-bar">
    <div class="info-item">
      <span class="info-label">Hardware</span>
      <span class="info-value">{$hwConfig.hardware_desc}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Collectors</span>
      <span class="info-value"
        >eBPF Kprobes + perf_event_open PMU + iDRAC DCMI</span
      >
    </div>
    <div class="info-item">
      <span class="info-label">Storage Engine</span>
      <span class="info-value"
        >VictoriaMetrics · Prometheus wire format · 5s scrape</span
      >
    </div>
  </div>
</div>

<style>
  .page-bg {
    background: #080f1e;
    min-height: calc(100dvh - 3.25rem);
    padding: 2rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    font-family: "Space Grotesk", system-ui, sans-serif;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .page-sub {
    color: #475569;
    font-size: 0.875rem;
    margin-top: 0.3rem;
  }

  .last-updated {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.78rem;
    color: #475569;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 1100px) {
    .cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 600px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }

  .status-card {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow:
      0 0 40px var(--glow-color),
      0 4px 24px rgba(0, 0, 0, 0.4);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }
  .status-card:hover {
    transform: translateY(-4px);
    box-shadow:
      0 0 60px var(--glow-color),
      0 12px 40px rgba(0, 0, 0, 0.5);
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-icon {
    font-size: 1.8rem;
    line-height: 1;
  }

  .badge {
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    padding: 0.22rem 0.6rem;
    border-radius: 9999px;
    font-family: "JetBrains Mono", monospace;
    text-transform: uppercase;
  }
  .badge-ok {
    background: rgba(52, 211, 153, 0.1);
    color: #34d399;
    border: 1px solid rgba(52, 211, 153, 0.25);
  }
  .badge-warn {
    background: rgba(251, 146, 60, 0.1);
    color: #fb923c;
    border: 1px solid rgba(251, 146, 60, 0.25);
  }
  .badge-crit {
    background: rgba(248, 113, 113, 0.1);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.25);
  }
  .badge-none {
    background: rgba(51, 65, 85, 0.3);
    color: #475569;
    border: 1px solid rgba(51, 65, 85, 0.5);
  }

  .card-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: #e2e8f0;
  }
  .card-subtitle {
    font-size: 0.7rem;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .card-value-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .card-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 3.5rem;
    font-weight: 900;
    line-height: 1;
  }
  .card-unit {
    font-family: "JetBrains Mono", monospace;
    font-size: 1rem;
    color: #475569;
  }

  .card-detail {
    font-size: 0.825rem;
    color: #64748b;
    line-height: 1.55;
    margin-top: auto;
    font-family: "Space Grotesk", sans-serif;
  }

  .card-thresholds {
    font-size: 0.68rem;
    font-family: "JetBrains Mono", monospace;
    color: #1e3a4a;
    padding: 0.5rem 0.75rem;
    background: rgba(8, 15, 30, 0.6);
    border-radius: 6px;
    border: 1px solid #0f2335;
  }

  .info-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding: 1rem 1.25rem;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid #1e293b;
    border-radius: 10px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
    min-width: 200px;
  }
  .info-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #1e3a5f;
  }
  .info-value {
    font-size: 0.78rem;
    color: #475569;
    font-family: "JetBrains Mono", monospace;
  }

  /* ── Audit card ─────────────────────────────────────────────────────── */
  .audit-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    padding: 1.25rem 1.75rem;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(56, 189, 248, 0.15);
    border-radius: 12px;
    box-shadow: 0 0 24px rgba(56, 189, 248, 0.05);
  }

  .audit-left {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }
  .audit-icon {
    font-size: 2rem;
    line-height: 1;
    flex-shrink: 0;
  }
  .audit-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 0.3rem;
  }
  .audit-desc {
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.55;
    max-width: 560px;
  }

  .audit-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    color: #0f172a;
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition:
      opacity 0.2s,
      transform 0.15s,
      box-shadow 0.2s;
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
    white-space: nowrap;
  }
  .audit-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 0 32px rgba(56, 189, 248, 0.5);
  }
  .audit-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  /* Spinner */
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(15, 23, 42, 0.4);
    border-top-color: #0f172a;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Audit modal ─────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .modal {
    width: 100%;
    max-width: 860px;
    max-height: 85dvh;
    background: #0d1828;
    border: 1px solid rgba(56, 189, 248, 0.2);
    border-radius: 16px;
    box-shadow:
      0 0 80px rgba(56, 189, 248, 0.12),
      0 24px 64px rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 1rem;
    font-weight: 700;
    color: #e2e8f0;
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
  }

  .modal-btn-dl {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    border: 1px solid rgba(52, 211, 153, 0.3);
    background: rgba(52, 211, 153, 0.08);
    color: #34d399;
    cursor: pointer;
    transition: background 0.2s;
  }
  .modal-btn-dl:hover {
    background: rgba(52, 211, 153, 0.15);
  }

  .modal-btn-close {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.4rem 0.85rem;
    border-radius: 6px;
    border: 1px solid rgba(51, 65, 85, 0.5);
    background: rgba(51, 65, 85, 0.2);
    color: #94a3b8;
    cursor: pointer;
    transition: background 0.2s;
  }
  .modal-btn-close:hover {
    background: rgba(51, 65, 85, 0.4);
  }

  .modal-body {
    overflow-y: auto;
    padding: 1.5rem;
    flex: 1;
  }

  .modal-content {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.78rem;
    line-height: 1.75;
    color: #94a3b8;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }

  .modal-error {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.78rem;
    color: #f87171;
    background: rgba(248, 113, 113, 0.06);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 8px;
    padding: 1rem;
    white-space: pre-wrap;
    margin: 0;
  }
</style>

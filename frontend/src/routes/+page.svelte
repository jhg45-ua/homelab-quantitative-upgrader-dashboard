<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const VM = '/api/vm/api/v1/query';

  type CardStatus = 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'NO DATA';

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
      id: 'cpi', title: 'Compute', subtitle: 'Cycles Per Instruction',
      icon: '⚡', value: '---', unit: 'CPI', status: 'NO DATA',
      thresholds: '< 2.0 Optimal · 2–4 Warning · > 4 Critical',
      detail: 'CPU pipeline efficiency measured via PMU hardware counters'
    },
    {
      id: 'amat', title: 'Memory', subtitle: 'Avg. Memory Access Time',
      icon: '🧠', value: '---', unit: 'cycles', status: 'NO DATA',
      thresholds: '< 10 Optimal · 10–15 Warning · > 15 Critical',
      detail: 'Average memory access penalty: L1=4c + MissRate × 150c (DRAM)'
    },
    {
      id: 'p99', title: 'Storage', subtitle: 'Block I/O Latency P99',
      icon: '💾', value: '---', unit: 'µs', status: 'NO DATA',
      thresholds: '< 2000 Optimal · 2k–10k Warning · > 10k Critical',
      detail: 'P99 block I/O latency captured by eBPF Kprobes on blk_mq'
    }
  ];

  let lastUpdated = '---';
  let interval: ReturnType<typeof setInterval>;

  function getStatus(id: string, val: number): CardStatus {
    if (id === 'cpi')  return val < 2.0 ? 'OPTIMAL' : val < 4.0 ? 'WARNING' : 'CRITICAL';
    if (id === 'amat') return val < 10  ? 'OPTIMAL' : val < 15  ? 'WARNING' : 'CRITICAL';
    if (id === 'p99')  return val < 2000? 'OPTIMAL' : val < 10000? 'WARNING' : 'CRITICAL';
    return 'NO DATA';
  }

  const statusStyle: Record<CardStatus, { border: string; badgeClass: string; glow: string }> = {
    'OPTIMAL':  { border: '#34d399', badgeClass: 'badge-ok',   glow: 'rgba(52,211,153,0.08)' },
    'WARNING':  { border: '#fb923c', badgeClass: 'badge-warn', glow: 'rgba(251,146,60,0.08)'  },
    'CRITICAL': { border: '#f87171', badgeClass: 'badge-crit', glow: 'rgba(248,113,113,0.12)' },
    'NO DATA':  { border: '#334155', badgeClass: 'badge-none', glow: 'transparent'             },
  };

  async function fetchData() {
    try {
      const [cpiD, amatD, p99D] = await Promise.all([
        fetch(`${VM}?query=hqud_cpu_cpi{host="r720-vm"}`).then(r => r.json()),
        fetch(`${VM}?query=hqud_cpu_amat_cycles{host="r720-vm"}`).then(r => r.json()),
        fetch(`${VM}?query=${encodeURIComponent('histogram_quantile(0.99, sum(rate(hqud_io_latency_usec_bucket{host="r720-vm"}[5m])) by (le))')}`).then(r => r.json()),
      ]);

      const updated = [...cards];

      if (cpiD.status === 'success' && cpiD.data.result.length > 0) {
        const v = parseFloat(cpiD.data.result[0].value[1]);
        updated[0] = { ...updated[0], value: v.toFixed(2), status: getStatus('cpi', v) };
      } else { updated[0] = { ...updated[0], value: '---', status: 'NO DATA' }; }

      if (amatD.status === 'success' && amatD.data.result.length > 0) {
        const v = parseFloat(amatD.data.result[0].value[1]);
        updated[1] = { ...updated[1], value: v.toFixed(2), status: getStatus('amat', v) };
      } else { updated[1] = { ...updated[1], value: '---', status: 'NO DATA' }; }

      if (p99D.status === 'success' && p99D.data.result.length > 0) {
        const v = parseFloat(p99D.data.result[0].value[1]);
        updated[2] = { ...updated[2], value: v.toFixed(0), status: getStatus('p99', v) };
      } else { updated[2] = { ...updated[2], value: '---', status: 'NO DATA' }; }

      cards = updated;
      lastUpdated = new Date().toLocaleTimeString('en-GB');
    } catch (e) { console.error('Executive fetch error', e); }
  }

  onMount(() => { fetchData(); interval = setInterval(fetchData, 5000); });
  onDestroy(() => { if (interval) clearInterval(interval); });
</script>

<svelte:head><title>HQUD — Executive Overview</title></svelte:head>

<div class="page-bg">

  <!-- Page header -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Executive Overview</h2>
      <p class="page-sub">System health at a glance · Updated every 5 seconds</p>
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
      <div class="status-card" style="--border-color:{s.border}; --glow-color:{s.glow};">
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

  <!-- System info bar -->
  <div class="info-bar">
    <div class="info-item">
      <span class="info-label">Hardware</span>
      <span class="info-value">Dell R720 · 2× Xeon E5-2690 v2 · 16 cores · 96 GB ECC</span>
    </div>
    <div class="info-item">
      <span class="info-label">Collectors</span>
      <span class="info-value">eBPF Kprobes + perf_event_open PMU + iDRAC DCMI</span>
    </div>
    <div class="info-item">
      <span class="info-label">Storage Engine</span>
      <span class="info-value">VictoriaMetrics · Prometheus wire format · 5s scrape</span>
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
    font-family: 'Space Grotesk', system-ui, sans-serif;
  }

  .page-header { display: flex; align-items: flex-start; justify-content: space-between; }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .page-sub { color: #475569; font-size: 0.875rem; margin-top: 0.3rem; }

  .last-updated {
    display: flex; align-items: center; gap: 0.5rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem; color: #475569;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 900px) { .cards-grid { grid-template-columns: 1fr; } }

  .status-card {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 2rem;
    display: flex; flex-direction: column; gap: 0.75rem;
    box-shadow: 0 0 40px var(--glow-color), 0 4px 24px rgba(0,0,0,0.4);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .status-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 0 60px var(--glow-color), 0 12px 40px rgba(0,0,0,0.5);
  }

  .card-top { display: flex; align-items: center; justify-content: space-between; }
  .card-icon { font-size: 1.8rem; line-height: 1; }

  .badge {
    font-size: 0.58rem; font-weight: 800; letter-spacing: 0.12em;
    padding: 0.22rem 0.6rem; border-radius: 9999px;
    font-family: 'JetBrains Mono', monospace;
    text-transform: uppercase;
  }
  .badge-ok   { background: rgba(52,211,153,0.1);   color: #34d399; border: 1px solid rgba(52,211,153,0.25); }
  .badge-warn { background: rgba(251,146,60,0.1);    color: #fb923c; border: 1px solid rgba(251,146,60,0.25); }
  .badge-crit { background: rgba(248,113,113,0.1);   color: #f87171; border: 1px solid rgba(248,113,113,0.25); }
  .badge-none { background: rgba(51,65,85,0.3);      color: #475569; border: 1px solid rgba(51,65,85,0.5); }

  .card-title    { font-size: 1.3rem; font-weight: 700; color: #e2e8f0; }
  .card-subtitle { font-size: 0.7rem; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }

  .card-value-row { display: flex; align-items: baseline; gap: 0.5rem; margin-top: 0.5rem; }
  .card-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 3.5rem; font-weight: 900; line-height: 1;
  }
  .card-unit { font-family: 'JetBrains Mono', monospace; font-size: 1rem; color: #475569; }

  .card-detail {
    font-size: 0.825rem; color: #64748b; line-height: 1.55; margin-top: auto;
    font-family: 'Space Grotesk', sans-serif;
  }

  .card-thresholds {
    font-size: 0.68rem; font-family: 'JetBrains Mono', monospace;
    color: #1e3a4a; padding: 0.5rem 0.75rem;
    background: rgba(8, 15, 30, 0.6); border-radius: 6px; border: 1px solid #0f2335;
  }

  .info-bar {
    display: flex; flex-wrap: wrap; gap: 1.5rem;
    padding: 1rem 1.25rem;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid #1e293b; border-radius: 10px;
  }

  .info-item { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 200px; }
  .info-label {
    font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #1e3a5f;
  }
  .info-value { font-size: 0.78rem; color: #475569; font-family: 'JetBrains Mono', monospace; }
</style>

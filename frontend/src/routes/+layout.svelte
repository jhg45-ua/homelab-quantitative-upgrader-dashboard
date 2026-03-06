<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { loadHardwareConfig, hwConfig } from "$lib/hwConfig";

  $: currentPath = $page.url.pathname;

  const links = [
    { href: "/", label: "Executive Overview" },
    { href: "/advanced", label: "Scientific Deep Dive" },
    { href: "/methodology", label: "Methodology" },
  ];

  let tsdbStatus: "connected" | "disconnected" | "checking" = "checking";

  async function checkHealth() {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        tsdbStatus = data.status === "connected" ? "connected" : "disconnected";
      } else {
        tsdbStatus = "disconnected";
      }
    } catch (e) {
      tsdbStatus = "disconnected";
    }
  }

  onMount(() => {
    loadHardwareConfig();
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div style="min-height: 100dvh; background: #080f1e; color: #e2e8f0;">
  <!-- Navbar -->
  <nav class="navbar">
    <a href="/" class="navbar-logo">
      <span class="bracket">[</span>HQUD<span class="bracket">]</span>
      <span class="node-badge">{$hwConfig.node_name}</span>
      <div class="health-indicator {tsdbStatus}">
        <span class="dot"></span>
        <span class="text">
          {#if tsdbStatus === "connected"}
            TSDB Online
          {:else if tsdbStatus === "disconnected"}
            TSDB Offline
          {:else}
            Checking...{/if}
        </span>
      </div>
    </a>
    <div class="navbar-links">
      {#each links as link}
        <a
          href={link.href}
          class="nav-link {currentPath === link.href ? 'active' : ''}"
        >
          {link.label}
        </a>
      {/each}
    </div>
  </nav>

  <!-- Each page controls its own layout below the navbar -->
  <slot />
</div>

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 50;
    height: 3.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    background: rgba(8, 15, 30, 0.9);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    box-shadow: 0 2px 32px rgba(0, 0, 0, 0.5);
  }

  .navbar-logo {
    font-family: "JetBrains Mono", monospace;
    font-size: 1.1rem;
    font-weight: 700;
    color: #38bdf8;
    text-decoration: none;
    letter-spacing: 0.06em;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .navbar-logo:hover {
    color: #7dd3fc;
  }
  .bracket {
    color: #334155;
    font-weight: 300;
  }

  .node-badge {
    font-size: 0.6rem;
    font-weight: 500;
    color: #475569;
    background: rgba(51, 65, 85, 0.3);
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(51, 65, 85, 0.4);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .navbar-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .nav-link {
    font-size: 0.8rem;
    font-weight: 500;
    color: #64748b;
    text-decoration: none;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    border: 1px solid transparent;
    transition: all 0.2s;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .nav-link:hover {
    color: #cbd5e1;
    background: rgba(51, 65, 85, 0.35);
  }
  .nav-link.active {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
    border-color: rgba(56, 189, 248, 0.2);
  }

  .health-indicator {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(51, 65, 85, 0.4);
    font-size: 0.65rem;
    font-weight: 500;
    margin-left: 0.5rem;
    transition: all 0.3s ease;
  }
  .health-indicator .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .health-indicator.connected .dot {
    background-color: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  }
  .health-indicator.connected .text {
    color: #10b981;
  }
  .health-indicator.disconnected .dot {
    background-color: #ef4444;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  }
  .health-indicator.disconnected .text {
    color: #ef4444;
  }
  .health-indicator.checking .dot {
    background-color: #fbbf24;
  }
  .health-indicator.checking .text {
    color: #fbbf24;
  }
</style>

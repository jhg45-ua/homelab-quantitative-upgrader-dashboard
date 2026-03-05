<script lang="ts">
  import { page } from '$app/stores';
  $: currentPath = $page.url.pathname;

  const links = [
    { href: '/', label: 'Executive Overview' },
    { href: '/advanced', label: 'Scientific Deep Dive' },
    { href: '/methodology', label: 'Methodology' }
  ];
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div style="min-height: 100dvh; background: #080f1e; color: #e2e8f0;">
  <!-- Navbar -->
  <nav class="navbar">
    <a href="/" class="navbar-logo">
      <span class="bracket">[</span>HQUD<span class="bracket">]</span>
    </a>
    <div class="navbar-links">
      {#each links as link}
        <a href={link.href} class="nav-link {currentPath === link.href ? 'active' : ''}">
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
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    color: #38bdf8;
    text-decoration: none;
    letter-spacing: 0.06em;
    transition: color 0.2s;
  }
  .navbar-logo:hover { color: #7dd3fc; }
  .bracket { color: #334155; font-weight: 300; }

  .navbar-links { display: flex; align-items: center; gap: 0.25rem; }

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
  .nav-link:hover { color: #cbd5e1; background: rgba(51, 65, 85, 0.35); }
  .nav-link.active {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
    border-color: rgba(56, 189, 248, 0.2);
  }
</style>

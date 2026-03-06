import requests
from jinja2 import Environment, FileSystemLoader
from datetime import datetime, timezone
import sys
import os

# ── Read config.yaml ─────────────────────────────────────────────────────────
try:
    import yaml
except ImportError:
    print("[WARN] PyYAML not installed, using defaults", file=sys.stderr)
    yaml = None

def load_config():
    """Read config.yaml from the project root (one level up from auditor/)."""
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    if yaml and os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    return {}

_cfg = load_config()

# ── Configuration ────────────────────────────────────────────────────────────
VM_URL = "http://localhost:8428/api/v1/query"
TARGET_NODE = _cfg.get("node_name", "unknown-node")
HARDWARE = _cfg.get("hardware_desc", "Unknown Hardware")

# ── Thresholds ────────────────────────────────────────────────────────────────
THRESHOLDS = {
    "cpi":      {"optimal": 2.0,  "critical": 4.0},   # ratio
    "amat":     {"optimal": 10.0, "critical": 15.0},  # cycles
    "p99_us":   {"optimal": 2000, "critical": 10000}, # microseconds
    "numa_pct": {"optimal": 5.0,  "critical": 20.0},  # percent
    "power_w":  {"optimal": 200,  "critical": 275},   # watts
}


def vm_query(promql: str) -> float | None:
    """Run a PromQL instant query against VictoriaMetrics. Returns float or None."""
    try:
        r = requests.get(VM_URL, params={"query": promql}, timeout=8)
        r.raise_for_status()
        data = r.json()
        if data.get("status") != "success":
            return None
        results = data.get("data", {}).get("result", [])
        if not results:
            return None
        val = results[0]["value"][1]
        if val in ("NaN", "Inf", "-Inf"):
            return None
        return float(val)
    except Exception as e:
        print(f"  [warn] PromQL '{promql[:60]}…' failed: {e}", file=sys.stderr)
        return None


def classify(value: float | None, key: str) -> str:
    """Return OPTIMAL / WARNING / CRITICAL / NO DATA."""
    if value is None:
        return "NO DATA"
    t = THRESHOLDS[key]
    if value <= t["optimal"]:
        return "OPTIMAL"
    if value <= t["critical"]:
        return "WARNING"
    return "CRITICAL"


def status_icon(status: str) -> str:
    return {"OPTIMAL": "✅", "WARNING": "⚠️", "CRITICAL": "🔴", "NO DATA": "⬜"}.get(status, "⬜")


def overall_score(statuses: list[str]) -> tuple[str, str]:
    """Compute a letter grade A–D and sentiment from individual statuses."""
    counts = {s: statuses.count(s) for s in ("OPTIMAL", "WARNING", "CRITICAL", "NO DATA")}
    if counts["CRITICAL"] >= 2:
        return "D", "CRITICAL — Immediate architectural intervention required"
    if counts["CRITICAL"] == 1:
        return "C", "WARNING — One pillar under stress, action recommended"
    if counts["WARNING"] >= 2:
        return "B+", "CAUTION — Multiple metrics trending toward bottleneck"
    if counts["WARNING"] == 1:
        return "A-", "GOOD — Minor inefficiency detected, monitor closely"
    return "A", "OPTIMAL — Node operating within all quantitative thresholds"


def recommendation(key: str, status: str, value: float | None) -> str:
    """Return a one-line recommendation string."""
    if status == "NO DATA":
        return "No data available — verify the agent is running and metrics are being pushed."
    recs = {
        "cpi": {
            "OPTIMAL":  "Pipeline is efficient. No pipeline stall intervention needed.",
            "WARNING":  "Review branch misprediction rate and L2/L3 cache hit ratios.",
            "CRITICAL": "Severe pipeline stall detected. Profile workload with `perf stat` and optimize hot loops.",
        },
        "amat": {
            "OPTIMAL":  "Working set fits comfortably in L1/L2 cache.",
            "WARNING":  "Working set is spilling to L3/DRAM. Consider increasing cache-friendly data layouts.",
            "CRITICAL": "High DRAM access penalty. Upgrade to DDR4 or restructure working set for better locality.",
        },
        "p99_us": {
            "OPTIMAL":  "Block I/O P99 latency is within NVMe-class thresholds.",
            "WARNING":  "P99 latency indicates SATA-SSD-range performance. Evaluate queue depth and RAID configuration.",
            "CRITICAL": (
                f"P99 latency of {value:.0f} µs ({value/1000:.1f} ms) violates the 10 ms SLO. "
                "Strongly recommend replacing spinning-disk or SATA-SSD pool with NVMe PCIe Gen 4."
            ),
        },
        "numa_pct": {
            "OPTIMAL":  "Memory locality is excellent. Cross-socket QPI traffic is negligible.",
            "WARNING":  "Moderate NUMA misses detected. Consider `numactl --membind` for memory-intensive workloads.",
            "CRITICAL": "High cross-socket memory traffic is degrading performance. Pin processes with `taskset` + `numactl`.",
        },
        "power_w": {
            "OPTIMAL":  "Power consumption is within the system's rated TDP envelope.",
            "WARNING":  "Power draw is elevated. Verify cooling and BIOS power management settings.",
            "CRITICAL": "Power draw near or beyond rated limits. Check for thermal throttling with `ipmitool sdr type Temperature`.",
        },
    }
    return recs.get(key, {}).get(status, "—")


def main():
    print("HQUD Module E — Quantitative Architecture Auditor v2.0")
    print("=" * 55)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # ── Fetch all metrics ──────────────────────────────────────────────────
    print("\nFetching live metrics from VictoriaMetrics…")

    cpi   = vm_query(f'hqud_cpu_cpi{{host="{TARGET_NODE}"}}')
    amat  = vm_query(f'hqud_cpu_amat_cycles{{host="{TARGET_NODE}"}}')
    p99   = vm_query(
        'histogram_quantile(0.99, sum(rate('
        f'hqud_io_latency_usec_bucket{{host="{TARGET_NODE}"}}[5m])) by (le))'
    )
    numa  = vm_query(f'hqud_numa_miss_rate{{host="{TARGET_NODE}"}}')
    power = vm_query(f'hqud_power_watts{{host="{TARGET_NODE}"}}')
    eff   = vm_query(f'hqud_efficiency_ips_per_watt{{host="{TARGET_NODE}"}}')
    ctx   = vm_query(f'hqud_os_context_switches_ps{{host="{TARGET_NODE}"}}')
    miss_rate = vm_query(f'hqud_cpu_cache_miss_rate{{host="{TARGET_NODE}"}}')

    print(f"  CPI={cpi}  AMAT={amat}  P99={p99}µs  NUMA={numa}%  Power={power}W")

    # ── Classify ───────────────────────────────────────────────────────────
    s_cpi  = classify(cpi,   "cpi")
    s_amat = classify(amat,  "amat")
    s_p99  = classify(p99,   "p99_us")
    s_numa = classify(numa,  "numa_pct")
    s_pow  = classify(power, "power_w")

    grade, overall = overall_score([s_cpi, s_amat, s_p99, s_numa, s_pow])

    # ── Build template context ─────────────────────────────────────────────
    def fmt(v, decimals=2, unit=""):
        return f"{v:.{decimals}f}{unit}" if v is not None else "N/A"

    ctx_data = dict(
        # Meta
        target_node=TARGET_NODE,
        hardware=HARDWARE,
        timestamp=now,
        grade=grade,
        overall=overall,
        # CPU
        cpi_val=fmt(cpi), cpi_status=s_cpi, cpi_icon=status_icon(s_cpi),
        cpi_rec=recommendation("cpi", s_cpi, cpi),
        miss_rate_val=fmt(miss_rate, 2, "%") if miss_rate is not None else "N/A",
        ctx_val=fmt(ctx, 1, "/s") if ctx is not None else "N/A",
        # Memory
        amat_val=fmt(amat), amat_status=s_amat, amat_icon=status_icon(s_amat),
        amat_rec=recommendation("amat", s_amat, amat),
        # Storage
        p99_val=fmt(p99, 2, " µs"), p99_ms=fmt(p99/1000 if p99 else None, 2, " ms"),
        p99_status=s_p99, p99_icon=status_icon(s_p99),
        p99_rec=recommendation("p99_us", s_p99, p99),
        # NUMA
        numa_val=fmt(numa, 2, "%"), numa_status=s_numa, numa_icon=status_icon(s_numa),
        numa_rec=recommendation("numa_pct", s_numa, numa),
        # Power
        power_val=fmt(power, 1, " W"), power_status=s_pow, power_icon=status_icon(s_pow),
        power_rec=recommendation("power_w", s_pow, power),
        eff_val=fmt(eff, 1, " IPS/W") if eff is not None else "N/A",
    )

    # ── Render ─────────────────────────────────────────────────────────────
    env = Environment(loader=FileSystemLoader("."))
    template = env.get_template("template.md")
    rendered = template.render(**ctx_data)

    with open("audit_report.md", "w", encoding="utf-8") as f:
        f.write(rendered)

    print(f"\nReport written → audit_report.md  [Grade: {grade}]")
    print(f"Overall: {overall}")


if __name__ == "__main__":
    main()

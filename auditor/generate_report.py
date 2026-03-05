import requests
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import sys

# Configuration
VICTORIA_METRICS_URL = "http://localhost:8428/api/v1/query"
# PromQL for 99th percentile I/O latency in the last 5 minutes
PROMQL_QUERY = 'histogram_quantile(0.99, sum(rate(hqud_io_latency_usec_bucket[5m])) by (le))'
TARGET_NODE = "r720-vm"
THRESHOLD_US = 10000.0  # 10 milliseconds

def fetch_p99_latency() -> float:
    """Queries VictoriaMetrics and returns the P99 latency in microseconds."""
    try:
        response = requests.get(VICTORIA_METRICS_URL, params={'query': PROMQL_QUERY})
        response.raise_for_status()
        data = response.json()
        
        if data.get('status') != 'success':
            print(f"Error: API returned status {data.get('status')}")
            sys.exit(1)
            
        results = data.get('data', {}).get('result', [])
        
        if not results:
            print("Warning: No metrics returned. Is the eBPF agent running and generating data?")
            # Return 0 so the script doesn't completely fail, allowing report generation showing 0
            return 0.0
            
        # Extract the float value from the first result series
        # Value format is [timestamp, "string_value"]
        value_str = results[0]['value'][1]
        
        # In Prometheus, histogram_quantile can return NaN if there's no data
        if value_str == "NaN":
            print("Warning: PromQL returned NaN. Not enough data points to compute P99.")
            return 0.0
            
        return float(value_str)
        
    except requests.exceptions.RequestException as e:
        print(f"Failed to connect to VictoriaMetrics: {e}")
        sys.exit(1)
    except (IndexError, ValueError, KeyError) as e:
        print(f"Failed to parse VictoriaMetrics response: {e}")
        sys.exit(1)

def determine_verdict(p99_latency: float) -> str:
    """Applies the scientific threshold to produce the final architectural verdict."""
    if p99_latency > THRESHOLD_US:
        return "CRÍTICO: El nodo está sufriendo cuellos de botella severos de I/O (I/O Stall Time alto). Se recomienda encarecidamente actualizar el pool de almacenamiento a NVMe PCIe Gen 4."
    else:
        return "ÓPTIMO: El almacenamiento opera dentro de los márgenes teóricos. No se requiere actualización."

def generate_report(p99_latency: float, verdict: str):
    """Renders the Markdown templates using Jinja2."""
    env = Environment(loader=FileSystemLoader('.'))
    try:
        template = env.get_template('template.md')
    except Exception as e:
        print(f"Failed to load Jinja2 template: {e}")
        sys.exit(1)
        
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    # Render with parameters
    rendered_markdown = template.render(
        target_node=TARGET_NODE,
        timestamp=now_str,
        p99_latency=f"{p99_latency:.2f}",
        veredicto=verdict
    )
    
    # Save to disk
    with open('audit_report.md', 'w', encoding='utf-8') as f:
        f.write(rendered_markdown)
        
    print(f"Audit report successfully generated: audit_report.md")

if __name__ == "__main__":
    print("HQUD Module E - Automated Auditor")
    print("---------------------------------")
    print(f"Executing PromQL query for P99 latency...")
    
    p99_lat = fetch_p99_latency()
    print(f"Result: P99 Latency = {p99_lat:.2f} µs")
    
    verdict = determine_verdict(p99_lat)
    print(f"Verdict computed.")
    
    generate_report(p99_lat, verdict)
    print("Done.")

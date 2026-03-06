<div align="center">
  <h1>📈 HomeLab Quantitative Upgrader Dashboard (HQUD)</h1>
  <p><b>An ultra-lightweight, mathematically-driven hardware auditing and empirical analysis platform.</b></p>
</div>

HQUD is a comprehensive monitoring and hardware auditing platform designed specifically for HomeLab environments (e.g., Proxmox, Ubuntu). 

Instead of relying on superficial metrics like "overall CPU usage (%)", HQUD applies strictly mathematical formulas from *Hennessy & Patterson's "Computer Architecture: A Quantitative Approach"* to deliver justified, quantifiable verdicts on whether your hardware actually needs an upgrade.

---

## ✨ Features

- **🛡️ Ultra-Lightweight (v1.0)**: HQUD operates as a strict Single Page Application (SPA). The SvelteKit frontend is served directly by a highly optimized, compiled Go binary. **There is no Node.js requirement in production.**
- **🧮 Empirical & Mathematical**: Evaluates system performance using real computer architecture pillars: Cycles Per Instruction (CPI), Average Memory Access Time (AMAT), Little's Law, and the Roofline Model.
- **🚀 Bare-Metal Probing**: Built with eBPF and Go (CO-RE) for zero-overhead, hyper-accurate sensory extraction directly from the Linux kernel and hardware PMUs.
- **📊 Scientific Visualizations**: Modern, interactive UI featuring Roofline Charts, Latency Heatmaps, and Queue Saturation Dashboards powered by SvelteKit and ECharts.
- **🔐 Secure by Default**: Includes strict HTTP security headers, timeout mitigations against Slowloris, and loopback-network isolation for the time-series database.

---

## 🚀 Quickstart (Production Build)

Get HQUD up and running in 4 simple commands:

### 1. Download the Release
Download the pre-compiled `.tar.gz` package from the [Releases](https://github.com/jhg45-ua/homelab-quantitative-upgrader-dashboard/releases) tab. This package includes the static SPA frontend, the Go web backend, and the eBPF agent binaries. There is no need to install Go, Node.js, or any compiler!

### 2. Extract the Package
Unzip the downloaded platform into a fresh directory on your server:
```bash
mkdir hqud && cd hqud
tar -xzvf ../hqud-linux-amd64.tar.gz
```

### 3. Configure the Environment
Input your local hardware specifications (used by the mathematics engine to calculate theoretical limits).
```bash
# Edit the provided config.yaml with your specific hardware details
nano config.yaml
```

### 4. Start the Platform
Spin up VictoriaMetrics (TSDB) via Docker Compose and launch the services.
```bash
make start
```
> 🌐 **Access the Dashboard:** [http://localhost:8080](http://localhost:8080)

To execute the eBPF data collection probes (requires `sudo` for kernel hook access):
```bash
make agent
```

---

## 🧹 Maintenance & Data Management

HQUD v1.0 includes an intuitive `Makefile` to manage the system state safely.

- **Clean up build files**: If you wish to purge compiled binaries and frontend builds:
  ```bash
  make clean
  ```
- **Stop services**: To halt the background server and down the Docker containers:
  ```bash
  make stop
  ```
- **Wipe empirical data**: To completely reset your environment and delete all historical TSDB data:
  ```bash
  make wipe-data
  ```

---

## 📖 Documentation

For an in-depth look at how the mathematical calculations are performed, the architecture layout, and eBPF integration details, please refer to:
- 📄 [**TECHNICAL_REFERENCE.md**](./TECHNICAL_REFERENCE.md): Detailed architectural module breakdown and formulas.
- 📄 [**ARCHITECTURE.md**](./ARCHITECTURE.md): Technical constraints and environment map.
- 📄 [**AGENT_INSTRUCTIONS.md**](./AGENT_INSTRUCTIONS.md): Rules for dynamic configurations and hardware agnosticism.
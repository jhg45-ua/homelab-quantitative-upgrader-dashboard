#!/usr/bin/env bash
set -e

echo "==================================================="
echo "  HQUD (HomeLab Quantitative Upgrader Dashboard)   "
echo "  Native Baremetal Installer (v1.0.1)              "
echo "==================================================="

# 1. Require root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this installer with sudo."
  exit 1
fi

INSTALL_DIR="/opt/hqud"
DATA_DIR="${INSTALL_DIR}/data"

echo "[1/4] Creating installation directories..."
mkdir -p "${INSTALL_DIR}"
mkdir -p "${DATA_DIR}"

echo "[2/4] Copying binaries and configuration..."
# Move dependencies from the extracted tarball to /opt/hqud
cp hqud-tsdb "${INSTALL_DIR}/hqud-tsdb"
cp hqud-server "${INSTALL_DIR}/hqud-server"
cp hqud-agent "${INSTALL_DIR}/hqud-agent"
cp config.yaml "${INSTALL_DIR}/config.yaml"

# Copy the SvelteKit SPA build
if [ -d "frontend" ]; then
    rm -rf "${INSTALL_DIR}/frontend"
    cp -r frontend "${INSTALL_DIR}/frontend"
else
    echo "⚠️ Warning: SPA frontend directory missing in the package."
fi

# Ensure executable permissions
chmod +x "${INSTALL_DIR}/hqud-tsdb"
chmod +x "${INSTALL_DIR}/hqud-server"
chmod +x "${INSTALL_DIR}/hqud-agent"

echo "[3/4] Generating systemd services..."

cat << 'EOF' > /etc/systemd/system/hqud-tsdb.service
[Unit]
Description=HQUD VictoriaMetrics TSDB
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/hqud/hqud-tsdb -storageDataPath=/opt/hqud/data -retentionPeriod=1y -httpListenAddr=127.0.0.1:8428
Restart=on-failure
WorkingDirectory=/opt/hqud

[Install]
WantedBy=multi-user.target
EOF

cat << 'EOF' > /etc/systemd/system/hqud-server.service
[Unit]
Description=HQUD Quantitative Engine (Web Backend)
After=hqud-tsdb.service

[Service]
Type=simple
User=root
ExecStart=/opt/hqud/hqud-server
Restart=on-failure
WorkingDirectory=/opt/hqud

[Install]
WantedBy=multi-user.target
EOF

cat << 'EOF' > /etc/systemd/system/hqud-agent.service
[Unit]
Description=HQUD eBPF Sensor Agent
After=hqud-server.service

[Service]
Type=simple
User=root
ExecStart=/opt/hqud/hqud-agent
Restart=on-failure
WorkingDirectory=/opt/hqud
# eBPF requires memlock adjustments and kernel access
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF

echo "[4/4] Starting and enabling services..."
systemctl daemon-reload
systemctl enable --now hqud-tsdb
systemctl enable --now hqud-server
systemctl enable --now hqud-agent

echo "==================================================="
echo "✅ HQUD instalado correctamente!"
echo "   Base de datos, Backend y Agente ejecutándose."
echo "   "
echo "   Accede al Dashboard en: http://<IP-DEL-SERVIDOR>:8080"
echo "==================================================="

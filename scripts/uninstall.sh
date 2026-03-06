#!/usr/bin/env bash
set -e

echo "==================================================="
echo "  HQUD (HomeLab Quantitative Upgrader Dashboard)   "
echo "  Native Baremetal Uninstaller                 "
echo "==================================================="

# 1. Require root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this uninstaller with sudo."
  exit 1
fi

echo "[1/4] Stopping services..."
systemctl stop hqud-tsdb hqud-server hqud-agent || true

echo "[2/4] Disabling services..."
systemctl disable hqud-tsdb hqud-server hqud-agent || true

echo "[3/4] Removing systemd service files..."
rm -f /etc/systemd/system/hqud-*.service
systemctl daemon-reload

echo "[4/4] Removing installation directory (/opt/hqud)..."
rm -rf /opt/hqud

echo "==================================================="
echo "✅ HQUD desinstalado y borrado del sistema limpiamente."
echo "==================================================="

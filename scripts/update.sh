#!/usr/bin/env bash
set -e

# HQUD Updater Script
# This script safely updates HQUD binaries and frontend without touching user data or configuration.

if [ "$EUID" -ne 0 ]; then
  echo "Por favor, ejecuta este script de actualización como root (sudo)."
  exit 1
fi

echo "==> Deteniendo servicios de HQUD..."
systemctl stop hqud-tsdb hqud-server hqud-agent || true

echo "==> Actualizando binarios y frontend en /opt/hqud..."
mkdir -p /opt/hqud
cp -f hqud-tsdb /opt/hqud/
cp -f hqud-server /opt/hqud/
cp -f hqud-agent /opt/hqud/
cp -rf frontend /opt/hqud/

echo "==> Comprobando configuración de hardware e IPMI..."
if [ ! -f /opt/hqud/config.yaml ]; then
    echo "No se encontró config.yaml previo. Inicializando configuración por defecto."
    cp config.yaml /opt/hqud/
else
    echo "Respetando config.yaml y datos actuales del usuario."
fi

echo "==> Reiniciando y activando servicios actualizados..."
systemctl daemon-reload
systemctl start hqud-tsdb hqud-server hqud-agent

echo "¡HQUD actualizado a la nueva versión conservando la configuración!"

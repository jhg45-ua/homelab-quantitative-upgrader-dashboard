.PHONY: build start agent stop wipe-data clean

build:
	@echo "==> Building Frontend (SPA)..."
	cd frontend && npm run build
	@echo "==> Building Go Backend..."
	cd backend/cmd/server && go build -o ../../../hqud-server main.go
	@echo "==> Building eBPF Agent..."
	cd agent && go generate && go build -o ../hqud-agent

start:
	@echo "==> Starting TSDB (Docker Compose)..."
	docker compose up -d
	@echo "==> Starting Web Server in background..."
	nohup ./hqud-server > server.log 2>&1 &
	@echo "Server is running. Check server.log for output."

agent:
	@echo "==> Starting eBPF Agent (requires sudo)..."
	sudo ./hqud-agent

stop:
	@echo "==> Stopping Go Backend..."
	pkill -f "./hqud-server" || true
	@echo "==> Stopping Docker Compose..."
	docker compose down

wipe-data: stop
	@echo "==> Wiping VictoriaMetrics data..."
	rm -rf ./data/tsdb
	mkdir -p ./data/tsdb
	@echo "Datos empíricos borrados con éxito. El sistema está limpio."

clean:
	@echo "==> Cleaning generated files..."
	rm -rf hqud-server hqud-agent server.log frontend/build agent/*_bpfel.*
	@echo "Limpieza completada."

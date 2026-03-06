.PHONY: build start agent stop wipe-data clean release-pkg

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
	rm -rf hqud-server hqud-agent server.log frontend/build agent/*_bpfel.* dist hqud-linux-amd64.tar.gz
	@echo "Limpieza completada."

release-pkg: clean
	@echo "==> Preparing Release Package..."
	mkdir -p dist
	@echo "==> Building Frontend (SPA)..."
	cd frontend && npm install && npm run build
	@echo "==> Building Go Backend..."
	cd backend/cmd/server && GOOS=linux GOARCH=amd64 go build -o ../../../dist/hqud-server main.go
	@echo "==> Building eBPF Agent..."
	cd agent && go generate ./... && GOOS=linux GOARCH=amd64 go build -o ../dist/hqud-agent .
	@echo "==> Assembling distribution files..."
	cp docker-compose.yml dist/
	cp config.example.yaml dist/config.yaml
	cp Makefile.run dist/Makefile
	@echo "==> Compressing package..."
	tar -czvf hqud-linux-amd64.tar.gz -C dist .
	@echo "Paquete hqud-linux-amd64.tar.gz generado con éxito."

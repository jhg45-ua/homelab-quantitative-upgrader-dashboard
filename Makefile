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
	@echo "==> Fetching VictoriaMetrics TSDB (Native)..."
	wget -qO dist/vm.tar.gz https://github.com/VictoriaMetrics/VictoriaMetrics/releases/download/v1.93.0/victoria-metrics-linux-amd64-v1.93.0.tar.gz
	tar -xzf dist/vm.tar.gz -C dist victoria-metrics-prod
	mv dist/victoria-metrics-prod dist/hqud-tsdb
	rm dist/vm.tar.gz
	@echo "==> Building Frontend (SPA)..."
	cd frontend && npm install && npm run build
	@echo "==> Building Go Backend..."
	cd backend/cmd/server && GOOS=linux GOARCH=amd64 go build -o ../../../dist/hqud-server main.go
	@echo "==> Building eBPF Agent..."
	cd agent && go generate ./... && go mod tidy && GOOS=linux GOARCH=amd64 go build -o ../dist/hqud-agent .
	@echo "==> Assembling distribution files..."
	mkdir -p dist/frontend
	cp -r frontend/build dist/frontend/
	cp config.example.yaml dist/config.yaml
	cp scripts/install.sh dist/install.sh
	cp scripts/uninstall.sh dist/uninstall.sh
	cp scripts/update.sh dist/update.sh
	chmod +x dist/install.sh dist/uninstall.sh dist/update.sh
	@echo "==> Compressing package..."
	tar -czvf hqud-linux-amd64.tar.gz -C dist .
	@echo "Paquete hqud-linux-amd64.tar.gz generado con éxito."

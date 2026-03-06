// HQUD Backend HTTP Server
// Listens on :8082
// Endpoints:
//
//	GET /api/generate-audit  — runs Python auditor, returns Markdown
//	GET /api/hardware        — returns parsed config.yaml as JSON
//	GET /api/health          — health check
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"gopkg.in/yaml.v3"
)

// ── Config struct  ──────────────────────────────────────────────────────────

type HardwareConfig struct {
	NodeName     string `yaml:"node_name"     json:"node_name"`
	HardwareDesc string `yaml:"hardware_desc" json:"hardware_desc"`
	Specs        struct {
		Cores        int     `yaml:"cores"           json:"cores"`
		PeakMips     float64 `yaml:"peak_mips"       json:"peak_mips"`
		MaxMemBwGbps float64 `yaml:"max_mem_bw_gbps" json:"max_mem_bw_gbps"`
	} `yaml:"specs" json:"specs"`
	Ipmi struct {
		Host string `yaml:"host" json:"host"`
		User string `yaml:"user" json:"-"` // never expose user/pass
		Pass string `yaml:"pass" json:"-"`
	} `yaml:"ipmi" json:"ipmi"`
}

// ── Path helpers ────────────────────────────────────────────────────────────

func projectRoot() string {
	_, filename, _, _ := runtime.Caller(0)
	root := filepath.Join(filepath.Dir(filename), "..", "..", "..")
	abs, err := filepath.Abs(root)
	if err != nil {
		log.Fatalf("Cannot resolve project root: %v", err)
	}
	return abs
}

func auditorDir() string { return filepath.Join(projectRoot(), "auditor") }

func configPath() string {
	if _, err := os.Stat("config.yaml"); err == nil {
		return "config.yaml" // Production Release Path
	}
	return filepath.Join(projectRoot(), "config.yaml") // Local Dev Path
}

var globalConfig HardwareConfig

// ── /api/hardware ───────────────────────────────────────────────────────────

func handleHardware(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(globalConfig)
}

// ── /api/generate-audit ─────────────────────────────────────────────────────

func handleGenerateAudit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	dir := auditorDir()
	log.Printf("[audit] Running Python script in dir: %s", dir)

	pythonBin := filepath.Join(dir, "venv", "bin", "python3")
	if _, err := os.Stat(pythonBin); err != nil {
		pythonBin = "python3"
	}

	cmd := exec.Command(pythonBin, "generate_report.py")
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[audit] Python script failed: %v\nOutput:\n%s", err, string(out))
		http.Error(w,
			fmt.Sprintf("Audit script failed: %v\n\nScript output:\n%s", err, string(out)),
			http.StatusInternalServerError)
		return
	}
	log.Printf("[audit] Script stdout:\n%s", string(out))

	reportPath := filepath.Join(dir, "audit_report.md")
	content, err := os.ReadFile(reportPath)
	if err != nil {
		log.Printf("[audit] Cannot read report file: %v", err)
		http.Error(w, fmt.Sprintf("Cannot read audit_report.md: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
	w.Write(content)
	log.Printf("[audit] Report served successfully (%d bytes)", len(content))
}

func frontendBuildDir() string {
	if _, err := os.Stat("frontend/build"); err == nil {
		return "frontend/build" // Production Release Path
	}
	return filepath.Join(projectRoot(), "frontend", "build") // Local Dev Path
} // ── SPA Handler ──

type spaHandler struct {
	staticPath string
	indexPath  string
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path, err := filepath.Abs(r.URL.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	path = filepath.Join(h.staticPath, path)

	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

// ── Middleware ──────────────────────────────────────────────────────────────

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		next.ServeHTTP(w, r)
	})
}

// ── main ────────────────────────────────────────────────────────────────────

func main() {
	// Parse config.yaml at startup
	configData, err := os.ReadFile(configPath())
	if err != nil {
		log.Printf("[WARN] Cannot read config.yaml at startup: %v", err)
	} else {
		if err := yaml.Unmarshal(configData, &globalConfig); err != nil {
			log.Printf("[WARN] Cannot parse config.yaml: %v", err)
		} else {
			log.Printf("[hqud-server] Loaded config for node: %s", globalConfig.NodeName)
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/generate-audit", handleGenerateAudit)
	mux.HandleFunc("/api/hardware", handleHardware)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Ping VictoriaMetrics
		client := http.Client{Timeout: 2 * time.Second}
		resp, err := client.Get("http://127.0.0.1:8428/api/v1/status/tsdb")
		if err != nil || resp.StatusCode != http.StatusOK {
			fmt.Fprint(w, `{"status":"disconnected","service":"hqud-server"}`)
			return
		}
		defer resp.Body.Close()
		fmt.Fprint(w, `{"status":"connected","service":"hqud-server"}`)
	})

	tsdbURL, _ := url.Parse("http://127.0.0.1:8428")
	proxy := httputil.NewSingleHostReverseProxy(tsdbURL)
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("[Proxy Error] Failed to route %s to VictoriaMetrics: %v", r.URL.Path, err)
		http.Error(w, "TSDB Proxy Error", http.StatusBadGateway)
	}
	mux.Handle("/api/", proxy) // Capture any API requests not handled by exact matches like /api/health

	spa := spaHandler{staticPath: frontendBuildDir(), indexPath: "index.html"}
	mux.Handle("/", spa)

	addr := ":8080"

	srv := &http.Server{
		Addr:         addr,
		Handler:      securityHeadersMiddleware(mux),
		ReadTimeout:  10 * time.Second, // Prevents Slowloris attacks
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("[hqud-server] Listening securely on http://0.0.0.0%s", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("[hqud-server] Fatal: %v", err)
	}
}

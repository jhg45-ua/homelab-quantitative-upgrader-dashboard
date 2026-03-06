// HQUD Backend HTTP Server
// Listens on :8082
// Endpoints:
//   GET /api/generate-audit  — runs Python auditor, returns Markdown
//   GET /api/hardware        — returns parsed config.yaml as JSON
//   GET /api/health          — health check
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"gopkg.in/yaml.v3"
)

// ── Config struct  ──────────────────────────────────────────────────────────

type HardwareConfig struct {
	NodeName     string `yaml:"node_name"     json:"node_name"`
	HardwareDesc string `yaml:"hardware_desc" json:"hardware_desc"`
	Specs        struct {
		Cores         int     `yaml:"cores"           json:"cores"`
		PeakMips      float64 `yaml:"peak_mips"       json:"peak_mips"`
		MaxMemBwGbps  float64 `yaml:"max_mem_bw_gbps" json:"max_mem_bw_gbps"`
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
func configPath() string { return filepath.Join(projectRoot(), "config.yaml") }

// ── /api/hardware ───────────────────────────────────────────────────────────

func handleHardware(w http.ResponseWriter, r *http.Request) {
	data, err := os.ReadFile(configPath())
	if err != nil {
		http.Error(w, fmt.Sprintf("Cannot read config.yaml: %v", err), http.StatusInternalServerError)
		return
	}

	var cfg HardwareConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		http.Error(w, fmt.Sprintf("Cannot parse config.yaml: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(cfg)
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

// ── main ────────────────────────────────────────────────────────────────────

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/generate-audit", handleGenerateAudit)
	mux.HandleFunc("/api/hardware", handleHardware)
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok","service":"hqud-audit-server"}`)
	})

	addr := ":8083"
	log.Printf("[audit-server] Listening on http://0.0.0.0%s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("[audit-server] Fatal: %v", err)
	}
}

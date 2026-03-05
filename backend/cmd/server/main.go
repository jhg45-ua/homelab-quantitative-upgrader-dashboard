// Module E — Audit HTTP Server
// Listens on :8082 and exposes GET /api/generate-audit
//
// It executes the Python auditor script, reads the resulting Markdown,
// and returns it to the caller. The SvelteKit Vite dev-server proxies
// /api/generate-audit → http://localhost:8082.
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// auditorDir returns the absolute path to the auditor/ directory,
// resolved from this binary's location so it works from any CWD.
func auditorDir() string {
	_, filename, _, _ := runtime.Caller(0)
	// backend/cmd/server/main.go → up 3 levels → project root → auditor/
	root := filepath.Join(filepath.Dir(filename), "..", "..", "..")
	abs, err := filepath.Abs(root)
	if err != nil {
		log.Fatalf("Cannot resolve project root: %v", err)
	}
	return filepath.Join(abs, "auditor")
}

func handleGenerateAudit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	dir := auditorDir()
	log.Printf("[audit] Running Python script in dir: %s", dir)

	// Prefer the venv interpreter so jinja2/requests are available
	pythonBin := filepath.Join(dir, "venv", "bin", "python3")
	if _, err := os.Stat(pythonBin); err != nil {
		pythonBin = "python3" // fall back to system python
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

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/generate-audit", handleGenerateAudit)

	// Health check for Vite proxy probe
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok","service":"hqud-audit-server"}`)
	})

	addr := ":8082"
	log.Printf("[audit-server] Listening on http://0.0.0.0%s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("[audit-server] Fatal: %v", err)
	}
}

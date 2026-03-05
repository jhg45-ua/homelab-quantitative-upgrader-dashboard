module hqud-agent

go 1.25.7

require (
	github.com/cilium/ebpf v0.21.0
	hqud-backend v0.0.0-00010101000000-000000000000
)

require golang.org/x/sys v0.37.0 // indirect

replace hqud-backend => ../backend

module hqud-agent

go 1.25.7

require (
	github.com/cilium/ebpf v0.21.0
	hqud-backend v0.0.0-00010101000000-000000000000
)

require (
	github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/pmu v0.0.0-00010101000000-000000000000 // indirect
	golang.org/x/sys v0.41.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

replace hqud-backend => ../backend

replace github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/pmu => ./pmu

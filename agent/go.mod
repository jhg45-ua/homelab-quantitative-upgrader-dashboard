module hqud-agent

go 1.25.7

require (
	github.com/cilium/ebpf v0.21.0
	github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/ipmi v0.0.0-00010101000000-000000000000
	github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/numa v0.0.0-00010101000000-000000000000
	github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/pmu v0.0.0-00010101000000-000000000000
	gopkg.in/yaml.v3 v3.0.1
	hqud-backend v0.0.0-00010101000000-000000000000
)

require (
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/prometheus/client_golang v1.22.0 // indirect
	github.com/prometheus/client_model v0.6.1 // indirect
	github.com/prometheus/common v0.62.0 // indirect
	github.com/prometheus/procfs v0.15.1 // indirect
	golang.org/x/sys v0.42.0 // indirect
	google.golang.org/protobuf v1.36.5 // indirect
)

replace hqud-backend => ../backend

replace github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/pmu => ./pmu

replace github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/ipmi => ./ipmi

replace github.com/jhg/homelab-quantitative-upgrader-dashboard/agent/numa => ./numa

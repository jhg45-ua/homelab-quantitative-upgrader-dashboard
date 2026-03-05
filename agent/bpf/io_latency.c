//go:build ignore

#include "vmlinux.h"
#include <bpf/bpf_helpers.h>

char __license[] SEC("license") = "Dual MIT/GPL";

struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10240);
    __type(key, void *); // Request pointer
    __type(value, u64);  // Issue time (ns)
} start_time SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 64); // Log2 buckets for latency in microseconds
    __type(key, u32);
    __type(value, u64);
} io_latency_hist SEC(".maps");

struct tp_block_rq_issue {
    u64 pad;
    u32 dev;
    u32 _pad1;
    u64 sector;
    u32 nr_sector;
    u32 bytes;
    char rwbs[8];
    char comm[16];
    void *cmd;
};

struct tp_block_rq_complete {
    u64 pad;
    u32 dev;
    u32 _pad1;
    u64 sector;
    u32 nr_sector;
    int error;
    char rwbs[8];
    void *cmd;
};

SEC("tracepoint/block/block_rq_issue")
int handle_block_rq_issue(struct tp_block_rq_issue *ctx) {
    void *req = ctx->cmd;
    u64 ts = bpf_ktime_get_ns();

    bpf_map_update_elem(&start_time, &req, &ts, BPF_ANY);
    return 0;
}

SEC("tracepoint/block/block_rq_complete")
int handle_block_rq_complete(struct tp_block_rq_complete *ctx) {
    void *req = ctx->cmd;
    u64 *tsp, latency;
    
    tsp = bpf_map_lookup_elem(&start_time, &req);
    if (!tsp) {
        return 0;
    }

    latency = bpf_ktime_get_ns() - *tsp;
    bpf_map_delete_elem(&start_time, &req);

    u64 lat_us = latency / 1000;
    u32 bucket = 0;
    u64 val = lat_us;
    while (val > 0 && bucket < 63) {
        val >>= 1;
        bucket++;
    }

    u64 *count = bpf_map_lookup_elem(&io_latency_hist, &bucket);
    if (count) {
        __sync_fetch_and_add(count, 1);
    }

    return 0;
}

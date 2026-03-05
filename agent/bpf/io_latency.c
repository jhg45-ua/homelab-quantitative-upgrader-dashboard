//go:build ignore

#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

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

SEC("kprobe/blk_mq_start_request")
int BPF_KPROBE(blk_mq_start_request, struct request *req) {
    u64 ts = bpf_ktime_get_ns();
    void *req_ptr = req;

    bpf_map_update_elem(&start_time, &req_ptr, &ts, BPF_ANY);
    return 0;
}

SEC("kprobe/blk_mq_complete_request")
int BPF_KPROBE(blk_mq_complete_request, struct request *req) {
    void *req_ptr = req;
    u64 *tsp, latency;
    
    tsp = bpf_map_lookup_elem(&start_time, &req_ptr);
    if (!tsp) {
        return 0;
    }

    latency = bpf_ktime_get_ns() - *tsp;
    bpf_map_delete_elem(&start_time, &req_ptr);

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

//go:build ignore

#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

char __license[] SEC("license") = "Dual MIT/GPL";

/* Tracks request start timestamps (keyed by request pointer) */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10240);
    __type(key, void *);
    __type(value, u64);
} start_time SEC(".maps");

/* Latency histogram: 64 log2 buckets in microseconds */
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 64);
    __type(key, u32);
    __type(value, u64);
} io_latency_hist SEC(".maps");

/*
 * Queue depth counter: single-element array.
 *   key 0 = current in-flight request count
 *   key 1 = total completed requests (for IOPS derivation)
 */
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 2);
    __type(key, u32);
    __type(value, u64);
} blk_queue_stats SEC(".maps");

SEC("kprobe/blk_mq_start_request")
int BPF_KPROBE(blk_mq_start_request, struct request *req) {
    u64 ts = bpf_ktime_get_ns();
    void *req_ptr = req;

    bpf_map_update_elem(&start_time, &req_ptr, &ts, BPF_ANY);

    /* Increment in-flight counter (key=0) */
    u32 k = 0;
    u64 *inflight = bpf_map_lookup_elem(&blk_queue_stats, &k);
    if (inflight) {
        __sync_fetch_and_add(inflight, 1);
    }

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

    /* Decrement in-flight counter (key=0), floor at 0 */
    u32 k = 0;
    u64 *inflight = bpf_map_lookup_elem(&blk_queue_stats, &k);
    if (inflight && *inflight > 0) {
        __sync_fetch_and_add(inflight, (u64)-1);
    }

    /* Increment total completed counter (key=1) — used for IOPS */
    u32 k1 = 1;
    u64 *completed = bpf_map_lookup_elem(&blk_queue_stats, &k1);
    if (completed) {
        __sync_fetch_and_add(completed, 1);
    }

    /* Latency histogram in log2(microseconds) */
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

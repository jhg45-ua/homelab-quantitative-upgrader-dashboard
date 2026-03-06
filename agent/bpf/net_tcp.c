//go:build ignore

#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

char __license[] SEC("license") = "Dual MIT/GPL";

// Single-element array to count TCP retransmissions globally.
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 1);
    __type(key, u32);
    __type(value, u64);
} tcp_retransmit_count SEC(".maps");

// Fires every time the kernel retransmits a TCP segment.
// We simply increment a global counter — no per-socket tracking needed
// because we only care about the aggregate retransmit rate.
SEC("kprobe/tcp_retransmit_skb")
int BPF_KPROBE(tcp_retransmit_skb, void *sk, void *skb) {
    u32 key = 0;
    u64 *count = bpf_map_lookup_elem(&tcp_retransmit_count, &key);
    if (count) {
        __sync_fetch_and_add(count, 1);
    }
    return 0;
}

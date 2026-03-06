// Shared hardware config store — fetched once from /api/hardware
// All components import this to get node_name, hardware_desc, peak_mips, etc.
import { writable } from 'svelte/store';

export interface HardwareConfig {
    node_name: string;
    hardware_desc: string;
    specs: {
        cores: number;
        peak_mips: number;
        max_mem_bw_gbps: number;
    };
}

const DEFAULT: HardwareConfig = {
    node_name: 'unknown',
    hardware_desc: 'Unknown Hardware',
    specs: { cores: 0, peak_mips: 100000, max_mem_bw_gbps: 50 }
};

export const hwConfig = writable<HardwareConfig>(DEFAULT);
export const hwLoaded = writable<boolean>(false);

let fetched = false;

export async function loadHardwareConfig() {
    if (fetched) return;
    try {
        const res = await fetch('/api/hardware');
        if (res.ok) {
            const data = await res.json();
            hwConfig.set(data);
            hwLoaded.set(true);
            fetched = true;
        }
    } catch (e) {
        console.warn('[hwConfig] /api/hardware unavailable, using defaults', e);
    }
}

import { useState, useEffect } from 'preact/hooks';
import type { SystemConfig } from '../types';

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/hardware');
        if (!res.ok) return;
        const json: SystemConfig = await res.json();
        setConfig(json);
      } catch (_err) {
        // Silently fail — config panel will show "Loading..."
      }
    };
    fetchConfig();
  }, []);

  return config;
}

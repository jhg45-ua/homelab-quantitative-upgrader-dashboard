import { useState, useEffect } from 'preact/hooks';

const HOST = 'r720-baremetal';
const EXPECTED_BUCKETS = ['0.1ms', '0.5ms', '1ms', '2ms', '5ms', '10ms', '25ms', '50ms', '100ms', '+Inf'];

// Microseconds mapping for EXPECTED_BUCKETS
const LE_MAP: Record<string, string> = {
  '100': '0.1ms', '500': '0.5ms', '1000': '1ms', '2000': '2ms', '5000': '5ms',
  '10000': '10ms', '25000': '25ms', '50000': '50ms', '100000': '100ms', '+Inf': '+Inf'
};

export function Heatmap() {
  const [devices, setDevices] = useState<string[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, {label: string, value: number}[]>>({});

  useEffect(() => {
    const fetchLatency = async () => {
      try {
        const res = await fetch(
          `/api/v1/query?query=${encodeURIComponent(`hqud_io_latency_usec_bucket{host="${HOST}"}`)}`
        );
        const json = await res.json();
        const results: any[] = json?.data?.result ?? [];

        // Always ensure we have at least one device row for UI consistency
        const uniqueDevices = results.length > 0 
          ? Array.from(new Set(results.map((s: any) => s.metric?.device ?? s.metric?.modulo ?? 'ebpf_io'))).sort()
          : ['ebpf_io'];
          
        setDevices(uniqueDevices);

        const newData: Record<string, {label: string, value: number}[]> = {};
        
        uniqueDevices.forEach(dev => {
          // Force all buckets to exist for every device
          newData[dev] = EXPECTED_BUCKETS.map(label => ({ label, value: 0 }));
          
          // Fill from API if results exist
          results.filter((s: any) => (s.metric?.device ?? s.metric?.modulo ?? 'ebpf_io') === dev)
                 .forEach((series: any) => {
                   const le = String(series.metric?.le ?? '+Inf');
                   const mappedLabel = LE_MAP[le] ?? '+Inf';
                   const target = newData[dev].find(b => b.label === mappedLabel);
                   if (target) {
                     const val = parseFloat(series.value?.[1] ?? '0');
                     target.value = isNaN(val) ? 0 : val;
                   }
                 });
        });

        setHeatmapData(newData);
      } catch (e) {
        console.warn('[Heatmap] fetch failed', e);
      }
    };

    fetchLatency();
    const iv = setInterval(fetchLatency, 10000);
    return () => clearInterval(iv);
  }, []);

  const getColor = (val: number) => {
    if (val < 10) return '#1e3a8a';
    if (val < 50) return '#0ea5e9';
    if (val < 200) return '#0D9488';
    if (val < 500) return '#eab308';
    return '#DC2626';
  };

  const bucketWidth = 100;
  const rowHeight = devices.length === 1 ? 260 : Math.max(80, 260 / devices.length);
  const chartWidth = bucketWidth * EXPECTED_BUCKETS.length;
  const chartHeight = rowHeight * devices.length;

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col w-full h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-xs font-bold tracking-widest text-slate-300 uppercase">eBPF Block I/O Latency</h3>
        <span className="text-[9px] font-mono text-teal-400 border border-teal-500/50 px-2 py-0.5 rounded-sm bg-teal-500/10 font-bold uppercase">Kernel Pipeline</span>
      </div>
      
      <div className="flex-1 w-full bg-[#0F172A]/50 relative overflow-x-auto overflow-y-auto p-4 flex flex-col justify-center">
        <svg 
          viewBox={`0 0 ${chartWidth + 100} ${chartHeight + 50}`} 
          className="w-full h-auto max-h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y Axis Labels (Devices) */}
          {devices.map((dev, rowIndex) => (
            <text
              key={dev}
              x="90"
              y={rowIndex * rowHeight + rowHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="font-mono text-[11px] fill-slate-500 uppercase font-bold"
            >
              {dev}
            </text>
          ))}

          {/* Heatmap Grid */}
          <g transform="translate(100, 0)">
            {devices.map((dev, rowIndex) => (
              <g key={dev}>
                {EXPECTED_BUCKETS.map((_, colIndex) => {
                  const bucket = heatmapData[dev]?.[colIndex] || { label: EXPECTED_BUCKETS[colIndex], value: 0 };
                  const rectX = colIndex * bucketWidth;
                  const rectY = rowIndex * rowHeight;
                  return (
                    <g key={colIndex}>
                      <rect
                        x={rectX}
                        y={rectY}
                        width={bucketWidth - 2}
                        height={rowHeight - 2}
                        fill={bucket.value > 0 ? getColor(bucket.value) : '#1E293B'}
                        stroke="#0F172A"
                        strokeWidth="1"
                        className="transition-colors duration-500"
                      />
                      {bucket.value > 0 && (
                        <text
                          x={rectX + bucketWidth / 2}
                          y={rectY + rowHeight / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="font-mono text-[12px] fill-white font-bold pointer-events-none drop-shadow-md"
                        >
                          {Math.round(bucket.value)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}

            {/* X Axis Labels (Buckets) */}
            {EXPECTED_BUCKETS.map((label, i) => (
              <text
                key={label}
                x={i * bucketWidth + bucketWidth / 2}
                y={chartHeight + 25}
                textAnchor="middle"
                className="font-mono text-[11px] fill-slate-500 font-bold"
              >
                {label}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

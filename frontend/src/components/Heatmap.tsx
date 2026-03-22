import { useState, useEffect } from 'preact/hooks';

const HOST = 'r720-baremetal';
const LATENCY_BUCKETS = ['0.1ms', '0.5ms', '1ms', '2ms', '5ms', '10ms', '25ms', '50ms', '100ms', '+Inf'];

export function Heatmap() {
  const [devices, setDevices] = useState<string[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const fetchLatency = async () => {
      try {
        const res = await fetch(
          `/api/v1/query?query=${encodeURIComponent(`hqud_io_latency_usec_bucket{host="${HOST}"}`)}`
        );
        const json = await res.json();
        const results: any[] = json?.data?.result ?? [];

        if (results.length === 0) {
          setDevices(['(no data)']);
          setHeatmapData({ '(no data)': new Array(LATENCY_BUCKETS.length).fill(0) });
          return;
        }

        const uniqueDevices = Array.from(new Set(
          results.map((s: any) => s.metric?.device ?? s.metric?.modulo ?? 'ebpf_io')
        )).sort();
        setDevices(uniqueDevices);

        const leToIdx: Record<string, number> = {
          '100': 0, '500': 1, '1000': 2, '2000': 3, '5000': 4,
          '10000': 5, '25000': 6, '50000': 7, '100000': 8, '+Inf': 9,
        };

        const newData: Record<string, number[]> = {};
        uniqueDevices.forEach(dev => { newData[dev] = new Array(LATENCY_BUCKETS.length).fill(0); });

        results.forEach((series: any) => {
          const dev = series.metric?.device ?? series.metric?.modulo ?? 'ebpf_io';
          const le = String(series.metric?.le ?? '+Inf');
          const bucketIdx = leToIdx[le] ?? 9;
          const val = parseFloat(series.value?.[1] ?? '0');
          if (newData[dev]) {
            newData[dev][bucketIdx] = isNaN(val) ? 0 : val;
          }
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
    if (val === 0) return 'rgba(30,41,59,0.3)';
    if (val < 10) return '#1e3a8a';
    if (val < 50) return '#0ea5e9';
    if (val < 200) return '#0D9488';
    if (val < 500) return '#eab308';
    return '#DC2626';
  };

  const bucketWidth = 80;
  const rowHeight = devices.length === 1 ? 240 : Math.max(60, 240 / devices.length);
  const chartWidth = bucketWidth * LATENCY_BUCKETS.length;
  const chartHeight = rowHeight * devices.length;

  return (
    <div className="bg-slate-800 border border-slate-700 flex flex-col w-full h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] md:text-xs font-semibold tracking-widest text-slate-300 uppercase">eBPF Block I/O Latency</h3>
        <span className="text-[8px] md:text-[9px] font-mono text-teal-400 border border-teal-500/50 px-1 rounded-sm bg-teal-500/10">KERNEL PROBE</span>
      </div>
      
      <div className="flex-1 w-full bg-[#0F172A]/50 relative overflow-x-auto overflow-y-auto">
        <div className="min-w-full min-h-full p-4 flex flex-col justify-center">
          <svg 
            viewBox={`0 0 ${chartWidth + 80} ${chartHeight + 40}`} 
            className="w-full h-auto max-h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Y Axis Labels (Devices) */}
            {devices.map((dev, rowIndex) => (
              <text
                key={dev}
                x="70"
                y={rowIndex * rowHeight + rowHeight / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="font-mono text-[10px] fill-slate-500 uppercase tracking-tighter"
              >
                {dev}
              </text>
            ))}

            {/* Heatmap Grid */}
            <g transform="translate(80, 0)">
              {devices.map((dev, rowIndex) => (
                <g key={dev}>
                  {LATENCY_BUCKETS.map((_, colIndex) => {
                    const val = heatmapData[dev]?.[colIndex] ?? 0;
                    const rectX = colIndex * bucketWidth;
                    const rectY = rowIndex * rowHeight;
                    return (
                      <g key={colIndex}>
                        <rect
                          x={rectX}
                          y={rectY}
                          width={bucketWidth - 2}
                          height={rowHeight - 2}
                          fill={getColor(val)}
                          className="transition-colors duration-500"
                        />
                        {val > 0 && (
                          <text
                            x={rectX + bucketWidth / 2}
                            y={rectY + rowHeight / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="font-mono text-[11px] fill-white font-bold pointer-events-none drop-shadow-md"
                          >
                            {Math.round(val)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              ))}

              {/* X Axis Labels (Buckets) */}
              {LATENCY_BUCKETS.map((label, i) => (
                <text
                  key={label}
                  x={i * bucketWidth + bucketWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="font-mono text-[10px] fill-slate-500"
                >
                  {label}
                </text>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

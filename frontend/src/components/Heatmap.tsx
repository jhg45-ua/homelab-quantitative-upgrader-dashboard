import { useState, useEffect } from 'preact/hooks';

const HOST = 'r720-baremetal';
const EXPECTED_BUCKETS = ['0.1ms', '0.5ms', '1ms', '2ms', '5ms', '10ms', '25ms', '50ms', '100ms', '+Inf'];

// Microseconds thresholds for EXPECTED_BUCKETS
const THRESHOLDS = [100, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000, Infinity];

export function Heatmap() {
  const [devices, setDevices] = useState<string[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, {label: string, value: number}[]>>({});

  useEffect(() => {
    const fetchLatency = async () => {
      try {
        // Using increase(...[2m]) to get recent event distribution
        const res = await fetch(
          `/api/v1/query?query=${encodeURIComponent(`increase(hqud_io_latency_usec_bucket{host="${HOST}"}[2m])`)}`
        );
        const json = await res.json();
        const results: any[] = json?.data?.result ?? [];

        const uniqueDevices = results.length > 0 
          ? Array.from(new Set(results.map((s: any) => s.metric?.device ?? s.metric?.modulo ?? 'ebpf_io'))).sort()
          : ['ebpf_io'];
          
        setDevices(uniqueDevices);

        const newData: Record<string, {label: string, value: number}[]> = {};
        
        uniqueDevices.forEach(dev => {
          // Initialize buckets
          const buckets = EXPECTED_BUCKETS.map(label => ({ label, value: 0 }));
          
          // Get results for this device
          const deviceResults = results.filter((s: any) => (s.metric?.device ?? s.metric?.modulo ?? 'ebpf_io') === dev);
          
          // Parse and sort by 'le' value
          const parsed = deviceResults.map((s: any) => {
            const leStr = s.metric?.le ?? '+Inf';
            let leNum = Infinity;
            if (leStr !== '+Inf') {
              leNum = parseFloat(leStr);
              // Handle seconds vs microseconds: if < 1.0, it's likely seconds (e.g. 0.001)
              if (leNum <= 10) leNum *= 1000000; // Translate seconds (standard Prometheus) to microseconds
            }
            return {
              le: leNum,
              val: parseFloat(s.value?.[1] ?? '0')
            };
          }).sort((a, b) => a.le - b.le);

          // Calculate discrete values (subtract previous cumulative bucket)
          let prevVal = 0;
          parsed.forEach(p => {
            const discreteVal = Math.max(0, p.val - prevVal);
            prevVal = p.val;
            
            // Map the discrete value to our closest UI bucket threshold
            // Standard Prometheus histogram buckets might not align 1:1 with our THRESHOLDS
            // So we find the best fit
            const thresholdIdx = THRESHOLDS.findIndex(t => t >= p.le - 1); // -1 for floating point safety
            if (thresholdIdx !== -1) {
              buckets[thresholdIdx].value += discreteVal;
            }
          });

          newData[dev] = buckets;
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

  const bucketWidth = 120;
  const rowHeight = devices.length === 1 ? 400 : Math.max(120, 600 / devices.length);
  const chartWidth = bucketWidth * EXPECTED_BUCKETS.length;
  const chartHeight = rowHeight * devices.length;

  return (
    <div className="bg-slate-800/40 border border-slate-700 flex flex-col w-full h-full overflow-hidden backdrop-blur-sm">
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-black tracking-[0.2em] text-slate-300 uppercase">eBPF Block I/O Latency</h3>
        <span className="text-[10px] font-mono text-teal-400 border border-teal-500/50 px-3 py-1 rounded-sm bg-teal-500/10 font-bold uppercase tracking-widest">Kernel Pipeline</span>
      </div>
      
      <div className="flex-1 w-full bg-[#0F172A]/20 relative overflow-x-auto overflow-y-auto p-8 flex flex-col justify-center">
        <svg 
          viewBox={`0 0 ${chartWidth + 120} ${chartHeight + 80}`} 
          className="w-full h-auto max-h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y Axis Labels (Devices) */}
          {devices.map((dev, rowIndex) => (
            <text
              key={dev}
              x="110"
              y={rowIndex * rowHeight + rowHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="font-mono text-xs fill-slate-500 uppercase font-black"
            >
              {dev}
            </text>
          ))}

          {/* Heatmap Grid */}
          <g transform="translate(120, 0)">
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
                        width={bucketWidth - 4}
                        height={rowHeight - 4}
                        fill={bucket.value > 0 ? getColor(bucket.value) : '#1E293B'}
                        stroke="#0F172A"
                        strokeWidth="2"
                        className="transition-colors duration-500"
                      />
                      {bucket.value > 0 && (
                        <text
                          x={rectX + bucketWidth / 2}
                          y={rectY + rowHeight / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="font-mono text-lg fill-white font-black pointer-events-none drop-shadow-lg"
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
                y={chartHeight + 40}
                textAnchor="middle"
                className="font-mono text-xs fill-slate-500 font-black tracking-widest"
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

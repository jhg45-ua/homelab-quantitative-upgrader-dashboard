import { formatMetric } from '../../utils/formatters';

interface HorizontalGridProps {
  left: number;
  right: number;
  ticks: Array<{ y: number; value: number }>;
}

export function HorizontalGrid({ left, right, ticks }: HorizontalGridProps) {
  return (
    <g>
      {ticks.map(tick => (
        <g key={`grid-${tick.value}`}>
          <line x1={left} x2={right} y1={tick.y} y2={tick.y} stroke="#334155" strokeWidth="1" />
          <text
            x={left - 8}
            y={tick.y + 3}
            textAnchor="end"
            className="fill-slate-400 font-mono"
            style={{ fontSize: '9px' }}
          >
            {formatMetric(tick.value)}
          </text>
        </g>
      ))}
    </g>
  );
}

interface XAxisLabelsProps {
  labels: Array<{ x: number; text: string }>;
  y: number;
}

export function XAxisLabels({ labels, y }: XAxisLabelsProps) {
  return (
    <g>
      {labels.map((label, idx) => (
        <text
          key={`x-label-${idx}-${label.text}`}
          x={label.x}
          y={y}
          textAnchor="middle"
          className="fill-slate-500 font-mono"
          style={{ fontSize: '9px' }}
        >
          {label.text}
        </text>
      ))}
    </g>
  );
}

interface Props {
  title: string;
  value: string;
  unit: string;
  footer: string;
  valueColor?: string;
  colSpan?: '1' | '2';
}

export function DatasheetCard({ title, value, unit, footer, valueColor = 'text-slate-100', colSpan = '1' }: Props) {
  return (
    <div className={`bg-slate-800 border border-slate-700 p-3 md:p-3 flex flex-col justify-between col-span-2 ${colSpan === '1' ? 'md:col-span-1' : 'md:col-span-2'}`}>
      <div className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 md:mb-2">{title}</div>
      <div className="flex items-baseline">
        <span className={`text-2xl md:text-3xl font-mono ${valueColor} drop-shadow-sm`}>{value}</span>
        <span className={`text-[10px] md:text-xs font-mono ml-1 md:ml-2 ${valueColor === 'text-slate-100' ? 'text-slate-500' : 'text-teal-500'}`}>{unit}</span>
      </div>
      <div className="text-[9px] md:text-[10px] text-slate-500 mt-1 border-t border-slate-700/50 pt-1 md:pt-2 hidden md:block">{footer}</div>
    </div>
  );
}

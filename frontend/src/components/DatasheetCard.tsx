interface Props {
  title: string;
  value: string;
  unit: string;
  footer: string;
  valueColor?: string;
  colSpan?: '1' | '2';
}

export function DatasheetCard({ title, value, unit, footer, valueColor = 'text-slate-800', colSpan = '1' }: Props) {
  return (
    <div className={`bg-white rounded-sm shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col justify-between col-span-2 ${colSpan === '1' ? 'md:col-span-1' : 'md:col-span-2'}`}>
      <div className="text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{title}</div>
      <div className="flex items-baseline">
        <span className={`text-2xl md:text-3xl font-mono ${valueColor}`}>{value}</span>
        <span className={`text-xs md:text-sm font-mono ml-1 md:ml-2 ${valueColor === 'text-slate-800' ? 'text-slate-400' : 'text-[#0D9488]/70'}`}>{unit}</span>
      </div>
      <div className="text-[10px] md:text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2 hidden md:block">{footer}</div>
    </div>
  );
}

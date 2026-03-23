import { InfoTooltip } from './InfoTooltip';
import type { ComponentChildren } from 'preact';

interface Props {
  title: string;
  shortSummary: string;
  wikiHash: string;
  rightSlot?: ComponentChildren;
  titleClassName?: string;
}

export function PanelHeader({ title, shortSummary, wikiHash, rightSlot = null, titleClassName = '' }: Props) {
  return (
    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-3 md:mb-4 font-black flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={titleClassName}>{title}</span>
        <InfoTooltip title={title} shortSummary={shortSummary} wikiHash={wikiHash} />
      </div>
      {rightSlot}
    </div>
  );
}

import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  title: string;
  shortSummary: string;
  wikiHash: string;
}

export function InfoTooltip({ title, shortSummary, wikiHash }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const normalizedHash = wikiHash.startsWith('#') ? wikiHash : `#${wikiHash}`;

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = null;
    }, 300);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (event.target instanceof Node && !rootRef.current.contains(event.target)) {
        clearCloseTimeout();
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      clearCloseTimeout();
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => {
          clearCloseTimeout();
          setIsOpen(v => !v);
        }}
        aria-label={`Info about ${title}`}
        aria-expanded={isOpen}
        className="text-slate-500 hover:text-teal-400 cursor-pointer transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 16.2V11.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="8" r="1.2" fill="currentColor" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-6 z-50 bg-slate-800 border border-slate-600 shadow-xl p-3 w-64"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="font-sans text-xs uppercase text-slate-300 tracking-widest mb-2">{title}</div>
          <p className="font-sans text-xs text-slate-400 leading-relaxed">{shortSummary}</p>
          <a
            href={`/wiki${normalizedHash}`}
            className="mt-3 inline-block text-teal-400 font-bold text-xs hover:underline"
          >
            READ WIKI DEEP DIVE ↗
          </a>
        </div>
      )}
    </div>
  );
}

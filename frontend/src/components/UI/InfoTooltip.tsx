import { useEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';

interface Props {
  title: string;
  shortSummary: string;
  wikiHash: string;
}

export function InfoTooltip({ title, shortSummary, wikiHash }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
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

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const triggerRect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 300;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 140;
    const viewportPadding = 12;

    let left = triggerRect.right + 10;
    if (left + tooltipWidth > window.innerWidth - viewportPadding) {
      left = triggerRect.left - tooltipWidth - 10;
    }
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipWidth - viewportPadding));

    // Prefer placing tooltips above chart headers to avoid covering plot area below.
    let top = triggerRect.top - tooltipHeight - 8;
    if (top < viewportPadding) {
      top = triggerRect.top + triggerRect.height + 8;
    }
    top = Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipHeight - viewportPadding));

    setPosition({ top, left });
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      const clickedTrigger = rootRef.current.contains(target);
      const clickedTooltip = tooltipRef.current?.contains(target) ?? false;
      if (!clickedTrigger && !clickedTooltip) {
        clearCloseTimeout();
        setIsOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearCloseTimeout();
        setIsOpen(false);
      }
    };

    const onReposition = () => {
      if (isOpen) updatePosition();
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      clearCloseTimeout();
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      updatePosition();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen]);

  const tooltipNode = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[999] bg-slate-900 border border-slate-600 shadow-2xl p-3 rounded-md w-[300px] max-w-[calc(100vw-24px)] normal-case tracking-normal text-left"
          style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="font-sans text-xs uppercase text-slate-200 tracking-widest mb-2">{title}</div>
          <p className="font-sans text-xs text-slate-300 leading-relaxed normal-case tracking-normal">{shortSummary}</p>
          <a
            href={`/wiki${normalizedHash}`}
            className="mt-3 inline-block text-teal-400 font-bold text-xs hover:underline"
          >
            READ WIKI DEEP DIVE ↗
          </a>
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={rootRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
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
      {tooltipNode}
    </div>
  );
}

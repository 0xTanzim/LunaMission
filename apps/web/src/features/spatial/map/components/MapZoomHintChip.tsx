import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface MapZoomHintChipProps {
  onDismiss: () => void;
  className?: string;
}

/**
 * One-time affordance for the map's scroll/zoom split: plain wheel scrolls the page,
 * Ctrl/⌘+wheel zooms. Shown when a modifier-less wheel rolls over the map, dismissed
 * for the session by the button or Escape. Non-blocking: the page keeps scrolling.
 */
export function MapZoomHintChip({ onDismiss, className = '' }: MapZoomHintChipProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div
      data-testid="map-zoom-hint"
      role="note"
      aria-label="Map zoom hint"
      className={`pointer-events-auto flex items-center gap-2 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)]/95 px-2.5 py-1.5 font-mono text-[11px] text-[var(--lm-color-text-secondary)] shadow-[var(--lm-shadow-popover)] backdrop-blur-md ${className}`}
    >
      <span>
        Hold <kbd className="font-semibold text-[var(--lm-color-text-primary)]">Ctrl</kbd>
        {' / '}
        <kbd className="font-semibold text-[var(--lm-color-text-primary)]">⌘ Cmd</kbd> + scroll to zoom
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss map zoom hint"
        title="Dismiss hint"
        className="inline-flex min-h-5 min-w-5 cursor-pointer items-center justify-center rounded-[var(--lm-radius-xs)] p-0.5 text-[var(--lm-color-text-muted)] transition-colors hover:bg-[var(--lm-color-surface-raised)] hover:text-[var(--lm-color-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-focus)]"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

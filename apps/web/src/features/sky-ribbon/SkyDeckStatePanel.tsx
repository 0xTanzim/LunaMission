import React from 'react';

export interface SkyDeckStatePanelProps {
  status: 'loading' | 'empty' | 'error';
  message: string;
  onRetry?: () => void;
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-info)]';

const STATE_META = {
  loading: { badge: '[LOADING]', glyph: '◌', tone: 'text-[var(--lm-color-info)] border-[var(--lm-color-info-border)] bg-[var(--lm-color-info-surface-strong)]' },
  empty: { badge: '[NO DATA]', glyph: '◇', tone: 'text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border)] bg-[var(--lm-color-surface)]' },
  error: { badge: '[FAILED]', glyph: '✕', tone: 'text-[var(--lm-color-danger)] border-[var(--lm-color-danger-border)] bg-[var(--lm-color-danger-surface-strong)]' },
} as const;

/**
 * Loading / empty / error surface for the sky deck. Status is conveyed with a
 * glyph, a bracketed text badge and a message — never by colour alone.
 */
export const SkyDeckStatePanel: React.FC<SkyDeckStatePanelProps> = ({ status, message, onRetry }) => {
  const meta = STATE_META[status];
  return (
    <div
      data-testid={`sky-ribbon-deck-${status}`}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 font-mono text-[11px] ${meta.tone}`}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-sm">
          {meta.glyph}
        </span>
        <span className="font-bold">{meta.badge}</span>
        <span>{message}</span>
      </div>
      {status === 'error' && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={`min-h-[32px] rounded border border-[var(--lm-color-danger-border)] bg-[var(--lm-color-danger-surface-strong)] px-3 py-1.5 text-[11px] font-bold text-[var(--lm-color-danger)] hover:bg-[var(--lm-color-danger-surface-strong)] ${FOCUS_RING}`}
        >
          Retry Evaluation
        </button>
      ) : null}
    </div>
  );
};

import React from 'react';

export interface ComparisonFunnelStatusProps {
  totalEvaluatedSites: number;
  rankedCount: number;
  onRelaxConstraints?: () => void;
  className?: string;
}

type FunnelTone = 'ready' | 'thin' | 'blocked';

interface ToneStyle {
  readonly label: string;
  readonly mark: string;
  readonly borderClass: string;
  readonly textClass: string;
}

/** Tone is carried by a word and a mark as well as by colour. */
const TONE: Record<FunnelTone, ToneStyle> = {
  ready: {
    label: 'Ready to compare',
    mark: '✓',
    borderClass: 'border-l-[var(--lm-color-success)]',
    textClass: 'text-[var(--lm-color-success)]',
  },
  thin: {
    label: 'Only one site qualifies',
    mark: '!',
    borderClass: 'border-l-[var(--lm-color-warning)]',
    textClass: 'text-[var(--lm-color-warning)]',
  },
  blocked: {
    label: 'No site qualifies',
    mark: '×',
    borderClass: 'border-l-[var(--lm-color-danger)]',
    textClass: 'text-[var(--lm-color-danger)]',
  },
};

function resolveTone(rankedCount: number): FunnelTone {
  if (rankedCount >= 2) return 'ready';
  return rankedCount === 1 ? 'thin' : 'blocked';
}

function outcomeSentence(tone: FunnelTone, totalEvaluatedSites: number, rankedCount: number): string {
  if (tone === 'ready') {
    return `${rankedCount} of ${totalEvaluatedSites} candidate sites clear the vehicle limits and are ranked for pairwise comparison.`;
  }
  if (tone === 'thin') {
    return `1 of ${totalEvaluatedSites} candidate sites clears the vehicle limits. Pairwise comparison needs two.`;
  }
  return `None of the ${totalEvaluatedSites} candidate sites clears the vehicle limits.`;
}

/**
 * The funnel's single status surface: one outcome statement, one tone, one next action.
 * Counts elsewhere on the page are section metadata, not competing status.
 */
export const ComparisonFunnelStatus: React.FC<ComparisonFunnelStatusProps> = ({
  totalEvaluatedSites,
  rankedCount,
  onRelaxConstraints,
  className = '',
}) => {
  const tone = resolveTone(rankedCount);
  const style = TONE[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="comparison-funnel-status"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] border-l-4 bg-[var(--lm-color-surface)] px-4 py-3 font-mono ${style.borderClass} ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${style.textClass} border-current`}
        >
          {style.mark}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${style.textClass}`}>
            {style.label}
          </span>
          <p className="text-xs leading-snug text-[var(--lm-color-text-secondary)]">
            {outcomeSentence(tone, totalEvaluatedSites, rankedCount)}
          </p>
        </div>
      </div>

      {tone !== 'ready' && onRelaxConstraints && (
        <button
          type="button"
          onClick={onRelaxConstraints}
          className="min-h-[32px] shrink-0 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-3 py-1.5 text-[11px] font-semibold text-[var(--lm-color-text-primary)] transition-colors hover:border-[var(--lm-color-info-border)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          Relax limits (Polar Survey)
        </button>
      )}
    </div>
  );
};

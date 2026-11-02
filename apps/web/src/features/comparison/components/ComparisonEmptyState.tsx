import React from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import { CohortAddCandidateSelect } from './CohortAddCandidateSelect';

export interface ComparisonEmptyStateProps {
  cohortSiteCount: number;
  minimumCohortSize: number;
  availableSites: readonly CandidateSite[];
  onAddSite: (siteId: string) => void;
  /** Re-runs the comparison when the cohort is nominally large enough for a study. */
  onRetry?: () => void;
}

/**
 * The funnel's dead end, kept recoverable: it says what is missing, keeps the cohort picker as
 * the page's primary action, and offers a re-run when the cohort is already large enough and
 * only the response is absent.
 */
export const ComparisonEmptyState: React.FC<ComparisonEmptyStateProps> = ({
  cohortSiteCount,
  minimumCohortSize,
  availableSites,
  onAddSite,
  onRetry,
}) => {
  const missing = Math.max(0, minimumCohortSize - cohortSiteCount);

  return (
    <section
      data-testid="three-tier-comparison-empty"
      role="region"
      aria-labelledby="comparison-empty-title"
      className="flex flex-col gap-4 rounded-[var(--lm-radius-lg)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] p-5 font-mono"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="comparison-empty-title"
          className="text-sm font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]"
        >
          Comparison Cohort Too Small
        </h3>
        <p className="text-xs text-[var(--lm-color-text-secondary)]">
          Select at least 2 candidate landing sites to run the trade study.
        </p>
        <p className="text-[11px] text-[var(--lm-color-text-muted)]">
          {missing > 0
            ? `${cohortSiteCount} site${cohortSiteCount === 1 ? '' : 's'} in the cohort — ${missing} more needed.`
            : `${cohortSiteCount} sites are in the cohort but no result came back. Re-run the comparison, or change the cohort.`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <CohortAddCandidateSelect
          variant="primary"
          availableSites={availableSites}
          onAddSite={onAddSite}
        />
        {onRetry && missing === 0 && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[36px] rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--lm-color-text-secondary)] transition-colors hover:border-[var(--lm-color-info-border)] hover:text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
          >
            Re-run comparison
          </button>
        )}
      </div>
    </section>
  );
};

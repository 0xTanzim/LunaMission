import React, { useId } from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import { siteDisplayName } from '../model/siteDisplayName';

export interface CohortAddCandidateSelectProps {
  /** Evaluable candidate sites that are not in the cohort yet. */
  availableSites: readonly CandidateSite[];
  onAddSite: (siteId: string) => void;
  /**
   * `primary` promotes the picker to the page's main action, which is what the empty-cohort
   * state needs; `inline` keeps it as the trailing control of the cohort bar.
   */
  variant?: 'inline' | 'primary';
}

/** The one way a candidate joins a comparison cohort. */
export const CohortAddCandidateSelect: React.FC<CohortAddCandidateSelectProps> = ({
  availableSites,
  onAddSite,
  variant = 'inline',
}) => {
  const selectId = useId();
  const isPrimary = variant === 'primary';
  const isEmpty = availableSites.length === 0;

  return (
    <div className={`flex items-center gap-2 ${isPrimary ? 'w-full sm:w-auto' : 'shrink-0'}`}>
      <label
        htmlFor={selectId}
        className={
          isPrimary
            ? 'text-xs font-semibold text-[var(--lm-color-text-primary)]'
            : 'sr-only'
        }
      >
        {isPrimary ? 'Add candidates' : 'Add a candidate site to the comparison cohort'}
      </label>
      <select
        id={selectId}
        defaultValue=""
        disabled={isEmpty}
        onChange={(event) => {
          if (event.target.value) {
            onAddSite(event.target.value);
            event.target.value = '';
          }
        }}
        className={`min-h-[36px] cursor-pointer rounded-[var(--lm-radius-sm)] border font-mono transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)] disabled:cursor-not-allowed disabled:text-[var(--lm-color-text-disabled)] ${
          isPrimary
            ? 'flex-1 border-[var(--lm-color-focus)] bg-[var(--lm-color-surface-strong)] px-3 py-2 text-xs font-semibold text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-info)] sm:flex-none'
            : 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] px-3 py-1.5 text-xs text-[var(--lm-color-text-secondary)] hover:border-[var(--lm-color-info-border)]'
        }`}
      >
        <option value="" disabled>
          {isEmpty
            ? 'Every evaluable site is already in the cohort'
            : `Add candidate (${availableSites.length} available)…`}
        </option>
        {availableSites.map((site) => (
          <option key={site.id} value={site.id}>
            {siteDisplayName(site.name, site.id)} ({site.code})
          </option>
        ))}
      </select>
    </div>
  );
};

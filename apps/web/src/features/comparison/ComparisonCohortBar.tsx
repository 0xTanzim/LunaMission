import React, { useMemo } from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import { getCatalogueOnlyEntries, getSiteById } from '@/domain/sites/catalog';
import type { DisqualifiedCandidate } from '@luna/contracts';
import { availableCohortCandidates, MAX_COHORT_SITES } from './model/cohort';
import { siteDisplayName } from './model/siteDisplayName';
import { CohortAddCandidateSelect } from './components/CohortAddCandidateSelect';

export interface ComparisonCohortBarProps {
  cohortSiteIds: string[];
  activeSiteId: string;
  /** Evaluable sites that can still join the cohort; derived from the catalogue when omitted. */
  availableSites?: readonly CandidateSite[];
  /** Candidates culled by Tier 1 vehicle constraints, used to flag chips and provide feedback. */
  disqualifiedCandidates?: readonly DisqualifiedCandidate[];
  onAddSite: (siteId: string) => void;
  onRemoveSite: (siteId: string) => void;
  onRelaxConstraints?: () => void;
  /** The empty state carries the picker as its primary action, so the bar withholds its own. */
  showAddControl?: boolean;
}

/**
 * Catalogue-only regions this cohort cannot hold, named with the catalogue they come from so
 * they are not mistaken for the identically named candidate site already in the cohort.
 */
const WITHHELD_REGIONS = getCatalogueOnlyEntries()
  .map((entry) => `${entry.name} (${entry.code})`)
  .join(' · ');

export const ComparisonCohortBar: React.FC<ComparisonCohortBarProps> = ({
  cohortSiteIds,
  activeSiteId,
  availableSites,
  disqualifiedCandidates,
  onAddSite,
  onRemoveSite,
  onRelaxConstraints,
  showAddControl = true,
}) => {
  const candidates = availableSites ?? availableCohortCandidates(cohortSiteIds);
  const getSiteName = (id: string) => siteDisplayName(getSiteById(id)?.name, id);
  const showPicker = showAddControl && candidates.length > 0 && cohortSiteIds.length < MAX_COHORT_SITES;

  const disqualifiedMap = useMemo(() => {
    const map = new Map<string, DisqualifiedCandidate>();
    if (disqualifiedCandidates) {
      for (const cand of disqualifiedCandidates) {
        map.set(cand.siteId, cand);
      }
    }
    return map;
  }, [disqualifiedCandidates]);

  const activeSiteDisq = disqualifiedMap.get(activeSiteId);
  const activeDisqFirstReason = activeSiteDisq?.rejectionReasons[0];

  return (
    <div
      role="region"
      aria-label="Candidate Comparison Cohort Manager"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-4 font-mono text-xs"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="mr-1 shrink-0 text-[11px] font-bold uppercase tracking-wider text-[var(--lm-color-text-muted)]">
          Cohort ({cohortSiteIds.length}/{MAX_COHORT_SITES})
        </span>
        {/* One concept, three roles on this page: the primary is the site Analyze reads,
            the chips are the comparison set, and rank-1 candidates can be promoted into it. */}
        <span
          className="hidden w-full text-[11px] leading-snug text-[var(--lm-color-text-muted)] lg:inline"
          title="The primary site is the one the Analyze workspace reads. Every chip here is compared; a ranked candidate can be promoted to primary."
        >
          The highlighted chip is the primary — the site the Analyze workspace reads.
        </span>

        {cohortSiteIds.map((id) => {
          const isActive = id === activeSiteId;
          const canRemove = cohortSiteIds.length > 2 && !isActive;
          const name = getSiteName(id);
          const disqInfo = disqualifiedMap.get(id);
          const isDisqualified = disqInfo !== undefined;
          const firstReason = disqInfo?.rejectionReasons[0];
          const disqTooltip = firstReason
            ? `Disqualified: ${firstReason.constraintName} (+${firstReason.marginOfFailure.toFixed(1)} ${firstReason.unit} margin)`
            : undefined;

          return (
            <span
              key={id}
              className={`inline-flex min-w-0 items-center gap-1.5 rounded-[var(--lm-radius-sm)] border py-0.5 pl-2.5 text-xs transition-colors ${
                isActive
                  ? 'border-[var(--lm-color-selected-site)] bg-[var(--lm-color-surface-strong)] pl-2.5 pr-2.5 font-bold text-[var(--lm-color-text-primary)]'
                  : isDisqualified
                  ? 'border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] text-[var(--lm-color-text-muted)]'
                  : 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)]'
              }`}
            >
              <span className="truncate" title={`${name} — ${id}`}>
                {name}
              </span>
              {isActive && (
                <span
                  className={`shrink-0 text-[11px] font-bold uppercase tracking-wide ${
                    isDisqualified ? 'text-[var(--lm-color-warning)]' : 'text-[var(--lm-color-selected-site)]'
                  }`}
                  title={isDisqualified ? 'Active Primary target is culled under current vehicle limits' : undefined}
                >
                  {isDisqualified ? 'Primary (Culled)' : 'Primary'}
                </span>
              )}
              {!isActive && isDisqualified && (
                <span
                  className="shrink-0 rounded px-1 text-[11px] font-bold uppercase tracking-wide text-[var(--lm-color-danger)] border border-[var(--lm-color-danger-border,rgba(239,68,68,0.3))]"
                  title={disqTooltip}
                >
                  Culled
                </span>
              )}
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onRemoveSite(id)}
                  aria-label={`Remove ${name} from comparison cohort`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--lm-radius-xs)] text-base leading-none text-[var(--lm-color-text-muted)] transition-colors hover:bg-[var(--lm-color-danger-surface-strong)] hover:text-[var(--lm-color-danger)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-danger)]"
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </span>
          );
        })}
      </div>

      {showPicker && (
        <CohortAddCandidateSelect availableSites={candidates} onAddSite={onAddSite} />
      )}

      {activeSiteDisq && (
        <div
          role="alert"
          className="w-full flex flex-wrap items-center justify-between gap-2 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-warning-border,var(--lm-color-border-subtle))] px-3 py-2 text-[11px] text-[var(--lm-color-text-secondary)]"
        >
          <span>
            <strong className="text-[var(--lm-color-warning)]">Notice:</strong> Primary target site <strong>{getSiteName(activeSiteId)}</strong> does not clear active vehicle limits ({activeDisqFirstReason?.narrative || 'Constraint violated'}). It is excluded from Tier 2 rankings.
          </span>
          {onRelaxConstraints && (
            <button
              type="button"
              onClick={onRelaxConstraints}
              className="text-[var(--lm-color-info)] hover:underline cursor-pointer font-bold shrink-0"
            >
              Relax to Polar Survey
            </button>
          )}
        </div>
      )}

      {WITHHELD_REGIONS.length > 0 && (
        <p
          role="note"
          data-testid="cohort-evaluability-note"
          className="w-full border-t border-[var(--lm-color-border-subtle)] pt-2 text-[11px] leading-snug text-[var(--lm-color-text-muted)]"
        >
          <span className="font-bold text-[var(--lm-color-warning)]">
            Evaluation cohorts need a horizon profile.
          </span>{' '}
          {WITHHELD_REGIONS} are in the catalogue, but not a landing candidate — can&apos;t be
          compared. LunaMission holds no LOLA horizon profile for these regions, so there is nothing
          to score. They stay browsable and citable.
        </p>
      )}
    </div>
  );
};

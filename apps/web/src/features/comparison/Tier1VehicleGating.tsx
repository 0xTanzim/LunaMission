import React from 'react';
import type { DisqualifiedCandidate } from '@luna/contracts';
import { siteDisplayName } from './model/siteDisplayName';

interface Tier1VehicleGatingProps {
  totalEvaluatedSites: number;
  feasibleSitesCount: number;
  disqualifiedSitesCount: number;
  disqualifiedCandidates: DisqualifiedCandidate[];
  className?: string;
}

const formatConstraintName = (name: string): string => {
  switch (name) {
    case 'maxContinuousDarkness':
      return '🌑 Exceeds Max Darkness Limit';
    case 'maxLandingSlope':
      return '📐 Exceeds Max Slope Limit';
    case 'minContinuousSunlight':
      return '☀️ Below Min Sunlight Requirement';
    case 'minDte':
      return '📡 Below Min Earth LoS Requirement';
    default:
      return name;
  }
};

/**
 * Tier 1: which candidate sites the vehicle limits removed, with the margin that removed them.
 * The funnel outcome itself is stated once, above the tiers — this section is the evidence.
 */
export const Tier1VehicleGating: React.FC<Tier1VehicleGatingProps> = ({
  totalEvaluatedSites,
  feasibleSitesCount,
  disqualifiedSitesCount,
  disqualifiedCandidates,
  className = '',
}) => {
  return (
    <section
      role="region"
      aria-label="Tier 1 Hard Vehicle Constraint Gating"
      className={`flex flex-col gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-4 font-mono text-xs ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--lm-color-border-subtle)] pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]">
            Tier 1 — Can the vehicle survive here?
          </h3>
          <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--lm-color-text-muted)]">
            HARD GO / NO-GO
          </span>
        </div>
        <p className="text-[11px] text-[var(--lm-color-text-muted)]">
          {feasibleSitesCount} Feasible · {disqualifiedSitesCount} Disqualified ·{' '}
          {totalEvaluatedSites} Evaluated
        </p>
      </div>

      {disqualifiedCandidates.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-wide text-[var(--lm-color-text-muted)]">
            Culled candidates and the margin that culled them
          </span>
          <ul className="grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
            {disqualifiedCandidates.map((candidate) => (
              <li
                key={candidate.siteId}
                data-testid={`disqualified-card-${candidate.siteId}`}
                className="relative flex flex-col gap-2 overflow-hidden rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)] p-3"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-[var(--lm-color-danger)]" />
                <div className="flex items-center justify-between gap-2 pl-1">
                  <span className="truncate text-xs font-bold text-[var(--lm-color-text-primary)]">
                    {siteDisplayName(candidate.siteName, candidate.siteId)}
                  </span>
                  <span className="shrink-0 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--lm-color-danger)]">
                    CULLED
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 pl-1">
                  {candidate.rejectionReasons.map((reason, index) => (
                    <div
                      key={`${reason.constraintName}-${index}`}
                      className="flex flex-col rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)] p-2 text-[11px]"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-1">
                        <span className="text-[11px] font-bold text-[var(--lm-color-danger)]">
                          <span className="sr-only">{reason.constraintName}</span>
                          <span aria-hidden="true">{formatConstraintName(reason.constraintName)}</span>
                        </span>
                        <span className="font-bold text-[var(--lm-color-danger)]">
                          +{reason.marginOfFailure.toFixed(1)} {reason.unit} margin
                        </span>
                      </div>
                      <span className="mt-1 text-[11px] italic leading-relaxed text-[var(--lm-color-text-muted)]">
                        {reason.narrative}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)] p-3 text-xs text-[var(--lm-color-text-secondary)]">
          <span aria-hidden="true">✓ </span>
          All {totalEvaluatedSites} candidate sites satisfy the active vehicle constraints and
          advance to Tier 2 ranking.
        </p>
      )}
    </section>
  );
};

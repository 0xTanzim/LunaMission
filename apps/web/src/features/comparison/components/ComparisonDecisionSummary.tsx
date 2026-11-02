import React from 'react';
import type { RankedFeasibleCandidate } from '@luna/contracts';
import {
  entityLabel,
  formatObservable,
  leadCandidate,
  observableLeaders,
  readObservables,
} from '../model/leadCandidateSummary';
import { siteDisplayName } from '../model/siteDisplayName';

export interface ComparisonDecisionSummaryProps {
  rankedCandidates: RankedFeasibleCandidate[];
  onPromotePrimary?: (siteId: string) => void;
  className?: string;
}

/**
 * The cohort's lead candidate, read one observable at a time.
 *
 * A trade study needs the leader and its four measured quantities, not four equal stat tiles:
 * the observables are never blended, and any observable another site leads is named explicitly
 * so a mission planner can see where the leader is not the best choice.
 */
export const ComparisonDecisionSummary: React.FC<ComparisonDecisionSummaryProps> = ({
  rankedCandidates,
  onPromotePrimary,
  className = '',
}) => {
  const lead = leadCandidate(rankedCandidates);
  if (!lead) return null;

  const name = siteDisplayName(lead.siteName, lead.siteId);
  const readouts = readObservables(lead);
  const leaders = observableLeaders(rankedCandidates);
  const leadObservableIds = new Set(
    leaders.filter((entry) => entry.candidate.siteId === lead.siteId).map((entry) => entry.observableId),
  );
  const otherLeaders = leaders.filter((entry) => entry.candidate.siteId !== lead.siteId);
  const coordinates = lead.coordinates;

  return (
    <section
      role="region"
      aria-label="Lead candidate of the ranked cohort"
      data-testid="comparison-decision-summary"
      className={`flex flex-col gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-4 font-mono ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--lm-color-border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]">
            Lead candidate
          </h3>
          <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--lm-color-text-secondary)]">
            Rank 1 of {rankedCandidates.length}
          </span>
        </div>
        {rankedCandidates.length === 1 && (
          <span className="text-[11px] text-[var(--lm-color-text-muted)]">
            The only site that cleared the vehicle limits
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-bold text-[var(--lm-color-text-primary)]" title={name}>
            {name}
          </p>
          <p className="text-[11px] text-[var(--lm-color-text-muted)]">
            {entityLabel(lead.entityType)}
            {coordinates
              ? ` · ${Math.abs(coordinates.latitudeDeg).toFixed(2)}°S, ${coordinates.longitudeEastDeg.toFixed(2)}°E · ${coordinates.elevationMeters.toLocaleString()} m`
              : ''}
          </p>
        </div>

        {onPromotePrimary && (
          <button
            type="button"
            onClick={() => onPromotePrimary(lead.siteId)}
            className="min-h-[32px] shrink-0 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-3 py-1.5 text-[11px] font-semibold text-[var(--lm-color-text-primary)] transition-colors hover:border-[var(--lm-color-warning-border)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
          >
            Promote to primary target
          </button>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {readouts.map((readout) => (
          <div key={readout.id} className="flex flex-col gap-0.5">
            <dt className="text-[11px] leading-tight text-[var(--lm-color-text-muted)]">
              {readout.label}
            </dt>
            <dd className="text-sm font-bold text-[var(--lm-color-text-primary)]">
              {formatObservable(readout.value, readout.decimals)}
              <span className="ml-0.5 text-[11px] font-normal text-[var(--lm-color-text-muted)]">
                {readout.unit}
              </span>
              {leadObservableIds.has(readout.id) && rankedCandidates.length > 1 && (
                <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--lm-color-success)]">
                  cohort best
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {otherLeaders.length > 0 && (
        <p className="border-t border-[var(--lm-color-border-subtle)] pt-2 text-[11px] leading-snug text-[var(--lm-color-text-muted)]">
          <span className="font-semibold text-[var(--lm-color-text-secondary)]">
            Another site leads on
          </span>{' '}
          {otherLeaders
            .map(
              (entry) =>
                `${entry.label} — ${siteDisplayName(entry.candidate.siteName, entry.candidate.siteId)} (${formatObservable(entry.value, 1)} ${entry.unit})`,
            )
            .join(' · ')}
        </p>
      )}
    </section>
  );
};

import type { ParetoFrontier, RankedFeasibleCandidate } from '@luna/contracts';
import { buildParetoModel, directionPhrase } from '../model/paretoFrontierModel';
import { siteDisplayName } from '../model/siteDisplayName';

export interface ParetoFrontierPanelProps {
  frontier: ParetoFrontier | undefined;
  rankedCandidates: readonly RankedFeasibleCandidate[];
}

/**
 * The non-dominated set, read as a decision.
 *
 * The frontier is not re-derived here: the ranks, the dominated sets and the domination rule all
 * come from the compare service. The panel adds what a rank cannot say on its own — which
 * objective each candidate actually holds, in its own unit, and why it is still standing when it
 * is best at nothing.
 */
export function ParetoFrontierPanel({ frontier, rankedCandidates }: ParetoFrontierPanelProps) {
  const model = buildParetoModel(frontier, rankedCandidates);
  if (model === null) return null;

  const { frontierCandidates, dominatedCandidates, objectives, unavailableObjectives } = model;

  return (
    <section
      role="region"
      aria-labelledby="pareto-frontier-title"
      data-testid="pareto-frontier-panel"
      className="flex min-w-0 flex-col gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-4 font-mono"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--lm-color-border-subtle)] pb-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3
            id="pareto-frontier-title"
            className="text-[length:var(--lm-text-label)] font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]"
          >
            Non-dominated frontier
          </h3>
          <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-1.5 py-0.5 text-[length:var(--lm-text-micro)] font-bold uppercase tracking-wide text-[var(--lm-color-text-secondary)]">
            {frontierCandidates.length} of {frontierCandidates.length + dominatedCandidates.length}{' '}
            undominated
          </span>
          <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] px-1.5 py-0.5 text-[length:var(--lm-text-micro)] uppercase tracking-wide text-[var(--lm-color-text-muted)]">
            no weights · no normalisation · no composite score
          </span>
        </div>
        <span className="text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          {model.rankCount} dominance {model.rankCount === 1 ? 'tier' : 'tiers'} in this cohort
        </span>
      </div>

      <p className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-secondary)]">
        A candidate stays on the frontier when no other candidate is at least as good on every
        comparable objective and strictly better on at least one. Being on the frontier is not a
        recommendation: nothing here is weighted, summed or scored, so a strength in one objective
        never pays for a weakness in another.
      </p>

      <details className="rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]/50">
        <summary className="min-h-[24px] cursor-pointer p-2 text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]">
          Domination rule as computed by the service
        </summary>
        <p className="border-t border-[var(--lm-color-border-subtle)] p-2 text-[length:var(--lm-text-micro)] leading-relaxed text-[var(--lm-color-text-muted)]">
          {model.dominationRule}
        </p>
      </details>

      {frontierCandidates.length === 0 ? (
        <p className="rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)] p-2 text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-warning)]">
          The service returned no non-dominated candidate for this cohort, so there is no frontier to
          read.
        </p>
      ) : (
        <div className="relative min-w-0 overflow-x-auto rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)]">
          {/* relative anchors the table's abspos sr-only rows to this scroll box; otherwise they
              escape the clip and widen the document on narrow viewports. */}
          <table className="w-full min-w-[520px] border-collapse text-left">
            <caption className="sr-only">
              Objective values in their own units for each non-dominated candidate. Unavailable
              objectives are marked unavailable and take no part in the comparison.
            </caption>
            <thead>
              <tr className="border-b border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)]">
                <th
                  scope="col"
                  className="p-2 text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]"
                >
                  Objective
                </th>
                {frontierCandidates.map((candidate) => (
                  <th
                    key={candidate.siteId}
                    scope="col"
                    className="border-l border-[var(--lm-color-border-subtle)] p-2 align-bottom"
                  >
                    <span className="block text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-text-primary)]">
                      {siteDisplayName(candidate.siteName, candidate.siteId)}
                    </span>
                    <span className="mt-0.5 block text-[length:var(--lm-text-micro)] font-normal uppercase tracking-wide text-[var(--lm-color-success)]">
                      undominated
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {objectives.map((objective) => (
                <tr
                  key={objective.objectiveId}
                  className="border-b border-[var(--lm-color-border-subtle)] last:border-b-0"
                >
                  <th scope="row" className="p-2 align-top text-left font-normal">
                    <span className="block text-[length:var(--lm-text-micro)] font-semibold leading-snug text-[var(--lm-color-text-secondary)]">
                      {objective.label}
                    </span>
                    <span className="mt-0.5 block text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
                      {objective.participatesInDomination
                        ? `${directionPhrase(objective.direction)} · ${objective.unit}`
                        : 'not comparable in this data model'}
                    </span>
                    {objective.availability === 'nominal_only' ? (
                      <span
                        className="mt-1 inline-block rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-warning-border)] px-1 py-0.5 text-[length:var(--lm-text-micro)] uppercase tracking-wide text-[var(--lm-color-warning)]"
                        title={objective.limitationNote}
                      >
                        nominal only
                      </span>
                    ) : null}
                  </th>
                  {frontierCandidates.map((candidate) => {
                    const cell = candidate.cells.find(
                      (entry) => entry.objectiveId === objective.objectiveId,
                    );
                    if (cell === undefined) return <td key={candidate.siteId} className="p-2" />;
                    return (
                      <td
                        key={candidate.siteId}
                        className="border-l border-[var(--lm-color-border-subtle)] p-2 align-top text-[length:var(--lm-text-micro)]"
                      >
                        {cell.unavailable ? (
                          <span
                            data-unavailable="true"
                            title={cell.unavailableReason}
                            className="text-[var(--lm-color-text-muted)]"
                          >
                            <span className="border-b border-dashed border-[var(--lm-color-border-strong)]">
                              Unavailable
                            </span>
                            <span className="sr-only">: {cell.unavailableReason}</span>
                          </span>
                        ) : (
                          <span className="inline-flex flex-wrap items-baseline gap-1">
                            <span className="font-mono-num text-[var(--lm-color-text-primary)]">
                              {cell.text}
                            </span>
                            {cell.isCohortExtreme ? (
                              <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-success-border)] px-1 text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wide text-[var(--lm-color-success)]">
                                best
                              </span>
                            ) : null}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {frontierCandidates.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-[length:var(--lm-text-micro)] font-bold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
            Why each candidate is on the frontier
          </h4>
          <ul className="flex list-none flex-col gap-1.5 p-0">
            {frontierCandidates.map((candidate) => (
              <li
                key={candidate.siteId}
                className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]"
              >
                <span className="font-semibold text-[var(--lm-color-text-primary)]">
                  {siteDisplayName(candidate.siteName, candidate.siteId)}
                </span>
                {' — '}
                {candidate.uniquelyBestOn.length > 0
                  ? `holds ${candidate.uniquelyBestOn.join(', ')} outright, and no candidate is at least as good as it on every other comparable objective.`
                  : `is not the outright best on any comparable objective, yet no candidate beats it on all of them — this is a genuine trade-off, not a winner.`}
                {' '}
                Exact values are in the table above.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dominatedCandidates.length > 0 ? (
        <details className="rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)]">
          <summary className="min-h-[24px] cursor-pointer p-2 text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]">
            {dominatedCandidates.length} dominated{' '}
            {dominatedCandidates.length === 1 ? 'candidate' : 'candidates'}
          </summary>
          <ul className="flex list-none flex-col gap-1 border-t border-[var(--lm-color-border-subtle)] p-2">
            {dominatedCandidates.map((candidate) => (
              <li
                key={candidate.siteId}
                className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]"
              >
                <span className="font-semibold text-[var(--lm-color-text-secondary)]">
                  {siteDisplayName(candidate.siteName, candidate.siteId)}
                </span>
                {` — dominance tier ${candidate.rank}, dominated by `}
                {candidate.dominatedBy.length > 0 ? candidate.dominatedBy.join(', ') : 'an unreported candidate'}
                .
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {unavailableObjectives.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)] p-2">
          <h4 className="text-[length:var(--lm-text-micro)] font-bold uppercase tracking-wider text-[var(--lm-color-warning)]">
            Objectives this comparison cannot evaluate
          </h4>
          <p className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-secondary)]">
            {unavailableObjectives.map((objective) => objective.label).join(', ')}{' '}
            {unavailableObjectives.length === 1 ? 'is' : 'are'} unknown for this cohort, so{' '}
            {unavailableObjectives.length === 1 ? 'it' : 'they'} take
            {unavailableObjectives.length === 1 ? 's' : ''} no part in the ranking — read{' '}
            {unavailableObjectives.length === 1 ? 'it' : 'them'} as unknown, never as 0, never as the
            best or worst value.
          </p>
          <details>
            <summary className="min-h-[24px] cursor-pointer text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]">
              Why unknown (data-model detail)
            </summary>
            <ul className="flex list-none flex-col gap-1.5 p-0 pt-1.5">
              {unavailableObjectives.map((objective) => (
                <li
                  key={objective.objectiveId}
                  className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-secondary)]"
                >
                  <span className="font-semibold text-[var(--lm-color-text-primary)]">
                    {objective.label}
                  </span>
                  {' — '}
                  {objective.limitationNote ?? objective.measurementBasis}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </section>
  );
}

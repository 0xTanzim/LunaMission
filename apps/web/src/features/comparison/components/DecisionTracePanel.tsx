import React from 'react';
import type { DecisionTrace, DecisionTraceEntry } from '@luna/contracts';
import { ChevronRight } from 'lucide-react';
import { siteDisplayName } from '../model/siteDisplayName';
import { ComparisonIcon } from './ComparisonIcon';

const OUTCOME_LABEL: Record<DecisionTraceEntry['outcome'], string> = {
  feasible: 'FEASIBLE',
  disqualified: 'DISQUALIFIED',
  'insufficient-evidence': 'INSUFFICIENT EVIDENCE',
};

const OUTCOME_CLASS: Record<DecisionTraceEntry['outcome'], string> = {
  feasible: 'border-[var(--lm-color-success)] text-[var(--lm-color-success)]',
  disqualified: 'border-[var(--lm-color-danger)] text-[var(--lm-color-danger)]',
  'insufficient-evidence': 'border-[var(--lm-color-warning)] text-[var(--lm-color-warning)]',
};

const VERDICT_LABEL: Record<string, string> = {
  satisfied: 'SATISFIED',
  violated: 'VIOLATED',
  undecidable: 'UNDECIDABLE',
};

const SECTION_LABEL_CLASS =
  'mb-1 font-mono text-[11px] uppercase tracking-wider text-[var(--lm-color-text-muted)]';

const EvidenceRow: React.FC<{ entry: DecisionTraceEntry }> = ({ entry }) => {
  const binding = entry.bindingConstraint;
  const name = siteDisplayName(entry.siteName, entry.siteId);

  return (
    <details className="group rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)]">
      <summary className="flex min-w-0 cursor-pointer flex-wrap items-center gap-2 p-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]">
        <span
          aria-hidden="true"
          className="inline-block shrink-0 font-mono text-[11px] text-[var(--lm-color-text-muted)] transition-transform group-open:rotate-90 motion-reduce:transition-none"
        >
          <ComparisonIcon icon={ChevronRight} size={11} />
        </span>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide ${OUTCOME_CLASS[entry.outcome]}`}
        >
          {OUTCOME_LABEL[entry.outcome]}
        </span>
        <span className="font-semibold text-[var(--lm-color-text-primary)]" title={name}>
          {name}
        </span>
        {entry.rank !== null ? (
          <span className="font-mono text-[11px] text-[var(--lm-color-text-muted)]">
            RANK {entry.rank}
          </span>
        ) : null}
        <span
          className="min-w-0 flex-1 truncate text-[var(--lm-color-text-secondary)]"
          title={entry.narrative}
        >
          {entry.narrative}
        </span>
      </summary>

      <div className="flex min-w-0 flex-col gap-3 border-t border-[var(--lm-color-border-subtle)] p-3 text-xs">
        {binding ? (
          <div className="min-w-0">
            <div className={SECTION_LABEL_CLASS}>Binding constraint</div>
            <p className="break-words text-[var(--lm-color-text-secondary)]">
              <span className="font-semibold text-[var(--lm-color-text-primary)]">{binding.label}</span>{' '}
              — {binding.marginNarrative}
            </p>
          </div>
        ) : null}

        <div className="min-w-0">
          <div className={SECTION_LABEL_CLASS}>Constraints evaluated</div>
          <ul className="flex list-none flex-col gap-1 p-0">
            {entry.constraints.map((constraint) => (
              <li
                key={constraint.constraintName}
                className="flex min-w-0 flex-wrap items-baseline gap-2"
              >
                <span className="shrink-0 font-mono text-[11px] font-bold text-[var(--lm-color-text-primary)]">
                  {VERDICT_LABEL[constraint.verdict] ?? constraint.verdict}
                </span>
                <span className="min-w-0 break-words text-[var(--lm-color-text-secondary)]">
                  {constraint.marginNarrative}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-[var(--lm-color-text-muted)]">
                  evidence: {constraint.evidence.evidenceClass}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <div className={SECTION_LABEL_CLASS}>Uncertainty</div>
          <p className="text-[var(--lm-color-text-secondary)]">
            {entry.uncertainty.verdictRobust
              ? 'Verdict holds at both ends of the terrain bracket.'
              : 'Verdict flips inside the terrain bracket — not certifiable.'}
          </p>
          {entry.uncertainty.metricBrackets.length > 0 ? (
            <ul className="mt-1 flex list-none flex-col gap-0.5 p-0 font-mono text-[11px] text-[var(--lm-color-text-muted)]">
              {entry.uncertainty.metricBrackets.map((bracket) => (
                <li key={bracket.metricId} className="break-words">
                  {bracket.metricId}: worst {bracket.pessimistic.toFixed(2)} / nominal{' '}
                  {bracket.nominal.toFixed(2)} / best {bracket.optimistic.toFixed(2)} {bracket.unit}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {entry.unavailable.length > 0 ? (
          <div className="min-w-0">
            <div className={SECTION_LABEL_CLASS}>Not available for this site</div>
            <ul className="flex list-none flex-col gap-1 p-0">
              {entry.unavailable.map((gap) => (
                <li key={gap.capabilityId} className="break-words text-[var(--lm-color-text-secondary)]">
                  <span className="font-semibold text-[var(--lm-color-text-primary)]">{gap.label}</span>{' '}
                  — {gap.consequence}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
};

export const DecisionTracePanel: React.FC<{ trace: DecisionTrace | undefined }> = ({ trace }) => {
  if (!trace || trace.candidates.length === 0) return null;
  return (
    <section
      aria-label="Evidence and decision trace"
      className="flex min-w-0 flex-col gap-2 rounded-[var(--lm-radius-lg)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)] p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--lm-color-text-primary)]">
          EVIDENCE &amp; DECISION TRACE
        </h3>
        <p className="font-mono text-[11px] text-[var(--lm-color-text-muted)]">
          {trace.outcomeCounts.feasible} feasible · {trace.outcomeCounts.disqualified} disqualified ·{' '}
          {trace.outcomeCounts.insufficientEvidence} insufficient evidence
        </p>
      </div>
      <p className="text-[11px] text-[var(--lm-color-text-secondary)]">{trace.rule}</p>
      <div className="flex min-w-0 flex-col gap-2">
        {trace.candidates.map((entry) => (
          <EvidenceRow key={entry.siteId} entry={entry} />
        ))}
      </div>
    </section>
  );
};

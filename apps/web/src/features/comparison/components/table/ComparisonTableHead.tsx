import type { CandidateSite } from '@/domain/sites/candidateSite';

interface ComparisonTableHeadProps {
  sites: readonly CandidateSite[];
  /** The mission target, marked so the column is identifiable without colour. */
  primarySiteId: string;
}

const ENTITY_LABEL: Record<string, string> = {
  'region-centroid': 'Region centroid',
  'custom-point': 'Custom point',
  'candidate-point': 'Candidate point',
};

/**
 * Column identity: one header per compared site. Actions on a column (promote, inspect, remove)
 * live in the Operations group at the end of the matrix, so the header stays a label and the
 * table reads top-down as one decision instead of a toolbar per column.
 */
export function ComparisonTableHead({ sites, primarySiteId }: ComparisonTableHeadProps) {
  return (
    <thead>
      <tr className="border-b border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)]">
        <th
          scope="col"
          className="w-52 p-3 text-left align-bottom font-mono text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]"
        >
          Measurement
        </th>
        {sites.map((site) => (
          <th
            key={site.id}
            scope="col"
            className="min-w-[196px] border-l border-[var(--lm-color-border-subtle)] p-3 text-left align-top"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-selected-site)]/40 bg-[var(--lm-color-surface-strong)] px-1.5 py-0.5 font-mono text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-selected-site)]">
                  {site.code}
                </span>
                {site.id === primarySiteId && (
                  <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-warning-border)] px-1.5 py-0.5 font-mono text-[length:var(--lm-text-micro)] font-bold uppercase tracking-wide text-[var(--lm-color-warning)]">
                    Target
                  </span>
                )}
              </div>
              <span
                className="line-clamp-2 text-[length:var(--lm-text-body)] font-semibold leading-snug text-[var(--lm-color-text-primary)]"
                title={site.name}
              >
                {site.name}
              </span>
              <span className="text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
                {ENTITY_LABEL[site.entityType ?? ''] ?? site.priority}
              </span>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

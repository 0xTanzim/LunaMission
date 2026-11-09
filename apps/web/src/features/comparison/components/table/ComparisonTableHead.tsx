import type { CandidateSite } from '@/domain/sites/candidateSite';

export interface ComparisonTableHeadProps {
  sites: readonly CandidateSite[];
  /** The mission target, marked so the column is identifiable without colour. */
  primarySiteId: string;
  canRemoveSite?: boolean;
  onSetPrimary?: (siteId: string) => void;
  onInspectSite?: (site: CandidateSite) => void;
  onRemoveSite?: (siteId: string) => void;
}

const ENTITY_LABEL: Record<string, string> = {
  'region-centroid': 'Region centroid',
  'custom-point': 'Custom point',
  'candidate-point': 'Candidate point',
};

/**
 * Column identity: one header per compared site with instant column actions (target, explore, remove).
 */
export function ComparisonTableHead({
  sites,
  primarySiteId,
  canRemoveSite,
  onSetPrimary,
  onInspectSite,
  onRemoveSite,
}: ComparisonTableHeadProps) {
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

              <div className="flex flex-wrap items-center justify-between gap-1 mt-1.5 pt-1.5 border-t border-[var(--lm-color-border-subtle)]">
                <div className="flex items-center gap-1">
                  {onSetPrimary && site.id !== primarySiteId && (
                    <button
                      type="button"
                      onClick={() => onSetPrimary(site.id)}
                      title="Set as primary mission target"
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--lm-color-surface)] hover:bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-warning)] border border-[var(--lm-color-border)] hover:border-[var(--lm-color-warning-border)] transition-colors min-h-[24px]"
                    >
                      Make Target
                    </button>
                  )}
                  {onInspectSite && (
                    <button
                      type="button"
                      onClick={() => onInspectSite(site)}
                      title="Inspect site in Explore view"
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--lm-color-surface)] hover:bg-[var(--lm-color-info-surface)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-info)] border border-[var(--lm-color-border)] hover:border-[var(--lm-color-info-border)] transition-colors min-h-[24px]"
                    >
                      Explore ↗
                    </button>
                  )}
                </div>
                {canRemoveSite && onRemoveSite && (
                  <button
                    type="button"
                    onClick={() => onRemoveSite(site.id)}
                    title={`Remove ${site.name} from comparison`}
                    aria-label={`Remove ${site.name} from comparison`}
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-xs font-bold text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-danger)] hover:bg-[var(--lm-color-danger-surface-strong)] transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

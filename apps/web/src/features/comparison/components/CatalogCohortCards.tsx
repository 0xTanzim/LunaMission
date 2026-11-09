import { Check, Plus } from 'lucide-react';
import type { CatalogueEntry, SiteEvaluability } from '@/domain/sites/catalog';

export interface CatalogCohortCardsProps {
  /** Entries of the active catalog cohort, already filtered by the catalogue domain. */
  entries: readonly CatalogueEntry[];
  cohortSiteIds: readonly string[];
  /** False once the evaluation cohort is full. */
  canAddSite: boolean;
  onAddSite: (siteId: string) => void;
  onInspectSite?: (site: CatalogueEntry) => void;
}

const EVALUABILITY_BADGE: Record<SiteEvaluability, { label: string; className: string }> = {
  evaluable: {
    label: 'EVALUABLE',
    className: 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border-[var(--lm-color-success-border)]',
  },
  'catalogue-only': {
    label: 'CATALOGUE ONLY',
    className: 'bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)] border-[var(--lm-color-warning-border)]',
  },
};

const CARD_CLASS =
  'flex flex-col justify-between gap-2.5 p-3 rounded-[var(--lm-radius-md)] border bg-[var(--lm-color-surface-elevated)]';

const ACTION_CLASS =
  'inline-flex items-center justify-center gap-1 px-2 py-1 rounded-[var(--lm-radius-sm)] text-[11px] font-semibold border transition-colors min-h-[30px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]';

interface CatalogueCardProps {
  entry: CatalogueEntry;
  inCohort: boolean;
  canAddSite: boolean;
  onAddSite: (siteId: string) => void;
  onInspectSite?: (site: CatalogueEntry) => void;
}

/**
 * One catalogue region. The card states evaluability in words and in a badge, and the
 * cohort action is withdrawn — not merely greyed out — for regions the API cannot score.
 */
function CatalogueCard({ entry, inCohort, canAddSite, onAddSite, onInspectSite }: CatalogueCardProps) {
  const badge = EVALUABILITY_BADGE[entry.evaluability];
  const isEvaluable = entry.evaluability === 'evaluable';
  const publishedName = entry.catalogueRegion?.name ?? entry.name;
  const reasonId = `catalogue-only-reason-${entry.id}`;

  return (
    <li
      data-testid="catalogue-site-card"
      data-site-id={entry.id}
      data-evaluability={entry.evaluability}
      className={`${CARD_CLASS} ${
        isEvaluable
          ? 'border-[var(--lm-color-border-subtle)]'
          : 'border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)]'
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4
              className="text-xs font-bold text-[var(--lm-color-text-primary)] truncate"
              title={publishedName}
            >
              {publishedName}
            </h4>
            {entry.name !== publishedName && (
              <p className="text-[11px] text-[var(--lm-color-text-muted)] truncate">
                Registry entry: {entry.name}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 text-[11px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <p className="text-[11px] font-mono text-[var(--lm-color-text-secondary)]">
          {Math.abs(entry.coordinates.latitudeDeg).toFixed(2)}°S ·{' '}
          {entry.coordinates.longitudeDeg.toFixed(2)}°E ·{' '}
          {entry.coordinates.elevationMeters.toLocaleString()} m
        </p>
        <p className="text-[11px] text-[var(--lm-color-text-muted)] line-clamp-2" title={entry.description}>
          {entry.description}
        </p>
        <p className="text-[11px] font-mono text-[var(--lm-color-text-muted)]">
          {entry.code} · {entry.catalogueRegion?.officialReference ?? entry.coverageStatus}
        </p>
      </div>

      <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--lm-color-border-subtle)]">
        {isEvaluable ? (
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              disabled={inCohort || !canAddSite}
              aria-pressed={inCohort}
              onClick={() => onAddSite(entry.id)}
              className={`${ACTION_CLASS} ${
                inCohort || !canAddSite
                  ? 'bg-[var(--lm-color-surface)] text-[var(--lm-color-text-muted)] border-[var(--lm-color-border-subtle)] cursor-not-allowed'
                  : 'bg-[var(--lm-color-info-surface-strong)] text-[var(--lm-color-info)] border-[var(--lm-color-info-border)] hover:bg-[var(--lm-color-info-surface-strong)] cursor-pointer'
              }`}
            >
              {inCohort ? <Check className="w-3 h-3" aria-hidden="true" /> : <Plus className="w-3 h-3" aria-hidden="true" />}
              <span>{inCohort ? 'In cohort' : canAddSite ? 'Add to cohort' : 'Cohort full'}</span>
            </button>
            {onInspectSite && (
              <button
                type="button"
                onClick={() => onInspectSite(entry)}
                className={`${ACTION_CLASS} bg-[var(--lm-color-surface)] text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border-subtle)] hover:text-[var(--lm-color-text-primary)] cursor-pointer`}
              >
                Inspect
              </button>
            )}
          </div>
        ) : (
          <p
            id={reasonId}
            data-testid="catalogue-only-reason"
            className="text-[11px] leading-snug text-[var(--lm-color-warning)]/90"
          >
            {entry.evaluabilityReason}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Catalogue browser for one cohort: every region of the selected published cohort, whether
 * or not the backend can evaluate it. Restores the per-region browse the Artemis III (2022)
 * catalogue needs, where membership in the announcement is not evaluability.
 */
export function CatalogCohortCards({
  entries,
  cohortSiteIds,
  canAddSite,
  onAddSite,
  onInspectSite,
}: CatalogCohortCardsProps) {
  const evaluableCount = entries.filter((e) => e.evaluability === 'evaluable').length;
  const catalogueOnlyCount = entries.length - evaluableCount;

  return (
    <section
      aria-labelledby="catalog-cohort-cards-title"
      data-testid="catalog-cohort-cards"
      className="flex flex-col gap-3 p-3 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-md)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="catalog-cohort-cards-title"
          className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--lm-color-text-secondary)]"
        >
          Catalogue Cohort: {entries.length} regions
        </h3>
        <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)]">
          {evaluableCount} evaluable · {catalogueOnlyCount} catalogue only
        </span>
      </div>

      {catalogueOnlyCount > 0 && (
        <p
          role="note"
          data-testid="catalogue-only-note"
          className="text-[11px] leading-snug text-[var(--lm-color-text-muted)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-sm)] p-2"
        >
          <strong className="text-[var(--lm-color-warning)]">{catalogueOnlyCount} regions are catalogue only.</strong>{' '}
          A catalogue region is not a registered candidate site: LunaMission holds no LOLA horizon
          profile for it, so scenario evaluation and comparison would return 404. These regions are
          shown for provenance and cannot join an evaluation cohort.
        </p>
      )}

      <ul role="list" className="flex flex-col gap-2.5 max-h-[26rem] overflow-y-auto pr-0.5">
        {entries.map((entry) => (
          <CatalogueCard
            key={entry.id}
            entry={entry}
            inCohort={cohortSiteIds.includes(entry.id)}
            canAddSite={canAddSite}
            onAddSite={onAddSite}
            onInspectSite={onInspectSite}
          />
        ))}
      </ul>
    </section>
  );
}

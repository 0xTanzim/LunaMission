import { useEffect, useMemo, useState } from 'react';
import { Check, LayoutGrid, List, Plus, Search } from 'lucide-react';
import type { CatalogueEntry, SiteCatalogFilter } from '@/domain/sites/catalog';
import { Badge } from '@/shared/ui/Badge';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { CatalogCohortCards } from './CatalogCohortCards';
import { CatalogCohortTabs } from './CatalogCohortTabs';
import {
  CANDIDATE_CLASSES,
  CATALOGUE_SORT_OPTIONS,
  DEFAULT_CATALOGUE_FILTERS,
  catalogueCounts,
  classifyEntry,
  filterCatalogueEntries,
  matchLabel,
  sortCatalogueEntries,
  type CatalogueFilters,
  type CatalogueSortKey,
  type CatalogueViewMode,
  type CandidateClassId,
  type EvaluabilityFilter,
} from '../model/catalogueView';

const WIDE_LAYOUT_QUERY = '(min-width: 1280px)';

const SELECT_CLASS =
  'min-h-[28px] w-full cursor-pointer rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-1.5 py-0.5 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]';

const FIELD_LABEL_CLASS =
  'block text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-muted)]';

/** The rail is an open list on a wide screen and a closed disclosure above the matrix below it. */
function startsOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(WIDE_LAYOUT_QUERY).matches;
}

export interface CandidateCatalogueProps {
  /** Every entry of the active cohort, including the ones the API cannot evaluate. */
  entries: readonly CatalogueEntry[];
  cohortSiteIds: readonly string[];
  canAddSite: boolean;
  activeTab: SiteCatalogFilter;
  onTabChange: (tab: SiteCatalogFilter) => void;
  onAddSite: (siteId: string) => void;
  onInspectSite?: (entry: CatalogueEntry) => void;
}

interface CatalogueRowProps {
  entry: CatalogueEntry;
  inCohort: boolean;
  canAddSite: boolean;
  onAddSite: (siteId: string) => void;
  onInspectSite?: (entry: CatalogueEntry) => void;
}

/**
 * One catalogue entry as one compact list group. Evaluability is stated in words inside a badge —
 * and, for a region the API cannot score, the add control is replaced by the reason rather than
 * greyed out, so a catalogue-only row cannot be mistaken for an available candidate.
 */
function CatalogueRow({
  entry,
  inCohort,
  canAddSite,
  onAddSite,
  onInspectSite,
}: CatalogueRowProps) {
  const candidateClass = classifyEntry(entry);
  const evaluable = entry.evaluability === 'evaluable';
  const publishedName = entry.catalogueRegion?.name ?? entry.name;
  const displayName =
    entry.name !== publishedName ? `${publishedName} · ${entry.name}` : publishedName;

  return (
    <li
      data-testid="catalogue-site-row"
      data-site-id={entry.id}
      data-evaluability={entry.evaluability}
      className={`flex flex-col gap-1 rounded-[var(--lm-radius-sm)] border p-2 ${
        evaluable
          ? 'border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)]'
          : 'border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="truncate text-[length:var(--lm-text-body)] font-semibold leading-snug text-[var(--lm-color-text-primary)]"
            title={displayName}
          >
            {publishedName}
          </p>
          <p className="truncate text-[length:var(--lm-text-micro)] font-mono text-[var(--lm-color-text-muted)]">
            {entry.code} · {candidateClass.label}
          </p>
        </div>

        {evaluable ? (
          <button
            type="button"
            disabled={inCohort || !canAddSite}
            aria-pressed={inCohort}
            aria-label={
              inCohort
                ? `${publishedName} is already in the comparison cohort`
                : `Add ${publishedName} to the comparison cohort`
            }
            title={
              inCohort
                ? 'Already in the comparison cohort'
                : canAddSite
                  ? 'Add to the comparison cohort'
                  : 'The comparison already holds four columns'
            }
            onClick={() => onAddSite(entry.id)}
            className={`inline-flex min-h-[24px] shrink-0 items-center gap-1 rounded-[var(--lm-radius-xs)] border px-1.5 py-0.5 text-[length:var(--lm-text-micro)] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)] ${
              inCohort || !canAddSite
                ? 'cursor-not-allowed border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] text-[var(--lm-color-text-disabled)]'
                : 'cursor-pointer border-[var(--lm-color-info-border)] bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] hover:bg-[var(--lm-color-info-surface-strong)]'
            }`}
          >
            {inCohort ? (
              <Check size={11} aria-hidden="true" focusable="false" />
            ) : (
              <Plus size={11} aria-hidden="true" focusable="false" />
            )}
            {inCohort ? 'In cohort' : canAddSite ? 'Add' : 'Full'}
          </button>
        ) : (
          <Badge variant="warning">Catalogue only</Badge>
        )}
      </div>

      <p className="font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-secondary)]">
        {Math.abs(entry.coordinates.latitudeDeg).toFixed(2)}°S ·{' '}
        {entry.coordinates.longitudeDeg.toFixed(2)}°E ·{' '}
        {entry.coordinates.elevationMeters.toLocaleString()} m
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {evaluable ? <Badge variant="success">Evaluable</Badge> : null}
        <span
          className="min-w-0 flex-1 truncate text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]"
          title={entry.coverageStatus}
        >
          {entry.coverageStatus ?? 'Coverage unstated'}
        </span>
        {onInspectSite ? (
          <button
            type="button"
            onClick={() => onInspectSite(entry)}
            aria-label={`Inspect ${publishedName} in Explore`}
            className="inline-flex min-h-[24px] items-center rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] px-1.5 text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-text-secondary)] transition-colors hover:border-[var(--lm-color-info-border)] hover:text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
          >
            Inspect
          </button>
        ) : null}
      </div>

      {!evaluable ? (
        <p className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-warning)]">
          {entry.evaluabilityReason ?? 'This entry has no registered horizon profile.'}
        </p>
      ) : null}
    </li>
  );
}

/**
 * The candidate catalogue: search, cohort, status, class, sort, and a compact list by default.
 *
 * It sits beside the comparison on a wide screen and behind one disclosure above it otherwise, so
 * browsing candidates never pushes the comparison itself off the screen.
 */
export function CandidateCatalogue({
  entries,
  cohortSiteIds,
  canAddSite,
  activeTab,
  onTabChange,
  onAddSite,
  onInspectSite,
}: CandidateCatalogueProps) {
  const [filters, setFilters] = useState<CatalogueFilters>(DEFAULT_CATALOGUE_FILTERS);
  const [sortKey, setSortKey] = useState<CatalogueSortKey>('catalogue-order');
  const [view, setView] = useState<CatalogueViewMode>('list');
  const [open, setOpen] = useState<boolean>(startsOpen);

  // Crossing into the wide layout opens the rail; shrinking back never takes a control away.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(WIDE_LAYOUT_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(true);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const shown = useMemo(
    () => sortCatalogueEntries(filterCatalogueEntries(entries, filters), sortKey),
    [entries, filters, sortKey],
  );
  const counts = catalogueCounts(shown, entries);
  const filtersActive =
    filters.query.trim() !== '' ||
    filters.evaluability !== 'all' ||
    filters.candidateClass !== 'all';

  return (
    <section
      aria-labelledby="candidate-catalogue-title"
      data-testid="candidate-catalogue"
      className="flex min-w-0 flex-col gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="candidate-catalogue-title"
            className="text-[length:var(--lm-text-label)] font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]"
          >
            Candidate catalogue
          </h2>
          <p className="font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
            {matchLabel(counts)} · {counts.evaluable} evaluable · {counts.catalogueOnly} catalogue
            only
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          aria-controls="candidate-catalogue-body"
          className="inline-flex min-h-[24px] shrink-0 items-center rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] px-2 text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-text-secondary)] transition-colors hover:border-[var(--lm-color-info-border)] hover:text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          {open ? 'Hide catalogue' : 'Browse candidates'}
        </button>
      </div>

      <div id="candidate-catalogue-body" hidden={!open} className="flex min-w-0 flex-col gap-3">
        <p className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
          Catalogue membership is not evaluability: a region with no registered LOLA horizon profile
          cannot be scored, so it cannot join an evaluation cohort.
        </p>

        <CatalogCohortTabs activeTab={activeTab} onChange={onTabChange} />

        <div className="flex flex-col gap-2">
          <div>
            <label htmlFor="catalogue-search" className={FIELD_LABEL_CLASS}>
              Search
            </label>
            <div className="relative">
              <Search
                size={12}
                aria-hidden="true"
                focusable="false"
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--lm-color-text-muted)]"
              />
              <input
                id="catalogue-search"
                type="search"
                value={filters.query}
                placeholder="Name, code or reference"
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, query: event.target.value }))
                }
                className="min-h-[28px] w-full rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] py-1 pl-7 pr-2 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-primary)] placeholder:text-[var(--lm-color-text-muted)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="catalogue-evaluability" className={FIELD_LABEL_CLASS}>
                Evaluability
              </label>
              <select
                id="catalogue-evaluability"
                value={filters.evaluability}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    evaluability: event.target.value as EvaluabilityFilter,
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value="all">All entries</option>
                <option value="evaluable">Evaluable</option>
                <option value="catalogue-only">Catalogue only</option>
              </select>
            </div>
            <div>
              <label htmlFor="catalogue-class" className={FIELD_LABEL_CLASS}>
                Region class
              </label>
              <select
                id="catalogue-class"
                value={filters.candidateClass}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    candidateClass: event.target.value as CandidateClassId | 'all',
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value="all">All classes</option>
                {CANDIDATE_CLASSES.map((candidateClass) => (
                  <option key={candidateClass.id} value={candidateClass.id}>
                    {candidateClass.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="catalogue-sort" className={FIELD_LABEL_CLASS}>
              Sort
            </label>
            <select
              id="catalogue-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as CatalogueSortKey)}
              className={SELECT_CLASS}
            >
              {CATALOGUE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <SegmentedControl
            label="Catalogue presentation"
            size="sm"
            value={view}
            onChange={(val) => setView(val as CatalogueViewMode)}
            options={[
              { value: 'list', label: 'Compact list', icon: <List size={11} aria-hidden="true" /> },
              {
                value: 'cards',
                label: 'Visual cards',
                icon: <LayoutGrid size={11} aria-hidden="true" />,
              },
            ]}
          />
        </div>

        <div aria-live="polite" className="sr-only">
          {matchLabel(counts)}
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)] p-3">
            <p className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-secondary)]">
              No entry in this cohort matches the current search and filters.
            </p>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_CATALOGUE_FILTERS)}
                className="min-h-[24px] self-start rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] px-2 text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : view === 'list' ? (
          <ul role="list" className="flex max-h-[26rem] flex-col gap-1.5 overflow-y-auto pr-0.5">
            {shown.map((entry) => (
              <CatalogueRow
                key={entry.id}
                entry={entry}
                inCohort={cohortSiteIds.includes(entry.id)}
                canAddSite={canAddSite}
                onAddSite={onAddSite}
                onInspectSite={onInspectSite}
              />
            ))}
          </ul>
        ) : (
          <CatalogCohortCards
            entries={shown}
            cohortSiteIds={cohortSiteIds}
            canAddSite={canAddSite}
            onAddSite={onAddSite}
            onInspectSite={onInspectSite}
          />
        )}
      </div>
    </section>
  );
}

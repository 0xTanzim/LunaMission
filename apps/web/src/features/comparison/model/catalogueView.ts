/**
 * Reading the candidate catalogue for the comparison rail.
 *
 * Nine full-width candidate cards used to occupy the screen before the actual comparison, so a
 * user had to scroll a grid to reach the thing they came for. The rail reads the same catalogue
 * entries in one compact line each, and this module owns the reading: which entry belongs to
 * which published cohort, which text a search matches, and how the list is ordered.
 *
 * Nothing here scores, ranks or evaluates a candidate. Classification is a display taxonomy over
 * catalogue fields, so the four kinds of entry the product holds — announced NASA regions,
 * published research/benchmark sites, CLPS landing sites and historic reference baselines — stay
 * distinguishable instead of collapsing into one list of "sites".
 */

import type { CatalogueEntry, SiteEvaluability } from '@/domain/sites/catalog';

export type CatalogueViewMode = 'list' | 'cards';

export type EvaluabilityFilter = 'all' | SiteEvaluability;

export type CandidateClassId =
  | 'nasa-2022'
  | 'nasa-2024'
  | 'research'
  | 'clps'
  | 'historic'
  | 'class-unstated';

export interface CandidateClass {
  readonly id: CandidateClassId;
  readonly label: string;
  readonly description: string;
}

export const CANDIDATE_CLASSES: readonly CandidateClass[] = [
  {
    id: 'nasa-2022',
    label: 'NASA 2022 region',
    description:
      'Region from the August 2022 Artemis III announcement. A region centroid, not an approved touchdown coordinate.',
  },
  {
    id: 'nasa-2024',
    label: 'NASA 2024 region',
    description: 'Region from the October 2024 Artemis III candidate list.',
  },
  {
    id: 'research',
    label: 'Research / benchmark',
    description:
      'Published research or calibration site with its own registered LOLA horizon profile and terrain-mask summary.',
  },
  {
    id: 'clps',
    label: 'CLPS lander',
    description: 'Commercial Lunar Payload Services mission landing site.',
  },
  {
    id: 'historic',
    label: 'Historical reference',
    description: 'Historic mission reference baseline. Kept for calibration, not as a candidate.',
  },
  {
    id: 'class-unstated',
    label: 'Classification unstated',
    description: 'The catalogue does not classify this entry.',
  },
];

const CLASS_BY_ID = new Map(CANDIDATE_CLASSES.map((entry) => [entry.id, entry] as const));

/** The published cohort an entry belongs to, read from its catalogue fields. */
export function classifyEntry(entry: CatalogueEntry): CandidateClass {
  const epoch = entry.catalogueRegion?.epoch;
  if (epoch === '2022-legacy' || entry.category === 'artemis-iii-2022') {
    return CLASS_BY_ID.get('nasa-2022')!;
  }
  if (entry.category === 'artemis-2024' || entry.category === 'artemis-iii-2024') {
    return CLASS_BY_ID.get('nasa-2024')!;
  }
  if (entry.category === 'clps') return CLASS_BY_ID.get('clps')!;
  if (entry.category === 'historic') return CLASS_BY_ID.get('historic')!;
  if (entry.category === 'polar-benchmark') return CLASS_BY_ID.get('research')!;
  return CLASS_BY_ID.get('class-unstated')!;
}

export const CATALOGUE_SORT_KEYS = [
  'catalogue-order',
  'name',
  'elevation-desc',
  'latitude-south',
] as const;

export type CatalogueSortKey = (typeof CATALOGUE_SORT_KEYS)[number];

export const CATALOGUE_SORT_OPTIONS: readonly { value: CatalogueSortKey; label: string }[] = [
  { value: 'catalogue-order', label: 'Catalogue order' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'elevation-desc', label: 'Highest elevation first' },
  { value: 'latitude-south', label: 'Most southerly first' },
];

export interface CatalogueFilters {
  readonly query: string;
  readonly evaluability: EvaluabilityFilter;
  readonly candidateClass: CandidateClassId | 'all';
}

export const DEFAULT_CATALOGUE_FILTERS: CatalogueFilters = {
  query: '',
  evaluability: 'all',
  candidateClass: 'all',
};

/** Fields a search matches. Codes, names and published references — not prose descriptions. */
function searchableText(entry: CatalogueEntry): string {
  return [
    entry.name,
    entry.code,
    entry.priority,
    entry.catalogueRegion?.name,
    entry.catalogueRegion?.officialReference,
    entry.officialRegionReference,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

export function filterCatalogueEntries(
  entries: readonly CatalogueEntry[],
  filters: CatalogueFilters,
): CatalogueEntry[] {
  const query = filters.query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filters.evaluability !== 'all' && entry.evaluability !== filters.evaluability) return false;
    if (filters.candidateClass !== 'all' && classifyEntry(entry).id !== filters.candidateClass) {
      return false;
    }
    if (query === '') return true;
    return searchableText(entry).includes(query);
  });
}

/** Ordering only. `catalogue-order` is the order the catalogue published. */
export function sortCatalogueEntries(
  entries: readonly CatalogueEntry[],
  sortKey: CatalogueSortKey,
): CatalogueEntry[] {
  const ordered = [...entries];
  switch (sortKey) {
    case 'name':
      return ordered.sort((a, b) => a.name.localeCompare(b.name));
    case 'elevation-desc':
      return ordered.sort((a, b) => b.coordinates.elevationMeters - a.coordinates.elevationMeters);
    case 'latitude-south':
      return ordered.sort((a, b) => a.coordinates.latitudeDeg - b.coordinates.latitudeDeg);
    case 'catalogue-order':
    default:
      return ordered;
  }
}

export interface CatalogueCounts {
  readonly shown: number;
  readonly total: number;
  readonly evaluable: number;
  readonly catalogueOnly: number;
}

export function catalogueCounts(
  shown: readonly CatalogueEntry[],
  total: readonly CatalogueEntry[],
): CatalogueCounts {
  return {
    shown: shown.length,
    total: total.length,
    evaluable: total.filter((entry) => entry.evaluability === 'evaluable').length,
    catalogueOnly: total.filter((entry) => entry.evaluability === 'catalogue-only').length,
  };
}

/** `9 of 13` — never hides that a filter is narrowing the cohort. */
export function matchLabel(counts: CatalogueCounts): string {
  return counts.shown === counts.total
    ? `${counts.total} ${counts.total === 1 ? 'entry' : 'entries'}`
    : `${counts.shown} of ${counts.total} entries match`;
}

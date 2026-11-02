import type { CandidateSite, SiteCategory } from './candidateSite';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  ARTEMIS_2022_LEGACY_REGIONS,
  type CatalogEpoch,
  type DualEpochCatalogSite,
} from './artemisCatalog2026';

export type { CandidateSite, SiteCategory };

export const CATALOG_METADATA = {
  catalogName: 'Lunar Exploration Candidate & Benchmark Landing Sites',
  catalogVersion: 'Space Apps 2026 Multitier Planetary Dataset',
  lineage: 'NASA Artemis 2024 candidate regions, CLPS mission flight manifests, and Apollo/CNSA ground truth baselines',
  officialUpdateNotice: 'Includes 9 official Artemis III candidate regions (Oct 2024 update), polar benchmarks, CLPS landers (IM-1, IM-2, Blue Ghost), and historic reference sites (Apollo 11, Apollo 17, Chang\'e 6).',
  coordinateConvention: 'IAU/IAG Lunar Mean Earth / Polar Axis (ME)',
  elevationDatum: 'Reference lunar sphere of R = 1737.4 km (LOLA DEM 128ppd)',
} as const;

export const DEFAULT_SITE_ID = 'shackleton-rim';

export const DEFAULT_COMPARISON_SITE_IDS: readonly string[] = [
  'shackleton-rim',
  'connecting-ridge',
  'malapert-massif',
];

export const ARTEMIS_III_2024_REGION_IDS: readonly string[] = [
  'peak-near-cabeus-b',
  'haworth-rim',
  'malapert-massif',
  'mons-mouton',
  'mons-mouton-plateau',
  'nobile-rim-1',
  'nobile-rim-2',
  'de-gerlache-rim-2',
  'slater-plain',
];

export const POLAR_BENCHMARK_SITE_IDS: readonly string[] = [
  'shackleton-rim',
  'connecting-ridge',
  'de-gerlache-rim-1',
  'peak-near-shackleton',
  'amundsen-rim',
];

export const CLPS_SITE_IDS: readonly string[] = [
  'im-1-odysseus',
  'im-2-prime1',
  'firefly-blue-ghost',
];

export const HISTORIC_SITE_IDS: readonly string[] = [
  'apollo-11',
  'apollo-17',
  'change-6',
];

export type SiteCatalogFilter = 'artemis-iii-2022' | 'artemis-iii-2024' | 'all' | SiteCategory;

/**
 * Whether a catalog entry can be handed to the evaluation API.
 *
 * `evaluable` — the entry has a registered candidate site and therefore a LOLA horizon
 * profile, so scenario evaluation and comparison can score it.
 *
 * `catalogue-only` — the entry is a published catalogue region that is *not* a registered
 * candidate site. It is browsable and citable, but it has no horizon profile, so
 * `POST /api/v1/scenarios/{evaluate,compare}` returns 404 for it. A candidate **region** is
 * not an approved touchdown coordinate and catalogue membership is not evaluability.
 */
export type SiteEvaluability = 'evaluable' | 'catalogue-only';

/** The published catalogue record a catalog entry was resolved from. */
export interface CatalogueRegion {
  readonly id: string;
  readonly name: string;
  readonly epoch: CatalogEpoch;
  readonly officialReference: string;
}

/** A catalog entry: a candidate site plus whether the backend can evaluate it. */
export interface CatalogueEntry extends CandidateSite {
  readonly evaluability: SiteEvaluability;
  /** Why the entry cannot be evaluated. Present only on `catalogue-only` entries. */
  readonly evaluabilityReason?: string;
  /** The catalogue record this entry stands for, when the filter names one. */
  readonly catalogueRegion?: CatalogueRegion;
}

/** Shown next to every catalogue-only entry so the missing capability is never silent. */
export const CATALOGUE_ONLY_REASON =
  'No registered candidate site: LunaMission holds no LOLA horizon profile for this region, so the evaluation API answers 404. It can be browsed and cited, but not scored or added to an evaluation cohort.';

/** Number of regions in the August 2022 Artemis III catalogue, derived from the dataset. */
export const ARTEMIS_III_2022_REGION_COUNT = ARTEMIS_2022_LEGACY_REGIONS.length;

/**
 * 2022 catalogue ids whose registered candidate site uses a different id.
 *
 * A 2022 region name is not a registry site, so this table holds only records that are the
 * same object: same named feature and *identical* published coordinates.
 * (`haworth` −87.40°/355.00° vs `haworth-rim` −87.4°/355.0°.) Regions whose published
 * coordinates differ from any registry record stay catalogue-only — e.g. the 2022
 * `shackleton-connecting-ridge` record at 222.10°E is not the registry`s `connecting-ridge`
 * at 222.5°E.
 */
const LEGACY_2022_REGISTRY_IDS: Readonly<Record<string, string>> = {
  haworth: 'haworth-rim',
};

const dynamicSitesRegistry = new Map<string, CandidateSite>(
  CANDIDATE_SITES.map((s) => [s.id, s]),
);

export function registerDynamicSites(sites: CandidateSite[]): void {
  for (const site of sites) {
    if (site && site.id) {
      dynamicSitesRegistry.set(site.id, site);
    }
  }
}

export function clearDynamicSites(): void {
  dynamicSitesRegistry.clear();
}

export function getAllAvailableSites(): CandidateSite[] {
  return Array.from(dynamicSitesRegistry.values());
}

export function getSitesByCategory(category: SiteCategory): CandidateSite[] {
  return getAllAvailableSites().filter((s) => s.category === category);
}

function asEvaluable(sites: CandidateSite[]): CatalogueEntry[] {
  return sites.map((site) => ({ ...site, evaluability: 'evaluable' as const }));
}

function toCatalogueEntry(region: DualEpochCatalogSite, index: number): CatalogueEntry {
  const catalogueRegion: CatalogueRegion = {
    id: region.id,
    name: region.name,
    epoch: region.epoch,
    officialReference: region.officialReference,
  };
  const registered = getSiteById(LEGACY_2022_REGISTRY_IDS[region.id] ?? region.id);
  if (registered !== undefined) {
    return { ...registered, evaluability: 'evaluable', catalogueRegion };
  }

  return {
    id: region.id,
    // Display ordinal of the 2022 catalogue record; the region has no registry code.
    code: `ART-2022-${String(index + 1).padStart(2, '0')}`,
    name: region.name,
    priority: 'Artemis III 2022 Legacy Region',
    category: 'artemis-iii-2022',
    description: region.description,
    coordinates: {
      latitudeDeg: region.coordinates.latitudeDeg,
      longitudeDeg: region.coordinates.longitudeDeg,
      elevationMeters: region.elevationMeters,
      convention: region.coordinates.convention,
    },
    entityType: 'region-centroid',
    officialRegionReference: region.officialReference,
    coverageStatus: 'Catalogue only — no LOLA horizon profile registered',
    evaluability: 'catalogue-only',
    evaluabilityReason: CATALOGUE_ONLY_REASON,
    catalogueRegion,
  };
}

/** The 13 announced August-2022 Artemis III regions, resolved against the candidate registry. */
export function getArtemis2022CatalogueEntries(): CatalogueEntry[] {
  return ARTEMIS_2022_LEGACY_REGIONS.map(toCatalogueEntry);
}

/** Published catalogue entries that cannot be evaluated, with their reasons attached. */
export function getCatalogueOnlyEntries(): CatalogueEntry[] {
  return getArtemis2022CatalogueEntries().filter((e) => e.evaluability === 'catalogue-only');
}

/**
 * Evaluability of a bare site id — the form a cohort holds. `undefined` means the catalogue
 * knows nothing about the id. Only `evaluable` ids may enter an evaluation cohort.
 */
export function getSiteEvaluability(siteId: string): SiteEvaluability | undefined {
  if (getSiteById(siteId) !== undefined) return 'evaluable';
  const known = ARTEMIS_2022_LEGACY_REGIONS.some((region) => region.id === siteId);
  return known ? 'catalogue-only' : undefined;
}

/** True only when the evaluation API can score this id. */
export function isEvaluableSiteId(siteId: string): boolean {
  return getSiteEvaluability(siteId) === 'evaluable';
}

export function getFilteredCandidateSites(filter: SiteCatalogFilter = 'all'): CatalogueEntry[] {
  if (filter === 'artemis-iii-2022') {
    return getArtemis2022CatalogueEntries();
  }
  if (filter === 'artemis-iii-2024' || filter === 'artemis-2024') {
    return asEvaluable(getAllAvailableSites().filter((s) => ARTEMIS_III_2024_REGION_IDS.includes(s.id)));
  }
  if (filter === 'polar-benchmark') {
    return asEvaluable(getSitesByCategory('polar-benchmark'));
  }
  if (filter === 'clps') {
    return asEvaluable(getSitesByCategory('clps'));
  }
  if (filter === 'historic') {
    return asEvaluable(getSitesByCategory('historic'));
  }
  return asEvaluable(getAllAvailableSites());
}

export function getSiteById(id: string): CandidateSite | undefined {
  return dynamicSitesRegistry.get(id) ?? CANDIDATE_SITES.find((s) => s.id === id);
}

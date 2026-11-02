import type { CandidateSite, SiteCategory } from '@luna/contracts';
import { ARTEMIS_III_2024_SITES } from './artemisSites';
import { POLAR_BENCHMARK_SITES } from './benchmarkSites';
import { CLPS_SITES } from './clpsSites';
import { HISTORIC_SITES } from './historicSites';

export type { SiteCategory };

export const CATALOG_METADATA = {
  catalogName: 'Lunar Exploration Candidate & Benchmark Landing Sites',
  catalogVersion: 'Space Apps 2026 Multitier Planetary Dataset',
  lineage: 'NASA Artemis 2024 candidate regions, CLPS mission flight manifests, and Apollo/CNSA ground truth baselines',
  officialUpdateNotice: "Includes 9 official Artemis III candidate regions (Oct 2024 update), polar benchmarks, CLPS landers (IM-1, IM-2, Blue Ghost), and historic reference sites (Apollo 11, Apollo 17, Chang'e 6).",
  coordinateConvention: 'IAU/IAG Lunar Mean Earth / Polar Axis (ME)',
  elevationDatum: 'Reference lunar sphere of R = 1737.4 km (LOLA DEM 128ppd)',
} as const;

export const CANDIDATE_SITES: CandidateSite[] = [
  ...POLAR_BENCHMARK_SITES,
  ...ARTEMIS_III_2024_SITES,
  ...CLPS_SITES,
  ...HISTORIC_SITES,
];

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

export type SiteCatalogFilter = 'artemis-iii-2024' | 'all' | SiteCategory;

export function getSitesByCategory(category: SiteCategory): CandidateSite[] {
  return CANDIDATE_SITES.filter((s) => s.category === category);
}

export function getFilteredCandidateSites(filter: SiteCatalogFilter = 'all'): CandidateSite[] {
  if (filter === 'artemis-iii-2024' || filter === 'artemis-2024') {
    return CANDIDATE_SITES.filter((s) => ARTEMIS_III_2024_REGION_IDS.includes(s.id));
  }
  if (filter === 'polar-benchmark') {
    return getSitesByCategory('polar-benchmark');
  }
  if (filter === 'clps') {
    return getSitesByCategory('clps');
  }
  if (filter === 'historic') {
    return getSitesByCategory('historic');
  }
  return CANDIDATE_SITES;
}

const dynamicSitesRegistry = new Map<string, CandidateSite>();

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
  if (dynamicSitesRegistry.size === 0) {
    return CANDIDATE_SITES;
  }
  const merged = new Map<string, CandidateSite>();
  for (const s of CANDIDATE_SITES) {
    merged.set(s.id, s);
  }
  for (const [id, s] of dynamicSitesRegistry) {
    merged.set(id, s);
  }
  return Array.from(merged.values());
}

export function getSiteById(id: string): CandidateSite | undefined {
  return dynamicSitesRegistry.get(id) ?? CANDIDATE_SITES.find((s) => s.id === id);
}

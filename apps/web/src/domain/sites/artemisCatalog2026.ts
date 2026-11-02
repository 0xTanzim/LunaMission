/**
 * Dual-Epoch Artemis Candidate Landing Region Catalog (2024-2026)
 *
 * Grounded in official NASA Artemis III landing region announcements:
 * - October 2024 Down-Selected 9 Regions
 * - August 2022 Legacy 13 Regions
 * - Commercial Lunar Payload Services (CLPS) benchmarks
 * - Wueller et al. (2026) 130 Candidate Landing Sites (CLSs)
 *
 * Reference datum: IAU/IAG Lunar Mean Earth/Polar Axis (MOON_ME)
 */

export interface DualEpochCoordinates {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly convention: string;
}

export type CatalogEpoch = '2024-confirmed' | '2022-legacy' | 'clps-commercial' | 'cls-wueller-2026';

export interface DualEpochCatalogSite {
  readonly id: string;
  readonly name: string;
  readonly epoch: CatalogEpoch;
  readonly coordinates: DualEpochCoordinates;
  readonly elevationMeters: number;
  readonly description: string;
  readonly officialReference: string;
  readonly siteDesignation?: string;
  readonly isPrimaryArtemisCandidate?: boolean;
}

export const ARTEMIS_2024_CONFIRMED_REGIONS: readonly DualEpochCatalogSite[] = [
  {
    id: 'peak-near-cabeus-b',
    name: 'Peak near Cabeus B',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -83.65, longitudeDeg: 291.27, convention: 'IAU MOON_ME' },
    elevationMeters: 1850,
    description: 'Prominent elevated ridge northeast of Cabeus B crater offering extended line of sight to Earth.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'haworth',
    name: 'Haworth',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -87.40, longitudeDeg: 355.00, convention: 'IAU MOON_ME' },
    elevationMeters: 2890,
    description: 'Elevated crater rim adjacent to deep permanently shadowed volatile cold traps.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -85.90, longitudeDeg: 2.90, convention: 'IAU MOON_ME' },
    elevationMeters: 5100,
    description: 'Major topographic massif rising ~5 km above surroundings with high DTE visibility.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'mons-mouton-plateau',
    name: 'Mons Mouton Plateau',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -84.30, longitudeDeg: 329.80, convention: 'IAU MOON_ME' },
    elevationMeters: 5600,
    description: 'Broad elevated plateau on Mons Mouton providing benign slope margins.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'mons-mouton',
    name: 'Mons Mouton',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -84.60, longitudeDeg: 334.40, convention: 'IAU MOON_ME' },
    elevationMeters: 6050,
    description: 'Distinctive flat-topped lunar mountain providing persistent solar visibility.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'nobile-rim-1',
    name: 'Nobile Rim 1',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -85.20, longitudeDeg: 53.50, convention: 'IAU MOON_ME' },
    elevationMeters: 3800,
    description: 'Northwestern rim crest of Nobile crater with continuous summer illumination.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'nobile-rim-2',
    name: 'Nobile Rim 2',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -84.20, longitudeDeg: 60.70, convention: 'IAU MOON_ME' },
    elevationMeters: 4100,
    description: 'Northern rim ridge of Nobile crater corresponding to benchmark landing site DM2.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'de-gerlache-rim-2',
    name: 'de Gerlache Rim 2',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -88.30, longitudeDeg: 292.00, convention: 'IAU MOON_ME' },
    elevationMeters: 3100,
    description: 'Western rim crest of de Gerlache crater in proximity to Shackleton connecting ridge.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'slater-plain',
    name: 'Slater Plain',
    epoch: '2024-confirmed',
    coordinates: { latitudeDeg: -88.10, longitudeDeg: 112.50, convention: 'IAU MOON_ME' },
    elevationMeters: 1950,
    description: 'Inter-crater highland plain between Faustini and Shoemaker craters with gentle slopes.',
    officialReference: 'NASA Artemis III October 2024 Down-Selected 9 Regions',
    isPrimaryArtemisCandidate: true,
  },
];

export const ARTEMIS_2022_LEGACY_REGIONS: readonly DualEpochCatalogSite[] = [
  ...ARTEMIS_2024_CONFIRMED_REGIONS.map((s) => ({
    ...s,
    epoch: '2022-legacy' as CatalogEpoch,
    officialReference: 'NASA Artemis III August 2022 Announcement (13 Regions)',
  })),
  {
    id: 'shackleton-connecting-ridge',
    name: 'Connecting Ridge',
    epoch: '2022-legacy',
    coordinates: { latitudeDeg: -89.44, longitudeDeg: 222.10, convention: 'IAU MOON_ME' },
    elevationMeters: 1820,
    description: 'Narrow elevated ridge connecting Shackleton rim to de Gerlache crater.',
    officialReference: 'NASA Artemis III August 2022 Announcement (13 Regions)',
  },
  {
    id: 'connecting-ridge-extension',
    name: 'Connecting Ridge Extension',
    epoch: '2022-legacy',
    coordinates: { latitudeDeg: -89.15, longitudeDeg: 205.00, convention: 'IAU MOON_ME' },
    elevationMeters: 1750,
    description: 'Extension ridge branching north-northwest from the Shackleton connecting ridge.',
    officialReference: 'NASA Artemis III August 2022 Announcement (13 Regions)',
  },
  {
    id: 'de-gerlache-rim-1',
    name: 'de Gerlache Rim 1',
    epoch: '2022-legacy',
    coordinates: { latitudeDeg: -88.50, longitudeDeg: 271.00, convention: 'IAU MOON_ME' },
    elevationMeters: 2980,
    description: 'Eastern rim crest of de Gerlache crater.',
    officialReference: 'NASA Artemis III August 2022 Announcement (13 Regions)',
  },
  {
    id: 'faustini-rim-a',
    name: 'Faustini Rim A',
    epoch: '2022-legacy',
    coordinates: { latitudeDeg: -87.10, longitudeDeg: 67.00, convention: 'IAU MOON_ME' },
    elevationMeters: 2710,
    description: 'Elevated northwestern rim massif of Faustini crater overlooking deep cold traps.',
    officialReference: 'NASA Artemis III August 2022 Announcement (13 Regions)',
  },
];

export const CLPS_BENCHMARK_SITES: readonly DualEpochCatalogSite[] = [
  {
    id: 'clps-im1-odysseus',
    name: 'Intuitive Machines IM-1 (Odysseus)',
    epoch: 'clps-commercial',
    coordinates: { latitudeDeg: -80.13, longitudeDeg: 345.56, convention: 'IAU MOON_ME' },
    elevationMeters: -250,
    description: 'Malapert A crater touchdown site of Intuitive Machines Nova-C Odysseus lander (Feb 2024).',
    officialReference: 'NASA CLPS TO-2IM Mission Archive',
  },
  {
    id: 'clps-im2-athena',
    name: 'Intuitive Machines IM-2 (Athena)',
    epoch: 'clps-commercial',
    coordinates: { latitudeDeg: -89.30, longitudeDeg: 0.00, convention: 'IAU MOON_ME' },
    elevationMeters: 1450,
    description: 'Shackleton Connecting Ridge polar drill targeting subsurface volatile ice.',
    officialReference: 'NASA CLPS PRIME-1 Payload Delivery',
  },
  {
    id: 'clps-im4-nova-c',
    name: 'Intuitive Machines IM-4 (Nova-C)',
    epoch: 'clps-commercial',
    coordinates: { latitudeDeg: -84.90, longitudeDeg: 35.00, convention: 'IAU MOON_ME' },
    elevationMeters: 3100,
    description: 'South polar south rim target delivery for ESA Package for Resource Observation and in-Situ Prospecting for Exploration, Commercial exploitation and Transportation (PROSPECT).',
    officialReference: 'NASA CLPS CP-22 Delivery',
  },
  {
    id: 'clps-astrobotic-griffin-1',
    name: 'Astrobotic Griffin 1 (Nobile Crater)',
    epoch: 'clps-commercial',
    coordinates: { latitudeDeg: -85.20, longitudeDeg: 53.50, convention: 'IAU MOON_ME' },
    elevationMeters: 3800,
    description: 'NASA CLPS TO-20A heavy lander delivering Venturi Astrolab FLIP rover and ESA LandCam-X to Nobile rim.',
    officialReference: 'NASA CLPS TO-20A Flight Manifest (Falcon Heavy 2026)',
    isPrimaryArtemisCandidate: true,
  },
  {
    id: 'clps-im3-reiner-gamma',
    name: 'Intuitive Machines IM-3 (Reiner Gamma)',
    epoch: 'clps-commercial',
    coordinates: { latitudeDeg: 7.50, longitudeDeg: 301.00, convention: 'IAU MOON_ME' },
    elevationMeters: -1900,
    description: 'NASA CLPS CP-11 mission deploying Lunar Vertex magnetometer suite and CADRE rovers to investigate lunar swirl.',
    officialReference: 'NASA CLPS CP-11 Payload Delivery',
  },
  {
    id: 'clps-blue-moon-mk1',
    name: 'Blue Origin Blue Moon MK1 (Pathfinder 1)',
    epoch: 'clps-commercial',
    coordinates: { latitudeDeg: -89.44, longitudeDeg: 222.10, convention: 'IAU MOON_ME' },
    elevationMeters: 1820,
    description: 'Commercial lunar pathfinder cargo lander testing BE-7 cryogenic engine and high-rate DTE Ka-band link.',
    officialReference: 'NASA CLPS Pathfinder Flight Manifest',
  },
];

/**
 * Authoritative candidate landing sites from Wueller et al. (2026).
 * Synthetic client-side synthesis loop eliminated in Milestone M4; served exclusively via backend REST.
 */
export const WUELLER_2026_CANDIDATE_LANDING_SITES: readonly DualEpochCatalogSite[] = [];

export function getAllUnifiedCatalogSites(): readonly DualEpochCatalogSite[] {
  return [
    ...ARTEMIS_2024_CONFIRMED_REGIONS,
    ...ARTEMIS_2022_LEGACY_REGIONS.filter(
      (leg) => !ARTEMIS_2024_CONFIRMED_REGIONS.some((conf) => conf.id === leg.id)
    ),
    ...CLPS_BENCHMARK_SITES,
  ];
}

export function findUnifiedCatalogSite(idOrAlias: string): DualEpochCatalogSite | undefined {
  const norm = idOrAlias.trim().toLowerCase();
  const all = getAllUnifiedCatalogSites();
  return all.find(
    (s) =>
      s.id.toLowerCase() === norm ||
      s.name.toLowerCase() === norm ||
      (s.siteDesignation && s.siteDesignation.toLowerCase() === norm)
  );
}

import { z } from 'zod';

export const siteCategoryEnum = z.enum([
  'artemis-iii-2024',
  'artemis-2024',
  'polar-benchmark',
  'clps',
  'historic',
  'all',
]);
export const siteCategorySchema = siteCategoryEnum;
export type SiteCategory = z.infer<typeof siteCategoryEnum>;

export const sitePriorityEnum = z.enum([
  'Artemis III Candidate',
  'VIPER Target Region',
  'Permanent Shadow Boundary',
  'Benchmark Calibration Site',
  'CLPS Commercial Mission',
  'Historic Reference Baseline',
]);
export type CandidateSitePriority = z.infer<typeof sitePriorityEnum> | string;

export const candidateEntityTypeEnum = z.enum([
  'candidate-point',
  'region-centroid',
  'custom-point',
]);
export type CandidateEntityType = z.infer<typeof candidateEntityTypeEnum> | string;

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

export const siteQuerySchema = z.object({
  category: siteCategoryEnum.optional(),
  tier: siteCategoryEnum.optional(),
});
export type SiteQuery = z.infer<typeof siteQuerySchema>;

export const lunarCoordinatesSchema = z.object({
  latitudeDeg: z.number(),
  longitudeDeg: z.number(),
  elevationMeters: z.number(),
  convention: z.string().optional(),
});
export type LunarCoordinates = z.infer<typeof lunarCoordinatesSchema>;

export const candidateSiteSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  coordinates: lunarCoordinatesSchema,
  priority: z.string(),
  description: z.string(),
  category: z.string().optional(),
  meanTerrainHorizonDeg: z.number().optional(),
  maxTerrainObstructionDeg: z.number().optional(),
  coverageStatus: z.string().optional(),
  isDemoFixture: z.boolean().optional(),
  sourceCatalog: z.string().optional(),
  catalogVersion: z.string().optional(),
  entityType: z.string().optional(),
  officialRegionReference: z.string().optional(),
  missionContextNote: z.string().optional(),
});
export type CandidateSite = z.infer<typeof candidateSiteSchema>;
export type CandidateSiteDto = CandidateSite;

// Canonical SiteSchema aliases
export const SiteSchema = candidateSiteSchema;
export type Site = CandidateSite;

export const siteCatalogMetadataSchema = z.object({
  catalogName: z.string(),
  catalogVersion: z.string(),
  lineage: z.string(),
  officialUpdateNotice: z.string().optional(),
  coordinateConvention: z.string(),
  elevationDatum: z.string(),
  totalSites: z.number(),
  filteredCount: z.number(),
  activeFilter: z
    .object({
      category: z.string().optional(),
      tier: z.string().optional(),
    })
    .optional(),
});
export type SiteCatalogMetadata = z.infer<typeof siteCatalogMetadataSchema>;

export const siteCatalogResponseSchema = z.object({
  metadata: siteCatalogMetadataSchema,
  sites: z.array(candidateSiteSchema),
});
export type SiteCatalogResponse = z.infer<typeof siteCatalogResponseSchema>;

// Canonical SitesListResponseSchema and SitesRegistryResponseSchema aliases
export const SitesListResponseSchema = siteCatalogResponseSchema;
export type SitesListResponse = SiteCatalogResponse;
export const SitesRegistryResponseSchema = siteCatalogResponseSchema;
export type SitesRegistryResponse = SiteCatalogResponse;

export const reconnaissanceLinksSchema = z.object({
  moonTrekUrl: z.string().url(),
  svsIlluminationUrl: z.string().url(),
  lpiAtlasUrl: z.string().url(),
  pdsGeosciencesUrl: z.string().url(),
});
export type ReconnaissanceLinks = z.infer<typeof reconnaissanceLinksSchema>;

export const coordinateDatumSchema = z.object({
  coordinateFrame: z.string(),
  elevationDatum: z.string(),
  lineage: z.string(),
});
export type CoordinateDatum = z.infer<typeof coordinateDatumSchema>;

export * from './siteInvestigation';
import {
  scientificSiteInvestigationSchema,
  type ScientificSiteInvestigation,
} from './siteInvestigation';

export const siteDetailResponseSchema = z.object({
  site: candidateSiteSchema,
  investigation: scientificSiteInvestigationSchema,
  reconnaissanceLinks: reconnaissanceLinksSchema,
  datum: coordinateDatumSchema,
});
export type SiteDetailResponse = z.infer<typeof siteDetailResponseSchema>;
export const SiteDetailResponseSchema = siteDetailResponseSchema;

// Re-export backward-compatible catalog fixtures
export * from './siteCatalogFixture';

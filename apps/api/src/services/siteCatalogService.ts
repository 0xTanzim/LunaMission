/**
 * Lunar Landing Site Catalog Service
 *
 * Provides schema-validated catalog querying, category/tier filtering,
 * scientific site investigation aggregation (with 48-point LOLA altimetry),
 * official NASA reconnaissance links, and IAU/LOLA coordinate datums.
 */

import {
  CANDIDATE_SITES,
  CATALOG_METADATA,
  getFilteredCandidateSites,
  getSiteById,
  type SiteCatalogFilter,
} from '../data/catalog';
import { getScientificSiteInvestigation } from '../data/scientificSiteData';
import type {
  SiteCatalogResponse,
  SiteDetailResponse,
  SiteQuery,
} from '@luna/contracts';

export class SiteCatalogService {
  /**
   * Retrieves candidate landing sites filtered by mission category or tier.
   * Attaches full catalog lineage and IAU/LOLA coordinate reference metadata.
   */
  getSites(query?: SiteQuery): SiteCatalogResponse {
    const rawFilter = query?.category || query?.tier || 'all';
    const filter = (rawFilter === 'artemis-2024' ? 'artemis-iii-2024' : rawFilter) as SiteCatalogFilter;

    const filteredSites = getFilteredCandidateSites(filter);

    return {
      metadata: {
        catalogName: CATALOG_METADATA.catalogName,
        catalogVersion: CATALOG_METADATA.catalogVersion,
        lineage: CATALOG_METADATA.lineage,
        officialUpdateNotice: CATALOG_METADATA.officialUpdateNotice,
        coordinateConvention: CATALOG_METADATA.coordinateConvention,
        elevationDatum: CATALOG_METADATA.elevationDatum,
        totalSites: CANDIDATE_SITES.length,
        filteredCount: filteredSites.length,
        activeFilter: query?.category || query?.tier ? { category: query.category, tier: query.tier } : undefined,
      },
      sites: filteredSites.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        coordinates: {
          latitudeDeg: s.coordinates.latitudeDeg,
          longitudeDeg: s.coordinates.longitudeDeg,
          elevationMeters: s.coordinates.elevationMeters,
          convention: s.coordinates.convention,
        },
        priority: s.priority,
        description: s.description,
        category: s.category,
        meanTerrainHorizonDeg: s.meanTerrainHorizonDeg,
        maxTerrainObstructionDeg: s.maxTerrainObstructionDeg,
        coverageStatus: s.coverageStatus,
        isDemoFixture: s.isDemoFixture,
        sourceCatalog: s.sourceCatalog,
        catalogVersion: s.catalogVersion,
        entityType: s.entityType,
        officialRegionReference: s.officialRegionReference,
        missionContextNote: s.missionContextNote,
      })),
    };
  }

  /**
   * Retrieves exhaustive scientific profile, 48-point LOLA elevation profile,
   * deep NASA reconnaissance links, and IAU 2000 ME coordinate datum for a site.
   * Returns null if site ID does not exist in catalog.
   */
  getSiteDetail(id: string): SiteDetailResponse | null {
    const site = getSiteById(id);
    if (!site) {
      return null;
    }

    const investigation = getScientificSiteInvestigation(id);
    if (!investigation) {
      return null;
    }

    const lat = site.coordinates.latitudeDeg;
    const lon = site.coordinates.longitudeDeg;

    return {
      site: {
        id: site.id,
        code: site.code,
        name: site.name,
        coordinates: {
          latitudeDeg: site.coordinates.latitudeDeg,
          longitudeDeg: site.coordinates.longitudeDeg,
          elevationMeters: site.coordinates.elevationMeters,
          convention: site.coordinates.convention,
        },
        priority: site.priority,
        description: site.description,
        category: site.category,
        meanTerrainHorizonDeg: site.meanTerrainHorizonDeg,
        maxTerrainObstructionDeg: site.maxTerrainObstructionDeg,
        coverageStatus: site.coverageStatus,
        isDemoFixture: site.isDemoFixture,
        sourceCatalog: site.sourceCatalog,
        catalogVersion: site.catalogVersion,
        entityType: site.entityType,
        officialRegionReference: site.officialRegionReference,
        missionContextNote: site.missionContextNote,
      },
      investigation,
      reconnaissanceLinks: {
        moonTrekUrl: `https://trek.nasa.gov/moon/index.html?v=${lat},${lon},128ppd`,
        svsIlluminationUrl: 'https://svs.gsfc.nasa.gov/5127',
        lpiAtlasUrl: 'https://www.lpi.usra.edu/lunar/lunar-south-pole-atlas/',
        pdsGeosciencesUrl: 'https://pds-geosciences.wustl.edu/lro/',
      },
      datum: {
        coordinateFrame: 'IAU/IAG Lunar Mean Earth / Polar Axis (ME)',
        elevationDatum: 'Reference lunar sphere of R = 1737.4 km (LOLA DEM 128ppd)',
        lineage: 'NASA Artemis 2024 candidate regions, CLPS mission flight manifests, and Apollo/CNSA ground truth baselines',
      },
    };
  }
}

export const siteCatalogService = new SiteCatalogService();

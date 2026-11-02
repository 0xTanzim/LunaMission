/**
 * What the map can honestly say about an arbitrary clicked point.
 *
 * The map paints five separate things on one coordinate: where it is, how high the
 * surface is, how steep it is, which data products cover it, and whether anything can be
 * evaluated there. This module derives exactly those five facts from the domain layers
 * that already own them — the projection config for the sheet, the LOLA sampler for the
 * terrain, the candidate catalogue for evaluability — so the inspector never computes.
 */

import { DEFAULT_PROJECTION_CONFIG, type SelenographicCoordinate } from '@/domain/coordinates/projection';
import { sampleTerrainAtLatLon } from '@/domain/terrain/lolaSouthPoleDemSampler';
import { getSiteEvaluability, type SiteEvaluability } from '@/domain/sites/catalog';
import { nearestCandidate } from './mapPointAnalysis';
import type { CandidateSite } from '@/domain/sites/candidateSite';

/** Which published product covers the point, and whether a horizon profile exists there. */
export interface PointCoverage {
  /** The DEM product painted by the base layer. */
  readonly demProduct: string;
  /** False when the coordinate lies outside the 83°S–90°S sheet the map paints. */
  readonly insidePaintedSheet: boolean;
  /** A registered candidate must have a LOLA horizon profile; an arbitrary point has none. */
  readonly horizonProfile: 'registered-site' | 'none';
  /** One sentence stating the coverage consequence. */
  readonly note: string;
}

export interface PointEvaluability {
  /** `evaluable` only where a registered candidate site sits on the point. */
  readonly status: SiteEvaluability | 'inspection-only';
  readonly label: string;
  readonly reason: string;
  readonly siteId?: string;
  readonly siteCode?: string;
  readonly siteEvaluability?: SiteEvaluability;
}

export interface MapPointFacts {
  readonly coordinate: SelenographicCoordinate;
  /** LOLA DEM elevation at the point, metres relative to R = 1737.4 km. */
  readonly elevationMeters: number;
  /** Altimetric slope at the point, degrees from horizontal. */
  readonly slopeDeg: number;
  /** Permanently shadowed at this coordinate, per the terrain sampler. */
  readonly isPermanentlyShadowed: boolean;
  readonly coverage: PointCoverage;
  readonly evaluability: PointEvaluability;
  readonly nearestSite: CandidateSite;
  readonly nearestDistanceKm: number;
}

/** Same point to within a quarter of a kilometre: a catalogue site, not a nearby one. */
const SAME_POINT_KM = 0.25;

const DEM_PRODUCT = 'LRO LOLA 128 ppd south-polar DEM (83°S–90°S sheet)';

function insidePaintedSheet(latitudeDeg: number): boolean {
  const { minLatitudeDeg, maxLatitudeDeg } = DEFAULT_PROJECTION_CONFIG;
  return latitudeDeg <= minLatitudeDeg && latitudeDeg >= maxLatitudeDeg;
}

/**
 * Read the point facts for a clicked coordinate.
 *
 * Nothing here depends on the ephemeris: what the inspector claims about terrain, coverage
 * and evaluability is independent of the instant being viewed.
 */
export function readMapPointFacts(
  coordinate: SelenographicCoordinate,
  siteCatalog: readonly CandidateSite[],
): MapPointFacts {
  const sample = sampleTerrainAtLatLon(coordinate.latitudeDeg, coordinate.longitudeDeg);
  const { site: nearestSite, distanceKm: nearestDistanceKm } = nearestCandidate(
    coordinate,
    siteCatalog.length > 0 ? [...siteCatalog] : undefined,
  );

  const insideSheet = insidePaintedSheet(coordinate.latitudeDeg);
  const samePoint = nearestDistanceKm <= SAME_POINT_KM;
  const siteEvaluability = getSiteEvaluability(nearestSite.id);

  const coverage: PointCoverage = {
    demProduct: DEM_PRODUCT,
    insidePaintedSheet: insideSheet,
    horizonProfile: samePoint ? 'registered-site' : 'none',
    note: insideSheet
      ? 'Inside the painted polar sheet: elevation and slope come from the LOLA polar DEM sampler.'
      : 'Outside the painted 83°S–90°S sheet: the sampler extrapolates here, so treat elevation and slope as indicative only.',
  };

  const evaluability: PointEvaluability = samePoint
    ? {
        status: siteEvaluability ?? 'catalogue-only',
        label: siteEvaluability === 'evaluable' ? 'Evaluable candidate site' : 'Catalogue-only region',
        reason:
          siteEvaluability === 'evaluable'
            ? `This coordinate coincides with ${nearestSite.code} (${nearestSite.name}), which holds a registered LOLA horizon profile and can be evaluated.`
            : `This coordinate coincides with ${nearestSite.code}, a published catalogue region with no registered horizon profile, so the evaluation API cannot score it.`,
        siteId: nearestSite.id,
        siteCode: nearestSite.code,
        siteEvaluability: siteEvaluability ?? 'catalogue-only',
      }
    : {
        status: 'inspection-only',
        label: 'Inspection only',
        reason:
          'Not a catalogue region: the evaluation endpoints answer for registered candidate sites only. Promote the point to a custom target to evaluate its geometry.',
      };

  return {
    coordinate,
    elevationMeters: sample.elevationMeters,
    slopeDeg: sample.slopeDeg,
    isPermanentlyShadowed: sample.isPermanentlyShadowed,
    coverage,
    evaluability,
    nearestSite,
    nearestDistanceKm,
  };
}

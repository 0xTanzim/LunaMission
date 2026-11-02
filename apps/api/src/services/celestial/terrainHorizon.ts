/** Azimuth-dependent local horizon angle relative to the mean lunar sphere. */

import type { CandidateSite, CalculationMode } from '@luna/contracts';
import { LUNAR_MEAN_RADIUS_KM } from '../utils/astronomyConstants';

/**
 * Estimates local terrain horizon elevation profile angle (degrees) for a given site at a specified azimuth.
 * In a real mission, this is sampled from high-resolution LOLA/Kaguya DEM ray tracing.
 */
export function getLocalTerrainHorizonDeg(site: CandidateSite, azimuthDeg: number, mode: CalculationMode): number {
  if (mode === 'geometry-only') {
    return 0.0; // Mean sphere mathematical horizon
  }

  // Terrain-aware:
  // Elevated rim sites have a dip horizon (negative base elevation angle relative to mean sphere)
  // because the observer looks downward to the lower surrounding basin or plains.
  // Base dip angle in degrees for elevation h (meters) above mean radius (1737.4 km):
  // dip angle ≈ -sqrt(2 * h / R) * (180 / PI)
  const hKm = Math.max(0, site.coordinates.elevationMeters) / 1000;
  const dipDeg = -Math.sqrt((2 * hKm) / LUNAR_MEAN_RADIUS_KM) * (180 / Math.PI);

  // Verified site mean terrain horizon obstruction without procedural trigonometric synthesis
  const effectiveHorizon = dipDeg + (site.meanTerrainHorizonDeg ?? 0);
  return Number(effectiveHorizon.toFixed(2));
}

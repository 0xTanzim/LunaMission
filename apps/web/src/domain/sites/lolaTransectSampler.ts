/**
 * Dynamic Altimetric Transect Generator (NASA LOLA DEM)
 *
 * Evaluates real-time, high-fidelity topographic cross-sections along candidate
 * landing site ridges and crater rims using the LOLA 128ppd elevation model.
 * Replaces static hardcoded curves with continuous analytical measurements.
 */

import { sampleTerrainAtLatLon } from '@/domain/terrain/lolaSouthPoleDemSampler';
import { LUNAR_MEAN_RADIUS_KM } from '@/domain/constants/astronomy';

export interface TransectPoint {
  distKm: number;
  elevationMeters: number;
  slopeDeg: number;
  hazardTier: 'safe' | 'caution' | 'hazard';
  isPsr: boolean;
  latDeg: number;
  lonDeg: number;
}

export interface SiteTransectProfile {
  siteId: string;
  totalDistanceKm: number;
  points: TransectPoint[];
  summitElevationMeters: number;
  minElevationMeters: number;
  reliefSpanMeters: number;
  meanSlopeDeg: number;
  maxSlopeDeg: number;
  traversablePct: number; // percentage of points with slope < 15°
  transectAzimuthDeg: number;
}

/**
 * Computes destination latitude and longitude given start point, distance (km), and bearing (deg).
 */
function travelGreatCircle(
  latDeg: number,
  lonDeg: number,
  distanceKm: number,
  bearingDeg: number,
): { latDeg: number; lonDeg: number } {
  const angularDist = distanceKm / LUNAR_MEAN_RADIUS_KM;
  const radLat = (latDeg * Math.PI) / 180;
  const radLon = (lonDeg * Math.PI) / 180;
  const radBearing = (bearingDeg * Math.PI) / 180;

  const sinDestLat =
    Math.sin(radLat) * Math.cos(angularDist) +
    Math.cos(radLat) * Math.sin(angularDist) * Math.cos(radBearing);
  const destLat = Math.asin(Math.max(-1, Math.min(1, sinDestLat)));

  const y = Math.sin(radBearing) * Math.sin(angularDist) * Math.cos(radLat);
  const x = Math.cos(angularDist) - Math.sin(radLat) * Math.sin(destLat);
  const destLon = radLon + Math.atan2(y, x);

  let outLonDeg = (destLon * 180) / Math.PI;
  outLonDeg = ((outLonDeg % 360) + 360) % 360;
  const outLatDeg = Math.max(-89.99, Math.min(-80.0, (destLat * 180) / Math.PI));

  return { latDeg: outLatDeg, lonDeg: outLonDeg };
}

/**
 * Generates an authentic 25 km topographic cross-section centered on a candidate site.
 * Transect cuts perpendicular or along the local crater rim bearing.
 */
export function generateSiteTransect(
  siteId: string,
  centerLatDeg: number,
  centerLonDeg: number,
  transectLengthKm = 24.0,
  stepCount = 48,
): SiteTransectProfile {
  // Use a stable, representative ridge-cutting bearing (radial or transverse to South Pole)
  const bearingDeg = (centerLonDeg + 90) % 360;
  const halfSpanKm = transectLengthKm / 2;
  const startOffsetKm = -halfSpanKm;
  const stepKm = transectLengthKm / (stepCount - 1);

  const points: TransectPoint[] = [];
  let maxElev = -Infinity;
  let minElev = Infinity;
  let sumSlope = 0;
  let maxSlope = 0;
  let traversableCount = 0;

  for (let i = 0; i < stepCount; i++) {
    const currentOffsetKm = startOffsetKm + i * stepKm;
    // Travel along bearing if positive, or opposite bearing if negative
    const effectiveDistKm = Math.abs(currentOffsetKm);
    const effectiveBearing = currentOffsetKm >= 0 ? bearingDeg : (bearingDeg + 180) % 360;

    const { latDeg, lonDeg } = travelGreatCircle(
      centerLatDeg,
      centerLonDeg,
      effectiveDistKm,
      effectiveBearing,
    );

    const sample = sampleTerrainAtLatLon(latDeg, lonDeg);
    const elev = Math.round(sample.elevationMeters);
    const slope = Math.round(sample.slopeDeg * 10) / 10;

    if (elev > maxElev) maxElev = elev;
    if (elev < minElev) minElev = elev;
    sumSlope += slope;
    if (slope > maxSlope) maxSlope = slope;
    if (slope < 15.0) traversableCount++;

    const hazardTier: 'safe' | 'caution' | 'hazard' =
      slope < 10.0 ? 'safe' : slope <= 20.0 ? 'caution' : 'hazard';

    points.push({
      distKm: Math.round(i * stepKm * 10) / 10,
      elevationMeters: elev,
      slopeDeg: slope,
      hazardTier,
      isPsr: sample.isPermanentlyShadowed,
      latDeg: Math.round(latDeg * 1000) / 1000,
      lonDeg: Math.round(lonDeg * 10) / 10,
    });
  }

  const reliefSpanMeters = maxElev - minElev;
  const meanSlopeDeg = Math.round((sumSlope / stepCount) * 10) / 10;
  const traversablePct = Math.round((traversableCount / stepCount) * 100);

  return {
    siteId,
    totalDistanceKm: transectLengthKm,
    points,
    summitElevationMeters: maxElev,
    minElevationMeters: minElev,
    reliefSpanMeters,
    meanSlopeDeg,
    maxSlopeDeg: Math.round(maxSlope * 10) / 10,
    traversablePct,
    transectAzimuthDeg: Math.round(bearingDeg),
  };
}

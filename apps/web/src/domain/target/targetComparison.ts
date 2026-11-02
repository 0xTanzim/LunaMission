/**
 * Custom Target Benchmark Comparison Engine
 *
 * Computes great-circle distances, nearest candidate matching,
 * and multi-domain comparative deltas relative to baseline Artemis sites.
 */

import { LUNAR_MEAN_RADIUS_KM } from '@/domain/constants/astronomy';
import { getAllAvailableSites } from '@/domain/sites/catalog';
import { CandidateSite } from '@/domain/sites/candidateSite';
import {
  CustomLandingTarget,
  CustomTargetEvaluation,
  evaluateCustomTargetConditions,
  FeasibilityGrade,
  NearestCandidateMatch,
  TargetComparisonDeltas,
} from './customTargetModel';

/**
 * Computes great-circle geodesic distance in kilometers between two lunar points.
 */
export function calculateLunarGeodesicDistanceKm(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number,
): number {
  const phi1 = (lat1Deg * Math.PI) / 180;
  const phi2 = (lat2Deg * Math.PI) / 180;
  const deltaLon = ((lon2Deg - lon1Deg) * Math.PI) / 180;

  const cosC = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
  const angularDistRad = Math.acos(Math.max(-1, Math.min(1, cosC)));
  return angularDistRad * LUNAR_MEAN_RADIUS_KM;
}

/**
 * Finds the nearest authoritative candidate site in the 20-site catalog.
 */
export function findNearestCatalogCandidate(
  latDeg: number,
  lonDeg: number,
  catalog: CandidateSite[] = getAllAvailableSites(),
): NearestCandidateMatch {
  let closest = catalog[0];
  let minDistanceKm = Infinity;

  for (const candidate of catalog) {
    const dist = calculateLunarGeodesicDistanceKm(
      latDeg,
      lonDeg,
      candidate.coordinates.latitudeDeg,
      candidate.coordinates.longitudeDeg,
    );
    if (dist < minDistanceKm) {
      minDistanceKm = dist;
      closest = candidate;
    }
  }

  return {
    candidate: closest,
    distanceKm: minDistanceKm,
  };
}

/**
 * Computes delta comparison metrics between the custom target and a baseline candidate site.
 */
export function computeTargetComparisonDeltas(
  targetEval: CustomTargetEvaluation,
  baselineSite: CandidateSite,
  epochMs: number,
): TargetComparisonDeltas {
  const baselineTarget: CustomLandingTarget = {
    id: baselineSite.id,
    name: baselineSite.name,
    latitudeDeg: baselineSite.coordinates.latitudeDeg,
    longitudeDeg: baselineSite.coordinates.longitudeDeg,
    elevationKm: baselineSite.coordinates.elevationMeters / 1000.0,
    createdAt: 0,
  };

  const baselineEval = evaluateCustomTargetConditions(baselineTarget, epochMs);

  const distanceKm = calculateLunarGeodesicDistanceKm(
    targetEval.target.latitudeDeg,
    targetEval.target.longitudeDeg,
    baselineSite.coordinates.latitudeDeg,
    baselineSite.coordinates.longitudeDeg,
  );

  const deltaSun = targetEval.sunElevationDeg - baselineEval.sunElevationDeg;
  const deltaEarth = targetEval.earthElevationDeg - baselineEval.earthElevationDeg;
  const targetMargin = targetEval.telecom.linkMarginDb ?? -99.9;
  const baselineMargin = baselineEval.telecom.linkMarginDb ?? -99.9;
  const deltaMargin = targetMargin - baselineMargin;
  const deltaSlope = targetEval.slopeGradientDeg - baselineEval.slopeGradientDeg;
  const deltaIce = targetEval.volatiles.hydrogenWeightPercent - baselineEval.volatiles.hydrogenWeightPercent;

  let score = 50;
  if (targetEval.sunElevationDeg > 0) score += 20;
  else if (targetEval.sunElevationDeg > -1.5) score += 10;
  else score -= 15;

  if (targetEval.earthElevationDeg > 2.0) score += 20;
  else if (targetEval.earthElevationDeg > 0.0) score += 10;
  else score -= 25;

  if (targetEval.slopeGradientDeg < 10) score += 15;
  else if (targetEval.slopeGradientDeg < 15) score += 5;
  else score -= 20;

  score += Math.min(10, targetEval.volatiles.hydrogenWeightPercent * 20);
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let grade: FeasibilityGrade = 'VIABLE';
  if (clampedScore >= 75) grade = 'EXCELLENT';
  else if (clampedScore >= 50) grade = 'VIABLE';
  else if (clampedScore >= 30) grade = 'CONSTRAINED';
  else grade = 'HAZARDOUS';

  return {
    nearestSiteId: baselineSite.id,
    nearestSiteName: baselineSite.name,
    distanceKm,
    deltaSunElevationDeg: Math.round(deltaSun * 100) / 100,
    deltaEarthElevationDeg: Math.round(deltaEarth * 100) / 100,
    deltaMarginDb: Math.round(deltaMargin * 10) / 10,
    deltaSlopeDeg: Math.round(deltaSlope * 10) / 10,
    deltaIcePercent: Math.round(deltaIce * 1000) / 1000,
    feasibilityScore: clampedScore,
    feasibilityGrade: grade,
  };
}

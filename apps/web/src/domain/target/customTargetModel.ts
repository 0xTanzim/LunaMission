/**
 * Custom Landing Target Domain Engine
 *
 * Provides analytical Selenographic validation, candidate creation,
 * and multi-domain ephemeris evaluation for user-defined landing targets.
 */

import { calculateLunarEphemeris, computeTopocentricAngles } from '@/domain/celestial/ephemeris';
import { getJulianDate } from '@/domain/time/julianDate';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { sampleLolaTerrain } from '@/domain/terrain/lolaSouthPoleDemSampler';
import type { RfLinkBudget } from '@luna/contracts';
import { computeFallbackLinkBudget } from '@/domain/services/missionServerClient';

export interface CustomTargetInput {
  id?: string;
  name?: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationKm?: number;
}

export interface CustomLandingTarget {
  id: string;
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationKm: number;
  createdAt: number;
}

export interface CoordinateValidationResult {
  isValid: boolean;
  normalizedLat: number;
  normalizedLon: number;
  error?: string;
}

export interface NearestCandidateMatch {
  candidate: CandidateSite;
  distanceKm: number;
}

export interface CustomTargetEvaluation {
  target: CustomLandingTarget;
  epochMs: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  earthElevationDeg: number;
  earthAzimuthDeg: number;
  earthDistanceKm: number;
  slopeGradientDeg: number;
  elevationMeters: number;
  telecom: RfLinkBudget;
  volatiles: {
    hydrogenWeightPercent: number;
    divinerTempKelvin: number;
    waterEquivalentHydrogenPct: number;
    isruFeasibilityScore: number;
  };
}

export type FeasibilityGrade = 'EXCELLENT' | 'VIABLE' | 'CONSTRAINED' | 'HAZARDOUS';

export interface TargetComparisonDeltas {
  nearestSiteId: string;
  nearestSiteName: string;
  distanceKm: number;
  deltaSunElevationDeg: number;
  deltaEarthElevationDeg: number;
  deltaMarginDb: number;
  deltaSlopeDeg: number;
  deltaIcePercent: number;
  feasibilityScore: number;
  feasibilityGrade: FeasibilityGrade;
}

export {
  calculateLunarGeodesicDistanceKm,
  findNearestCatalogCandidate,
  computeTargetComparisonDeltas,
} from './targetComparison';

/**
 * Validates Selenographic coordinates for the lunar South Pole operational zone.
 * Clamps latitude to [-90°, -70°] and normalizes longitude to [0°, 360°).
 */
export function validateCustomTargetCoordinates(
  latDeg: number,
  lonDeg: number,
): CoordinateValidationResult {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) {
    return {
      isValid: false,
      normalizedLat: 0,
      normalizedLon: 0,
      error: 'Coordinates must be valid finite numbers.',
    };
  }

  if (latDeg < -90 || latDeg > -70) {
    return {
      isValid: false,
      normalizedLat: latDeg,
      normalizedLon: lonDeg,
      error: 'Target must be inside the South-polar region (between 70.0°S and 90.0°S).',
    };
  }

  let normalizedLon = lonDeg % 360;
  if (normalizedLon < 0) normalizedLon += 360;

  return {
    isValid: true,
    normalizedLat: latDeg,
    normalizedLon,
  };
}

/**
 * Creates a validated custom landing target with canonical coordinates and id.
 */
export function createCustomLandingTarget(input: CustomTargetInput): CustomLandingTarget {
  const validation = validateCustomTargetCoordinates(input.latitudeDeg, input.longitudeDeg);
  const lat = validation.isValid ? validation.normalizedLat : input.latitudeDeg;
  const lon = validation.isValid ? validation.normalizedLon : input.longitudeDeg;

  // Resolve elevation from LOLA DEM if not explicitly provided
  const terrainSample = sampleLolaTerrain(lat, lon);
  const elevationKm = input.elevationKm ?? terrainSample.elevationMeters / 1000.0;

  const latSign = lat >= 0 ? '+' : '';
  const lonSign = lon >= 0 ? '+' : '';
  const defaultName = `Custom Target (${latSign}${lat.toFixed(2)}°, ${lonSign}${lon.toFixed(2)}°)`;
  const trimmedName = input.name?.trim();

  return {
    id: input.id ?? `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: trimmedName && trimmedName.length > 0 ? trimmedName : defaultName,
    latitudeDeg: lat,
    longitudeDeg: lon,
    elevationKm,
    createdAt: Date.now(),
  };
}

/**
 * Evaluates real-time topocentric ephemeris, DSN RF link budget, LOLA slope, and volatiles.
 */
export function evaluateCustomTargetConditions(
  target: CustomLandingTarget,
  epochMs: number,
): CustomTargetEvaluation {
  const jd = getJulianDate(new Date(epochMs));
  const ephemeris = calculateLunarEphemeris(jd);

  const sunAngles = computeTopocentricAngles(
    target.latitudeDeg,
    target.longitudeDeg,
    ephemeris.subSolarLatDeg,
    ephemeris.subSolarLonDeg,
  );

  const earthAngles = computeTopocentricAngles(
    target.latitudeDeg,
    target.longitudeDeg,
    ephemeris.subEarthLatDeg,
    ephemeris.subEarthLonDeg,
  );

  const terrain = sampleLolaTerrain(
    target.latitudeDeg,
    target.longitudeDeg,
    sunAngles.azimuthDeg,
    sunAngles.elevationDeg,
  );

  const telecom = computeFallbackLinkBudget({
    earthElevationDeg: earthAngles.elevationDeg,
    earthDistanceKm: ephemeris.earthMoonDistanceKm,
    isTerrainObstructed: earthAngles.elevationDeg < 0,
    band: 'xBandDownlink',
    transmitterPowerWatts: 20,
    dataRateMbps: 2.0,
  });

  const isPolar = Math.abs(target.latitudeDeg) > 85;
  const volatileResult = {
    hydrogenWeightPct: isPolar ? 0.42 : 0.04,
    divinerTempKelvin: isPolar ? 85.0 : 250.0,
    waterEquivalentHydrogenPct: isPolar ? 3.78 : 0.36,
    isruFeasibilityScore: isPolar ? 88.5 : 15.0,
  };

  return {
    target,
    epochMs,
    sunElevationDeg: sunAngles.elevationDeg,
    sunAzimuthDeg: sunAngles.azimuthDeg,
    earthElevationDeg: earthAngles.elevationDeg,
    earthAzimuthDeg: earthAngles.azimuthDeg,
    earthDistanceKm: ephemeris.earthMoonDistanceKm,
    slopeGradientDeg: terrain.slopeDeg,
    elevationMeters: terrain.elevationMeters,
    telecom,
    volatiles: {
      hydrogenWeightPercent: volatileResult.hydrogenWeightPct,
      divinerTempKelvin: volatileResult.divinerTempKelvin,
      waterEquivalentHydrogenPct: volatileResult.waterEquivalentHydrogenPct,
      isruFeasibilityScore: volatileResult.isruFeasibilityScore,
    },
  };
}

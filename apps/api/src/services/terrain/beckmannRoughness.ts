/**
 * Beckmann Surface Roughness & Geotechnical Hazard Model
 *
 * Implements the Beckmann-Spizzichino radar scattering / topography roughness model
 * (Simpson & Tyler 1982, Shepard et al., NASA Artemis HLS landing site assessment).
 *
 * Formulas:
 * - Height standard deviation: sigma_h = sqrt( (1/N) * sum( (h_i - mean_h)^2 ) )
 * - RMS slope parameter: s = tan(beta_0) = sqrt(2) * sigma_h / L
 * - RMS slope angle: theta_0 = arctan(s) * (180 / PI) [degrees]
 *
 * Calibration:
 * - Smooth highlands: theta_0 < 5.0 deg (s < 0.087)
 * - Moderate rolling plains: 5.0 <= theta_0 < 10.0 deg (0.087 <= s < 0.176)
 * - Rough blocky ejecta: 10.0 <= theta_0 < 15.0 deg (0.176 <= s < 0.268)
 * - Hazardous / tip-over: theta_0 >= 15.0 deg (s >= 0.268) or slope >= 15.0 deg
 */

import { sampleLolaTerrain, sampleLolaElevationAtLatLon } from './lolaSouthPoleDemSampler';
import { LUNAR_MEAN_RADIUS_KM } from '../utils/astronomyConstants';
import type {
  RoughnessHazardLevel,
  TerrainSafetyRecommendation as SafetyRecommendation,
  BeckmannRoughnessStats,
  SlopeRoughnessResult,
} from '@luna/contracts';

export type {
  RoughnessHazardLevel,
  SafetyRecommendation,
  BeckmannRoughnessStats,
  SlopeRoughnessResult,
};

export function evaluateRoughnessHazard(
  roughnessTheta0Deg: number,
): { hazardLevel: RoughnessHazardLevel; recommendation: SafetyRecommendation } {
  if (roughnessTheta0Deg < 5.0) {
    return { hazardLevel: 'SMOOTH', recommendation: 'GO' };
  }
  if (roughnessTheta0Deg < 10.0) {
    return { hazardLevel: 'MODERATE', recommendation: 'GO' };
  }
  if (roughnessTheta0Deg < 15.0) {
    return { hazardLevel: 'ROUGH', recommendation: 'CAUTION' };
  }
  return { hazardLevel: 'HAZARDOUS', recommendation: 'ABORT' };
}

export function calculateBeckmannFromStats(
  sigmaH: number,
  correlationLengthL: number,
): BeckmannRoughnessStats {
  const safeL = Math.max(correlationLengthL, 0.001);
  const safeSigma = Math.max(sigmaH, 0);
  const rmsSlope_s = (Math.SQRT2 * safeSigma) / safeL;
  const roughnessTheta0Deg = (Math.atan(rmsSlope_s) * 180) / Math.PI;

  const { hazardLevel, recommendation } = evaluateRoughnessHazard(roughnessTheta0Deg);

  let description: string;
  switch (hazardLevel) {
    case 'SMOOTH':
      description = 'Smooth highland regolith; minimal touchdown hazard';
      break;
    case 'MODERATE':
      description = 'Rolling undulating plains; nominal landing risk';
      break;
    case 'ROUGH':
      description = 'Blocky ejecta or steep micro-relief; caution advised';
      break;
    case 'HAZARDOUS':
      description = 'Severe micro-roughness exceeding lander tolerance';
      break;
  }

  return {
    rmsSlope_s: Number(rmsSlope_s.toFixed(4)),
    roughnessTheta0Deg: Number(roughnessTheta0Deg.toFixed(2)),
    hazardLevel,
    recommendation,
    sigmaH: Number(safeSigma.toFixed(3)),
    correlationLengthL: Number(safeL.toFixed(1)),
    description,
  };
}

export const calculateBeckmannRoughness = calculateBeckmannFromStats;

export function calculateBeckmannFromElevations(
  elevations: number[],
  stepSizeMeters: number,
): BeckmannRoughnessStats {
  if (elevations.length < 2) {
    return calculateBeckmannFromStats(0, stepSizeMeters);
  }

  const n = elevations.length;
  const mean = elevations.reduce((sum, val) => sum + val, 0) / n;
  const variance = elevations.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n;
  const sigmaH = Math.sqrt(variance);
  const correlationLengthL = Math.max(stepSizeMeters * (n - 1), 1.0);

  return calculateBeckmannFromStats(sigmaH, correlationLengthL);
}

/**
 * Evaluates local slope and Beckmann surface roughness around a specific lunar coordinate
 * using the LOLA digital elevation model.
 */
export function calculateSlopeRoughnessAtCoordinates(
  latDeg: number,
  lonDeg: number,
  sampleRadiusMeters = 50,
): SlopeRoughnessResult {
  const centerSample = sampleLolaTerrain(latDeg, lonDeg);
  const slopeDeg = centerSample.slopeDeg;

  // Angular offset in degrees for sample radius on Moon (R = 1737.4 km)
  const radiusKm = sampleRadiusMeters / 1000.0;
  const dLatDeg = (radiusKm / LUNAR_MEAN_RADIUS_KM) * (180 / Math.PI);
  const cosLat = Math.max(Math.cos((latDeg * Math.PI) / 180), 0.01);
  const dLonDeg = dLatDeg / cosLat;

  // Sample 8 cardinal and diagonal ring points around target
  const offsets = [
    [dLatDeg, 0],
    [-dLatDeg, 0],
    [0, dLonDeg],
    [0, -dLonDeg],
    [dLatDeg * 0.707, dLonDeg * 0.707],
    [dLatDeg * 0.707, -dLonDeg * 0.707],
    [-dLatDeg * 0.707, dLonDeg * 0.707],
    [-dLatDeg * 0.707, -dLonDeg * 0.707],
  ];

  const ringElevations = offsets.map(([oLat, oLon]) =>
    sampleLolaElevationAtLatLon(latDeg + oLat, lonDeg + oLon),
  );
  ringElevations.push(centerSample.elevationMeters);

  const stats = calculateBeckmannFromElevations(ringElevations, sampleRadiusMeters);
  const isTipOverHazard = slopeDeg >= 15.0;

  let recommendation: SafetyRecommendation = stats.recommendation;
  if (isTipOverHazard) {
    recommendation = 'ABORT';
  } else if (slopeDeg >= 10.0 && recommendation === 'GO') {
    recommendation = 'CAUTION';
  }

  return {
    slopeDeg: Number(slopeDeg.toFixed(2)),
    rmsSlope_s: stats.rmsSlope_s,
    beckmannRoughnessTheta0Deg: stats.roughnessTheta0Deg,
    isTipOverHazard,
    roughnessHazard: stats.hazardLevel,
    recommendation,
    elevationMeters: centerSample.elevationMeters,
  };
}

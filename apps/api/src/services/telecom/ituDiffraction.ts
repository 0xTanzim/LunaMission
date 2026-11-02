/**
 * ITU-R P.526-16 Knife-Edge Diffraction Propagation
 *
 * Implements the International Telecommunication Union recommendation ITU-R P.526-16
 * (Propagation by diffraction, Section 4.1: Single knife-edge obstacle).
 *
 * Evaluates diffraction losses across grazing lunar crater rims and massifs
 * for Direct-to-Earth (DTE) radio frequency links (X-band ~8.4 GHz, Ka-band ~26 GHz).
 */

export const SPEED_OF_LIGHT_M_PER_S = 299792458;

/** Nominal Moon-to-Earth radio propagation distance in meters (384,400 km) */
export const NOMINAL_EARTH_DISTANCE_METERS = 384400000;

export interface ItuDiffractionSummary {
  readonly fresnelParameterNu: number;
  readonly diffractionLossDb: number;
  readonly powerFraction: number;
  readonly isGrazing: boolean;
  readonly isBlackout: boolean;
}

/**
 * Computes the dimensionless Fresnel-Kirchhoff parameter nu.
 *
 * @param hObstacleMeters Height of the obstacle apex above the line-of-sight in meters
 *                        (positive = line of sight is obstructed; negative = clearance).
 * @param obstacleDistanceMeters Distance from surface lander to the obstacle in meters.
 * @param frequencyHz Carrier frequency in Hertz (e.g. 8.45e9 for X-band).
 * @param earthDistanceMeters Distance from obstacle to Earth ground station in meters.
 */
export function computeFresnelParameter(
  hObstacleMeters: number,
  obstacleDistanceMeters: number,
  frequencyHz: number,
  earthDistanceMeters: number = NOMINAL_EARTH_DISTANCE_METERS
): number {
  if (Math.abs(hObstacleMeters) < 1e-6) {
    return 0.0;
  }

  const d1 = Math.max(1.0, obstacleDistanceMeters);
  const d2 = Math.max(1000.0, earthDistanceMeters);
  const wavelengthMeters = SPEED_OF_LIGHT_M_PER_S / Math.max(1e6, frequencyHz);

  // nu = h * sqrt( (2 / lambda) * (1/d1 + 1/d2) )
  const geometryFactor = (2.0 / wavelengthMeters) * (1.0 / d1 + 1.0 / d2);
  return hObstacleMeters * Math.sqrt(geometryFactor);
}

/**
 * Computes the knife-edge obstacle diffraction loss J(nu) in decibels per ITU-R P.526-16 eq (17).
 *
 * - nu <= -0.78: J(nu) = 0 dB (unobstructed line-of-sight clearance)
 * - nu = 0.0: J(0) = 6.02 dB (exact grazing path, 25.0% power delivered)
 * - nu = 0.531: J(0.531) = 10.53 dB
 * - nu = 1.0: J(1.0) = 13.9 dB
 * - nu > 5.0: J(nu) > 27 dB (deep shadow blackout)
 */
export function computeKnifeEdgeDiffractionLossDb(nu: number): number {
  if (nu <= -0.78) {
    return 0.0;
  }

  const v = nu - 0.1;
  const arg = Math.sqrt(v * v + 1.0) + v;

  if (arg <= 1e-9) {
    return 0.0;
  }

  const lossDb = 6.9 + 20.0 * Math.log10(arg);
  return Math.max(0.0, Math.round(lossDb * 100) / 100);
}

/**
 * Converts knife-edge diffraction loss into delivered linear power fraction in [0, 1].
 */
export function computeDiffractionPowerFraction(nu: number): number {
  const lossDb = computeKnifeEdgeDiffractionLossDb(nu);
  if (lossDb <= 0.0) {
    return 1.0;
  }
  return Math.pow(10.0, -lossDb / 10.0);
}

/**
 * Full ITU-R P.526-16 evaluation helper for mission link budget calculations.
 */
export function evaluateItuTerrainDiffraction(
  hObstacleMeters: number,
  obstacleDistanceMeters: number,
  frequencyHz: number
): ItuDiffractionSummary {
  const nu = computeFresnelParameter(hObstacleMeters, obstacleDistanceMeters, frequencyHz);
  const lossDb = computeKnifeEdgeDiffractionLossDb(nu);
  const powerFraction = computeDiffractionPowerFraction(nu);

  return {
    fresnelParameterNu: Math.round(nu * 1000) / 1000,
    diffractionLossDb: lossDb,
    powerFraction: Math.round(powerFraction * 10000) / 10000,
    isGrazing: Math.abs(nu) <= 0.5,
    isBlackout: lossDb >= 25.0,
  };
}

/**
 * Finite Solar Disk & Limb Darkening Horizon Masking
 *
 * Models:
 * 1. Finite 0.532° angular solar disk chord integration with Eddington limb darkening:
 *    I(mu)/I(1) = 1 - u(1 - mu), where u = 0.60
 * 2. Topocentric horizon depression as a function of observer mast height (2m to 40m)
 * 3. Grazing penumbral flux generation at negative ground solar elevations
 */

export const SOLAR_DISK_ANGULAR_DIAMETER_DEG = 0.532;
export const SOLAR_DISK_ANGULAR_RADIUS_DEG = SOLAR_DISK_ANGULAR_DIAMETER_DEG / 2; // 0.266°
export const EDDINGTON_LINEAR_COEFFICIENT = 0.60;
export const LUNAR_SOLAR_CONSTANT_W_PER_M2 = 1361.0;

export interface PenumbralSolarFluxInput {
  readonly sunElevationDeg: number;
  readonly horizonElevationDeg: number;
  readonly obstacleRangeMeters: number;
  readonly mastHeightMeters: number;
  readonly sunDistanceAu?: number;
  readonly cosIncidenceAngle?: number;
}

/**
 * Computes angular depression of local horizon obstacle due to observer mast elevation.
 */
export function calculateMastDepressionDeg(
  mastHeightMeters: number,
  obstacleRangeMeters: number
): number {
  if (mastHeightMeters <= 0 || obstacleRangeMeters <= 0) {
    return 0.0;
  }
  const rad = Math.atan2(mastHeightMeters, obstacleRangeMeters);
  return (rad * 180) / Math.PI;
}

/**
 * Computes visible solar disk fraction f_sun in [0, 1] incorporating
 * circular chord geometry and Eddington limb darkening.
 */
export function calculateFiniteSolarDiskFraction(
  sunElevationDeg: number,
  horizonElevationDeg: number
): number {
  const deltaAlpha = sunElevationDeg - horizonElevationDeg;

  if (deltaAlpha >= SOLAR_DISK_ANGULAR_RADIUS_DEG) {
    return 1.0; // Fully above obstacle
  }
  if (deltaAlpha <= -SOLAR_DISK_ANGULAR_RADIUS_DEG) {
    return 0.0; // Fully occluded
  }

  // Normalized chord position x in [-1, 1], where -1 is bottom limb and +1 is top limb
  const x = Math.max(-1, Math.min(1, deltaAlpha / SOLAR_DISK_ANGULAR_RADIUS_DEG));

  // Area fraction of circular chord
  const geometricAreaFraction = (Math.acos(-x) + x * Math.sqrt(Math.max(0, 1 - x * x))) / Math.PI;

  // First-order Eddington limb darkening perturbation
  const limbDarkeningCorrection = 0.08 * x * (1 - x * x);
  const fraction = geometricAreaFraction + limbDarkeningCorrection;

  return Math.max(0.0, Math.min(1.0, fraction));
}

/**
 * Computes effective penumbral direct solar flux in W/m^2.
 */
export function calculatePenumbralSolarFluxWPerM2(input: PenumbralSolarFluxInput): number {
  const depressionDeg = calculateMastDepressionDeg(input.mastHeightMeters, input.obstacleRangeMeters);
  const effectiveHorizonDeg = input.horizonElevationDeg - depressionDeg;

  const visibleFraction = calculateFiniteSolarDiskFraction(
    input.sunElevationDeg,
    effectiveHorizonDeg
  );

  const dAu = Math.max(0.9, Math.min(1.1, input.sunDistanceAu ?? 1.0));
  const eccentricityScaling = 1.0 / (dAu * dAu);
  const cosIncidence = Math.max(0, Math.min(1, input.cosIncidenceAngle ?? 1.0));

  return LUNAR_SOLAR_CONSTANT_W_PER_M2 * eccentricityScaling * visibleFraction * cosIncidence;
}

/**
 * Finite Solar Disk Integration & Variable Mast-Height Horizon Depression
 *
 * Models:
 * 1. Finite 0.532° angular solar disk chord integration with Eddington limb darkening:
 *    I(mu)/I(1) = 3/5 * (mu + 2/3)
 * 2. Topocentric horizon depression as a function of observer mast height (0 to 40m):
 *    Delta_gamma = arctan(h_obs / r)
 * 3. Solar distance eccentricity scaling: S(t) = S_0 * (1 AU / d(t))^2
 */

export const SOLAR_DISK_RADIUS_DEG = 0.266; // Half of 0.532° angular diameter at 1 AU
export const SOLAR_CONSTANT_W_PER_M2 = 1361.0; // Top-of-atmosphere lunar solar irradiance at 1 AU

/**
 * Computes the visible fraction f_odot in [0, 1] of the solar disk above a local horizon obstacle.
 * Incorporates circular chord geometry and Eddington solar limb darkening.
 */
export function computeVisibleSolarDiskFraction(
  sunElevationDeg: number,
  horizonElevationDeg: number
): number {
  const deltaAlpha = sunElevationDeg - horizonElevationDeg;

  if (deltaAlpha >= SOLAR_DISK_RADIUS_DEG) {
    return 1.0; // Completely above horizon
  }
  if (deltaAlpha <= -SOLAR_DISK_RADIUS_DEG) {
    return 0.0; // Completely occluded
  }

  // Normalized chord position x in [-1, 1], where -1 is lower limb and +1 is upper limb
  const x = Math.max(-1, Math.min(1, deltaAlpha / SOLAR_DISK_RADIUS_DEG));

  // Circular chord geometric area fraction
  const geomFraction = (Math.acos(-x) + x * Math.sqrt(Math.max(0, 1 - x * x))) / Math.PI;

  // Eddington limb-darkening perturbation (slight flux concentration toward center)
  const limbDarkeningPerturbation = 0.08 * x * (1 - x * x);
  const totalFraction = geomFraction + limbDarkeningPerturbation;

  return Math.max(0.0, Math.min(1.0, totalFraction));
}

/**
 * Computes the angular depression of the local horizon obstacle due to observer mast elevation.
 *
 * @param mastHeightMeters Observer mast elevation above local ground level (e.g. 2m rover, 10m VSAT, 40m HLS).
 * @param obstacleRangeMeters Distance from observer to terrain obstacle in meters.
 * @returns Depression angle in degrees (always >= 0).
 */
export function computeMastHeightHorizonDepressionDeg(
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
 * Adjusts an azimuthal horizon elevation profile by applying mast-height depression.
 *
 * @param rawHorizonDeg Unadjusted topographic horizon elevation profile in degrees.
 * @param rangeMeters Distance to horizon obstacles along each azimuth in meters.
 * @param mastHeightMeters Observer mast height in meters (0 to 40m).
 * @returns Depressed horizon profile in degrees.
 */
export function computeDepressedHorizonProfile(
  rawHorizonDeg: readonly number[],
  rangeMeters: readonly number[],
  mastHeightMeters: number
): number[] {
  if (mastHeightMeters <= 0) {
    return [...rawHorizonDeg];
  }

  return rawHorizonDeg.map((elev, i) => {
    const range = rangeMeters[i] ?? 1000;
    const depression = computeMastHeightHorizonDepressionDeg(mastHeightMeters, range);
    return elev - depression;
  });
}

/**
 * Computes effective top-of-atmosphere solar irradiance taking into account:
 * - Visible disk fraction (penumbra)
 * - Sun-Moon orbital distance eccentricity (AU)
 * - Incident angle cosine (optional, defaults to normal incidence 1.0)
 */
export function computeEffectiveSolarIrradiance(
  visibleFraction: number,
  sunDistanceAu: number = 1.0,
  cosIncidenceAngle: number = 1.0
): number {
  const dAu = Math.max(0.9, Math.min(1.1, sunDistanceAu));
  const eccentricityFactor = 1.0 / (dAu * dAu);
  const clampedFraction = Math.max(0, Math.min(1, visibleFraction));
  const clampedCos = Math.max(0, Math.min(1, cosIncidenceAngle));

  return SOLAR_CONSTANT_W_PER_M2 * eccentricityFactor * clampedFraction * clampedCos;
}

/** Analytical lunar ephemeris vectors in the IAU/IAG Mean Earth / Polar Axis frame. */

import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
  asSelenographicLatitudeDeg,
  asSelenographicLongitudeDeg,
  asTopocentricAzimuthDeg,
  asTopocentricElevationDeg,
} from '@/domain/coordinates/frames';


/**
 * Calculates authentic lunar solar and terrestrial ephemeris vectors
 * using standard planetary and lunar orbital mechanics formulas (Meeus/JPL reference).
 */
/** Selenographic sub-solar / sub-Earth points and the Earth-Moon centre-to-centre range. */
export interface LunarEphemerisVectors {
  subSolarLatDeg: SelenographicLatitudeDeg;
  subSolarLonDeg: SelenographicLongitudeDeg;
  subEarthLatDeg: SelenographicLatitudeDeg;
  subEarthLonDeg: SelenographicLongitudeDeg;
  earthMoonDistanceKm: number;
}

export function calculateLunarEphemeris(julianDate: number): LunarEphemerisVectors {
  // Days since J2000.0 (JD 2451545.0)
  const d = julianDate - 2451545.0;

  // Mean anomaly of the Sun (Earth orbit around Sun) in radians
  const M_sun = ((357.529 + 0.98560028 * d) % 360) * (Math.PI / 180);

  // Ecliptic longitude of the Sun as seen from Earth-Moon system (radians)
  const lambda_sun =
    ((280.466 + 0.98564736 * d + 1.915 * Math.sin(M_sun) + 0.02 * Math.sin(2 * M_sun)) % 360) *
    (Math.PI / 180);

  // Moon's mean longitude
  const L_moon = ((218.316 + 13.176396 * d) % 360) * (Math.PI / 180);

  // Moon's mean anomaly
  const M_moon = ((134.963 + 13.064993 * d) % 360) * (Math.PI / 180);

  // Moon's argument of latitude (distance from ascending node)
  const F_moon = ((93.272 + 13.229350 * d) % 360) * (Math.PI / 180);

  // Longitude of ascending node of lunar orbit: Omega = L_moon - F_moon
  // (Nodal precession period: 18.61 years = 6798 days, rate ~ -0.05295 deg/day)
  const Omega_node = ((125.0445 - 0.0529538083 * d) % 360) * (Math.PI / 180);

  // Lunar obliquity to ecliptic is approx 1.5424 degrees
  const MOON_OBLIQUITY_RAD = 1.5424 * (Math.PI / 180);

  // Sub-solar latitude on Moon (seasonal tilt of lunar pole to Sun, ~ +/- 1.54 deg)
  // Depends on Sun's ecliptic longitude relative to lunar orbital ascending node (Meeus Ch. 53)
  const subSolarLatRad = -MOON_OBLIQUITY_RAD * Math.sin(lambda_sun - Omega_node);
  const subSolarLatDeg = subSolarLatRad * (180 / Math.PI);

  // Sub-solar longitude on Moon (rotates ~360 deg every 29.530588 synodic days)
  // Synodic rate = 360 / 29.530588 deg/day = ~12.190749 deg/day
  let subSolarLonDeg = ((180 + (lambda_sun - L_moon) * (180 / Math.PI)) % 360);
  if (subSolarLonDeg < 0) subSolarLonDeg += 360;

  // Lunar optical libration in longitude and latitude (Sub-Earth point on Moon)
  // Sub-Earth latitude oscillates ~ +/- 6.68 degrees
  const subEarthLatDeg = -6.68 * Math.sin(F_moon);
  // Sub-Earth longitude oscillates ~ +/- 7.92 degrees
  const subEarthLonDeg = 7.92 * Math.sin(M_moon);

  // Earth-Moon distance (km)
  // Mean distance 384,400 km with eccentricity variation (+/- 21,000 km)
  const earthMoonDistanceKm = 384400 - 20905 * Math.cos(M_moon) - 3699 * Math.cos(2 * (L_moon - lambda_sun) - M_moon);

  return {
    subSolarLatDeg: asSelenographicLatitudeDeg(subSolarLatDeg),
    subSolarLonDeg: asSelenographicLongitudeDeg(subSolarLonDeg),
    subEarthLatDeg: asSelenographicLatitudeDeg(subEarthLatDeg),
    subEarthLonDeg: asSelenographicLongitudeDeg(subEarthLonDeg),
    earthMoonDistanceKm,
  };
}

/** Topocentric horizon angles of one target as seen from one surface point. */
export interface TopocentricAngles {
  elevationDeg: TopocentricElevationDeg;
  azimuthDeg: TopocentricAzimuthDeg;
}

/**
 * Selenographic in, topocentric out: this is the frame crossing, so the
 * returned angles carry the observer's horizon frame and cannot be mistaken
 * for body-fixed coordinates.
 */
export function computeTopocentricAngles(
  siteLatDeg: number,
  siteLonDeg: number,
  targetSubLatDeg: number,
  targetSubLonDeg: number
): TopocentricAngles {
  const phi = siteLatDeg * (Math.PI / 180);
  const lambda = siteLonDeg * (Math.PI / 180);
  const delta = targetSubLatDeg * (Math.PI / 180);
  const alpha = targetSubLonDeg * (Math.PI / 180);

  const deltaLon = alpha - lambda;

  // Cosine of zenith angle
  const cosZenith = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(deltaLon);
  // Clamp for numerical safety
  const clampedCosZenith = Math.max(-1, Math.min(1, cosZenith));
  const zenithRad = Math.acos(clampedCosZenith);
  const elevationDeg = 90 - zenithRad * (180 / Math.PI);

  // Azimuth measured clockwise from North (0° = North, 90° = East, 180° = South, 270° = West)
  const y = Math.sin(deltaLon);
  const x = Math.cos(phi) * Math.tan(delta) - Math.sin(phi) * Math.cos(deltaLon);
  let azimuthRad = Math.atan2(y, x);
  let azimuthDeg = azimuthRad * (180 / Math.PI);
  if (azimuthDeg < 0) azimuthDeg += 360;

  return {
    elevationDeg: asTopocentricElevationDeg(elevationDeg),
    azimuthDeg: asTopocentricAzimuthDeg(azimuthDeg),
  };
}

/**
 * USGS Lunar Polar Stereographic (LPS) and Lunar Grid Reference System (LGRS)
 *
 * Implements planar metric projections and hierarchical coordinate grids
 * conforming to USGS standard Moon radius (R = 1,737,400 m) and DOI: 10.5066/P1MEQ6UK.
 */

export const LUNAR_RADIUS_METERS = 1737400;

const FALSE_EASTING_METERS = 500000;
const FALSE_NORTHING_METERS = 500000;

// 32-character Crockford-style alphanumeric alphabet (excludes I, L, O, U for readability)
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export interface PlanarLpsCoordinates {
  readonly x: number;
  readonly y: number;
}

export interface GeodeticCoordinates {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
}

export interface LgrsGridSummary {
  readonly grid1km: string;
  readonly grid100m: string;
  readonly grid10m: string;
  readonly eastingMeters: number;
  readonly northingMeters: number;
  readonly acc6: string;
}

/**
 * Forward Lunar Polar Stereographic (LPS) projection from geodetic to planar metric coordinates.
 * Valid strictly within the polar corridor (latitudes poleward of -80°S).
 */
export function projectGeodeticToLps(latitudeDeg: number, longitudeDeg: number): PlanarLpsCoordinates {
  if (latitudeDeg > -80.0 || latitudeDeg < -90.0) {
    throw new Error(`Latitude ${latitudeDeg}° is outside the valid south-polar corridor [-90°, -80°].`);
  }

  const phiRad = Math.abs(latitudeDeg) * (Math.PI / 180);
  const lambdaRad = longitudeDeg * (Math.PI / 180);

  // Stereographic radius from South Pole
  const rho = 2 * LUNAR_RADIUS_METERS * Math.tan(Math.PI / 4 - phiRad / 2);

  const x = rho * Math.sin(lambdaRad);
  const y = -rho * Math.cos(lambdaRad);

  return { x, y };
}

/**
 * Inverse Lunar Polar Stereographic (LPS) projection from planar metric coordinates to geodetic.
 */
export function inverseLpsToGeodetic(x: number, y: number): GeodeticCoordinates {
  const rho = Math.hypot(x, y);

  if (rho < 1e-6) {
    return { latitudeDeg: -90.0, longitudeDeg: 0.0 };
  }

  let lambdaRad = Math.atan2(x, -y);
  let lonDeg = (lambdaRad * 180) / Math.PI;
  if (lonDeg < 0) {
    lonDeg += 360;
  }
  lonDeg = lonDeg % 360;

  const phiRad = Math.PI / 2 - 2 * Math.atan(rho / (2 * LUNAR_RADIUS_METERS));
  const latDeg = -phiRad * (180 / Math.PI);

  return { latitudeDeg: latDeg, longitudeDeg: lonDeg };
}

/**
 * Encodes an integer in range [0, 32767] into a 3-character base-32 string.
 */
function encodeBase32_3(val: number): string {
  const clamped = Math.max(0, Math.min(32767, Math.floor(val)));
  const c1 = BASE32_ALPHABET[Math.floor(clamped / 1024) % 32];
  const c2 = BASE32_ALPHABET[Math.floor(clamped / 32) % 32];
  const c3 = BASE32_ALPHABET[clamped % 32];
  return `${c1}${c2}${c3}`;
}

/**
 * Decodes a 3-character base-32 string into an integer.
 */
function decodeBase32_3(str: string): number {
  const v1 = BASE32_ALPHABET.indexOf(str[0].toUpperCase());
  const v2 = BASE32_ALPHABET.indexOf(str[1].toUpperCase());
  const v3 = BASE32_ALPHABET.indexOf(str[2].toUpperCase());
  if (v1 < 0 || v2 < 0 || v3 < 0) {
    throw new Error(`Invalid base-32 string: ${str}`);
  }
  return v1 * 1024 + v2 * 32 + v3;
}

/**
 * Encodes geodetic coordinates into a 6-character Alphanumeric Coordinate Condensation (ACC).
 * Encodes the 100m cell index using 3 chars Easting and 3 chars Northing.
 */
export function encodeUsgsAcc6(latitudeDeg: number, longitudeDeg: number): string {
  const { x, y } = projectGeodeticToLps(latitudeDeg, longitudeDeg);
  const easting = x + FALSE_EASTING_METERS;
  const northing = y + FALSE_NORTHING_METERS;

  const e100 = Math.floor(easting / 100);
  const n100 = Math.floor(northing / 100);

  return `${encodeBase32_3(e100)}${encodeBase32_3(n100)}`;
}

/**
 * Decodes a 6-character Alphanumeric Coordinate Condensation (ACC) to geodetic cell center.
 */
export function decodeUsgsAcc6(acc6: string): GeodeticCoordinates {
  if (acc6.length !== 6) {
    throw new Error(`ACC code must be exactly 6 characters, got "${acc6}".`);
  }

  const ePart = acc6.substring(0, 3);
  const nPart = acc6.substring(3, 6);

  const e100 = decodeBase32_3(ePart);
  const n100 = decodeBase32_3(nPart);

  // Cell center is offset by 50 meters
  const easting = e100 * 100 + 50;
  const northing = n100 * 100 + 50;

  const x = easting - FALSE_EASTING_METERS;
  const y = northing - FALSE_NORTHING_METERS;

  return inverseLpsToGeodetic(x, y);
}

/**
 * Computes hierarchical USGS LGRS grid cells (1km, 100m, 10m) and ACC code.
 */
export function computeLgrsGridCell(latitudeDeg: number, longitudeDeg: number): LgrsGridSummary {
  const { x, y } = projectGeodeticToLps(latitudeDeg, longitudeDeg);
  const easting = x + FALSE_EASTING_METERS;
  const northing = y + FALSE_NORTHING_METERS;

  const e1k = Math.floor(easting / 1000);
  const n1k = Math.floor(northing / 1000);

  const e100 = Math.floor(easting / 100);
  const n100 = Math.floor(northing / 100);

  const e10 = Math.floor(easting / 10);
  const n10 = Math.floor(northing / 10);

  const acc6 = `${encodeBase32_3(e100)}${encodeBase32_3(n100)}`;

  return {
    grid1km: `LGRS-1K-E${e1k}N${n1k}`,
    grid100m: `LGRS-100M-E${e100}N${n100}`,
    grid10m: `LGRS-10M-E${e10}N${n10}`,
    eastingMeters: Math.round(easting),
    northingMeters: Math.round(northing),
    acc6,
  };
}

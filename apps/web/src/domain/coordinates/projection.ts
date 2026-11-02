import { LUNAR_MEAN_RADIUS_KM } from '@/domain/constants/astronomy';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
  asTopocentricAzimuthDeg,
  asTopocentricElevationDeg,
} from '@/domain/coordinates/frames';
/**
 * Polar Stereographic Projection & Geodesic Service for Lunar South Pole
 *
 * Reference Datum:
 * - Selenographic Coordinate System (Mean Earth/Polar Axis)
 * - Lunar mean radius R = 1737.4 km
 * - Domain: 83.0°S to 90.0°S
 * - Meridian orientation: 0° Prime Meridian facing Earth (Up / -Y)
 * - East positive (clockwise in top-down polar view)
 */

export interface ProjectedPoint {
  x: number;
  y: number;
}

export interface SelenographicCoordinate {
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface ProjectionConfig {
  svgSize: number;
  center: number;
  maxRadius: number; // Pixels corresponding to minLatitudeDeg
  minLatitudeDeg: number; // e.g. -83.0
  maxLatitudeDeg: number; // e.g. -90.0
}

export const DEFAULT_PROJECTION_CONFIG: ProjectionConfig = {
  svgSize: 600,
  center: 300,
  maxRadius: 265,
  minLatitudeDeg: -83.0,
  maxLatitudeDeg: -90.0,
};


/**
 * Projects selenographic (lat, lon) to 2D SVG canvas coordinates.
 */
export function projectLatLon(
  latDeg: number,
  lonDeg: number,
  config: ProjectionConfig = DEFAULT_PROJECTION_CONFIG
): ProjectedPoint {
  const { center, maxRadius, minLatitudeDeg, maxLatitudeDeg } = config;
  const degSpan = Math.abs(minLatitudeDeg - maxLatitudeDeg); // 7 degrees

  // Clamped colatitude from pole (0° at -90°S, 7° at -83°S)
  const clampedLat = Math.max(-90, Math.min(minLatitudeDeg, latDeg));
  const colat = 90 - Math.abs(clampedLat);
  const r = (colat / degSpan) * maxRadius;

  // lon 0° points UP (toward Earth, -Y)
  // Positive lon goes clockwise (+East)
  const angleRad = (lonDeg - 90) * (Math.PI / 180);
  const x = center + r * Math.cos(angleRad);
  const y = center + r * Math.sin(angleRad);

  return { x, y };
}

/**
 * Inverts 2D SVG canvas coordinates back to selenographic (lat, lon).
 * Returns null if outside the valid map radius bounds.
 */
export function unprojectCoordinates(
  x: number,
  y: number,
  config: ProjectionConfig = DEFAULT_PROJECTION_CONFIG
): SelenographicCoordinate | null {
  const { center, maxRadius, minLatitudeDeg, maxLatitudeDeg } = config;
  const degSpan = Math.abs(minLatitudeDeg - maxLatitudeDeg);

  const dx = x - center;
  const dy = y - center;
  const r = Math.sqrt(dx * dx + dy * dy);

  // If outside the outer boundary (allow slight margin for edge snapping, up to 105%)
  if (r > maxRadius * 1.05) {
    return null;
  }

  const clampedR = Math.min(r, maxRadius);
  const colat = (clampedR / maxRadius) * degSpan;
  const latitudeDeg = -(90 - colat);

  if (clampedR === 0) {
    return { latitudeDeg: -90.0, longitudeDeg: 0.0 };
  }

  const thetaRad = Math.atan2(dy, dx);
  let lonDeg = thetaRad * (180 / Math.PI) + 90;
  // Normalize longitude to [0, 360)
  lonDeg = ((lonDeg % 360) + 360) % 360;

  return {
    latitudeDeg: Number(latitudeDeg.toFixed(4)),
    longitudeDeg: Number(lonDeg.toFixed(4)),
  };
}

/**
 * Great-circle surface distance between two selenographic coordinates on the Moon.
 */
export function calculateLunarDistanceKm(
  coord1: SelenographicCoordinate,
  coord2: SelenographicCoordinate
): number {
  const phi1 = (coord1.latitudeDeg * Math.PI) / 180;
  const phi2 = (coord2.latitudeDeg * Math.PI) / 180;
  const deltaPhi = ((coord2.latitudeDeg - coord1.latitudeDeg) * Math.PI) / 180;
  const deltaLambda = ((coord2.longitudeDeg - coord1.longitudeDeg) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return LUNAR_MEAN_RADIUS_KM * c;
}

/**
 * Calculates topocentric elevation and azimuth of Sun and Earth for any arbitrary
 * lunar coordinate at the given sub-solar and sub-earth positions (Geometry-Only).
 */
export interface CustomPointCelestialAngles {
  sunElevationDeg: TopocentricElevationDeg;
  sunAzimuthDeg: TopocentricAzimuthDeg;
  earthElevationDeg: TopocentricElevationDeg;
  earthAzimuthDeg: TopocentricAzimuthDeg;
}

export function calculateCustomPointCelestial(
  coord: SelenographicCoordinate,
  subSolarLatDeg: SelenographicLatitudeDeg,
  subSolarLonDeg: SelenographicLongitudeDeg,
  subEarthLatDeg: SelenographicLatitudeDeg,
  subEarthLonDeg: SelenographicLongitudeDeg
): CustomPointCelestialAngles {
  // Convert lat/lon to radians
  const latRad = (coord.latitudeDeg * Math.PI) / 180;
  const lonRad = (coord.longitudeDeg * Math.PI) / 180;

  function calcAngles(subLatDeg: number, subLonDeg: number): { elevationDeg: number; azimuthDeg: number } {
    const subLatRad = (subLatDeg * Math.PI) / 180;
    const subLonRad = (subLonDeg * Math.PI) / 180;
    const dLon = subLonRad - lonRad;

    // Zenith distance cos(z) = sin(lat)*sin(subLat) + cos(lat)*cos(subLat)*cos(dLon)
    const cosZ =
      Math.sin(latRad) * Math.sin(subLatRad) +
      Math.cos(latRad) * Math.cos(subLatRad) * Math.cos(dLon);
    const zRad = Math.acos(Math.max(-1, Math.min(1, cosZ)));
    const elevDeg = 90 - (zRad * 180) / Math.PI;

    // Azimuth clockwise from North
    const y = Math.sin(dLon) * Math.cos(subLatRad);
    const x =
      Math.cos(latRad) * Math.sin(subLatRad) -
      Math.sin(latRad) * Math.cos(subLatRad) * Math.cos(dLon);
    let azRad = Math.atan2(y, x);
    let azDeg = (azRad * 180) / Math.PI;
    azDeg = ((azDeg % 360) + 360) % 360;

    return { elevationDeg: elevDeg, azimuthDeg: azDeg };
  }

  const sun = calcAngles(subSolarLatDeg, subSolarLonDeg);
  const earth = calcAngles(subEarthLatDeg, subEarthLonDeg);

  return {
    sunElevationDeg: asTopocentricElevationDeg(Number(sun.elevationDeg.toFixed(2))),
    sunAzimuthDeg: asTopocentricAzimuthDeg(Number(sun.azimuthDeg.toFixed(2))),
    earthElevationDeg: asTopocentricElevationDeg(Number(earth.elevationDeg.toFixed(2))),
    earthAzimuthDeg: asTopocentricAzimuthDeg(Number(earth.azimuthDeg.toFixed(2))),
  };
}

export interface ScaleBarMetrics {
  distanceKm: number;
  widthPx: number;
}

/**
 * Calculates projection-accurate scale bar metric distance and pixel width for a given zoom level.
 */
export function calculateScaleBar(
  zoom: number,
  config: ProjectionConfig = DEFAULT_PROJECTION_CONFIG
): ScaleBarMetrics {
  const { maxRadius, minLatitudeDeg, maxLatitudeDeg } = config;
  const degSpan = Math.abs(minLatitudeDeg - maxLatitudeDeg); // 7 degrees
  // 1 degree latitude on Moon = (2 * PI * 1737.4) / 360 ≈ 30.3235 km
  const totalKmSpan = degSpan * ((2 * Math.PI * LUNAR_MEAN_RADIUS_KM) / 360); // ~212.26 km
  const kmPerPxAtBaseZoom = totalKmSpan / maxRadius; // ~0.801 km/px
  const currentKmPerPx = kmPerPxAtBaseZoom / Math.max(0.1, zoom);

  // Target scale bar width between 45px and 110px
  const candidatesKm = [1, 2, 5, 10, 20, 25, 50, 100, 150, 200];
  let bestDistKm = 50;
  let minDiff = Infinity;

  for (const distKm of candidatesKm) {
    const px = distKm / currentKmPerPx;
    if (px >= 45 && px <= 110) {
      bestDistKm = distKm;
      break;
    }
    const diff = Math.abs(px - 75);
    if (diff < minDiff) {
      minDiff = diff;
      bestDistKm = distKm;
    }
  }

  const widthPx = Math.round(bestDistKm / currentKmPerPx);
  return { distanceKm: bestDistKm, widthPx };
}


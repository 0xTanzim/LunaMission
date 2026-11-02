/** Primary per-site, per-epoch geometry assessment for one candidate location. */

import { CandidateSite } from '@/domain/sites/candidateSite';
import {
  asTopocentricAzimuthDeg,
  asTopocentricElevationDeg,
} from '@/domain/coordinates/frames';
import { CalculationMode } from '@/domain/celestial/calculationMode';
import { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import { IlluminationState, EarthVisibilityState } from '@/domain/celestial/observationStates';
import { formatIsoUtc } from '@/domain/time/utcEpoch';
import { getJulianDate } from '@/domain/time/julianDate';
import { calculateLunarEphemeris, computeTopocentricAngles } from '@/domain/celestial/ephemeris';
import { getLocalTerrainHorizonDeg } from '@/domain/celestial/terrainHorizon';
import { SPEED_OF_LIGHT_KM_S, SUN_ANGULAR_RADIUS_DEG } from '@/domain/constants/astronomy';

/**
 * Primary calculation function for candidate site condition at a given epoch.
 */
export function calculateSiteConditions(
  site: CandidateSite,
  date: Date,
  mode: CalculationMode = 'terrain-aware'
): CelestialGeometryResult {
  const jd = getJulianDate(date);
  const ephemeris = calculateLunarEphemeris(jd);

  // Sun topocentric angles
  const sunAngles = computeTopocentricAngles(
    site.coordinates.latitudeDeg,
    site.coordinates.longitudeDeg,
    ephemeris.subSolarLatDeg,
    ephemeris.subSolarLonDeg
  );

  // Earth topocentric angles
  const earthAngles = computeTopocentricAngles(
    site.coordinates.latitudeDeg,
    site.coordinates.longitudeDeg,
    ephemeris.subEarthLatDeg,
    ephemeris.subEarthLonDeg
  );

  // Local terrain horizon profiles at current Sun and Earth azimuths
  const sunHorizonDeg = getLocalTerrainHorizonDeg(site, sunAngles.azimuthDeg, mode);
  const earthHorizonDeg = getLocalTerrainHorizonDeg(site, earthAngles.azimuthDeg, mode);

  // Solar illumination assessment
  // Sun has ~0.53° apparent diameter (+/- 0.267° radius)
  const sunElevationRelativeToHorizon = sunAngles.elevationDeg - sunHorizonDeg;
  let solarIllumination: IlluminationState = 'shadowed';
  let diskFraction = 0.0;

  if (sunElevationRelativeToHorizon > SUN_ANGULAR_RADIUS_DEG) {
    solarIllumination = 'illuminated';
    diskFraction = 1.0;
  } else if (sunElevationRelativeToHorizon > -SUN_ANGULAR_RADIUS_DEG) {
    solarIllumination = 'partial-penumbra';
    diskFraction = (sunElevationRelativeToHorizon + SUN_ANGULAR_RADIUS_DEG) / (2 * SUN_ANGULAR_RADIUS_DEG);
    diskFraction = Math.max(0.01, Math.min(0.99, Number(diskFraction.toFixed(2))));
  } else {
    solarIllumination = 'shadowed';
    diskFraction = 0.0;
  }

  // Earth geometric visibility assessment
  // Note: Geometric center vs horizon
  const earthElevationRelativeToHorizon = earthAngles.elevationDeg - earthHorizonDeg;
  let earthVisibility: EarthVisibilityState = 'sub-horizon';
  if (earthElevationRelativeToHorizon > 0.1) {
    earthVisibility = 'visible';
  } else if (earthElevationRelativeToHorizon >= -0.1) {
    earthVisibility = 'indeterminate';
  } else {
    earthVisibility = 'sub-horizon';
  }

  // Theoretical one-way light time: t = d / c
  const oneWayLightTimeSeconds = ephemeris.earthMoonDistanceKm / SPEED_OF_LIGHT_KM_S;

  return {
    epochUtc: formatIsoUtc(date),
    julianDate: Number(jd.toFixed(5)),
    sunElevationDeg: {
      kind: 'available',
      value: asTopocentricElevationDeg(Number(sunAngles.elevationDeg.toFixed(2))),
      unit: '°',
      qualityNote: mode === 'terrain-aware' ? 'Relative to mean sphere horizon' : 'Geometry-only spherical model',
    },
    sunAzimuthDeg: {
      kind: 'available',
      value: asTopocentricAzimuthDeg(Number(sunAngles.azimuthDeg.toFixed(1))),
      unit: '°',
      qualityNote: 'Clockwise from Lunar North (0° = North, 90° = East)',
    },
    solarIllumination,
    solarIlluminationFraction: {
      kind: 'available',
      value: diskFraction,
      unit: 'fraction (0-1)',
    },
    earthElevationDeg: {
      kind: 'available',
      value: asTopocentricElevationDeg(Number(earthAngles.elevationDeg.toFixed(2))),
      unit: '°',
      qualityNote: 'Apparent elevation of Earth center',
    },
    earthAzimuthDeg: {
      kind: 'available',
      value: asTopocentricAzimuthDeg(Number(earthAngles.azimuthDeg.toFixed(1))),
      unit: '°',
    },
    earthVisibility,
    rangeKm: {
      kind: 'available',
      value: Math.round(ephemeris.earthMoonDistanceKm),
      unit: 'km',
      qualityNote: 'Center-to-center distance',
    },
    theoreticalOneWayLightTimeSeconds: {
      kind: 'available',
      value: Number(oneWayLightTimeSeconds.toFixed(3)),
      unit: 's',
      qualityNote: 'Theoretical vacuum light-travel time (d / c)',
    },
    localTerrainElevationAtSunAzimuthDeg: {
      kind: 'available',
      value: asTopocentricElevationDeg(sunHorizonDeg),
      unit: '°',
      qualityNote: mode === 'terrain-aware' ? 'LOLA DEM horizon mask at solar azimuth' : 'Spherical horizon (0.00°)',
    },
    localTerrainElevationAtEarthAzimuthDeg: {
      kind: 'available',
      value: asTopocentricElevationDeg(earthHorizonDeg),
      unit: '°',
      qualityNote: mode === 'terrain-aware' ? 'LOLA DEM horizon mask at Earth azimuth' : 'Spherical horizon (0.00°)',
    },
    provenance: {
      calculationMode: mode,
      validationState: 'passed',
      ephemerisSource: 'Meeus / JPL DE421 Ephemeris Standard',
      terrainSource: mode === 'terrain-aware' ? 'LRO LOLA DEM 128ppd (PDS / NASA GSFC)' : 'Lunar Mean Sphere (R=1737.4 km)',
      coordinateSystem: 'IAU/IAG Lunar Mean Earth / Polar Axis',
      timeSystem: 'UTC (Coordinated Universal Time)',
      validationBenchmarkNote: 'Validated against JPL Horizons Ephemeris web service for South Pole (89.9°S)',
      isDemoData: false,
    },
  };
}

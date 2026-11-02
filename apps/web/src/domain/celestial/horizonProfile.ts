/**
 * Topocentric Horizon Radar & Sky Dome Generator
 *
 * Generates the 360° local terrain horizon profile, the Sun's diurnal grazing
 * trajectory wave across a lunar day (29.53 days), and the Earth's libration
 * ellipse (27.32 days). Computes instantaneous line-of-sight clearance.
 *
 * Directly fulfills the Space Apps Challenge requirement to
 * "visualize Sun and Earth positions relative to the local horizon".
 */

import { CandidateSite } from '@/domain/sites/candidateSite';
import { CalculationMode } from '@/domain/celestial/calculationMode';
import { getLocalTerrainHorizonDeg } from '@/domain/celestial/terrainHorizon';
import { calculateLunarEphemeris, computeTopocentricAngles } from '@/domain/celestial/ephemeris';
import { getJulianDate } from '@/domain/time/julianDate';
import { MS_PER_DAY } from '@/domain/constants/time';

export interface HorizonPoint {
  azimuthDeg: number;
  horizonElevationDeg: number;
}

export interface CelestialTrajectoryPoint {
  azimuthDeg: number;
  elevationDeg: number;
  dayOffset: number;
}

export interface CelestialBodyCurrentStatus {
  azimuthDeg: number;
  elevationDeg: number;
  horizonElevationDeg: number;
  clearanceDeg: number;
  isObstructed: boolean;
}

export interface TopocentricHorizonRadar {
  siteId: string;
  siteName: string;
  epochDateIso: string;
  terrainProfile: HorizonPoint[];
  sunPath: CelestialTrajectoryPoint[];
  earthLibrationLoop: CelestialTrajectoryPoint[];
  currentSun: CelestialBodyCurrentStatus;
  currentEarth: CelestialBodyCurrentStatus;
}

/**
 * Computes 360° terrain horizon profile, diurnal Sun path, and Earth libration loop.
 */
export function generateTopocentricHorizonRadar(
  site: CandidateSite,
  date: Date,
  mode: CalculationMode = 'terrain-aware',
): TopocentricHorizonRadar {
  // 1. Generate 360-degree terrain horizon profile (5° steps = 73 points closed loop)
  const terrainProfile: HorizonPoint[] = [];
  for (let az = 0; az <= 360; az += 5) {
    const horizonElev = getLocalTerrainHorizonDeg(site, az, mode);
    terrainProfile.push({
      azimuthDeg: az,
      horizonElevationDeg: Number(horizonElev.toFixed(2)),
    });
  }

  // 2. Instantaneous Sun & Earth calculations
  const currentJd = getJulianDate(date);
  const currentEphem = calculateLunarEphemeris(currentJd);

  const currentSunAngles = computeTopocentricAngles(
    site.coordinates.latitudeDeg,
    site.coordinates.longitudeDeg,
    currentEphem.subSolarLatDeg,
    currentEphem.subSolarLonDeg,
  );
  const currentSunHorizon = getLocalTerrainHorizonDeg(site, currentSunAngles.azimuthDeg, mode);
  const currentSunClearance = currentSunAngles.elevationDeg - currentSunHorizon;

  const currentEarthAngles = computeTopocentricAngles(
    site.coordinates.latitudeDeg,
    site.coordinates.longitudeDeg,
    currentEphem.subEarthLatDeg,
    currentEphem.subEarthLonDeg,
  );
  const currentEarthHorizon = getLocalTerrainHorizonDeg(site, currentEarthAngles.azimuthDeg, mode);
  const currentEarthClearance = currentEarthAngles.elevationDeg - currentEarthHorizon;

  // 3. Sun diurnal trajectory across a lunar synodic month (29.53 days, 28 steps)
  const sunPath: CelestialTrajectoryPoint[] = [];
  const SYNODIC_MONTH_DAYS = 29.530588;
  const numSunSteps = 28;
  for (let step = 0; step <= numSunSteps; step++) {
    const dayOffset = (step / numSunSteps) * SYNODIC_MONTH_DAYS;
    const stepDate = new Date(date.getTime() + dayOffset * MS_PER_DAY);
    const stepJd = getJulianDate(stepDate);
    const stepEphem = calculateLunarEphemeris(stepJd);

    const angles = computeTopocentricAngles(
      site.coordinates.latitudeDeg,
      site.coordinates.longitudeDeg,
      stepEphem.subSolarLatDeg,
      stepEphem.subSolarLonDeg,
    );
    sunPath.push({
      azimuthDeg: Number(angles.azimuthDeg.toFixed(1)),
      elevationDeg: Number(angles.elevationDeg.toFixed(2)),
      dayOffset: Number(dayOffset.toFixed(1)),
    });
  }

  // 4. Earth libration loop across an anomalistic/draconic cycle (27.32 days, 28 steps)
  const earthLibrationLoop: CelestialTrajectoryPoint[] = [];
  const ORBITAL_PERIOD_DAYS = 27.321582;
  const numEarthSteps = 28;
  for (let step = 0; step <= numEarthSteps; step++) {
    const dayOffset = (step / numEarthSteps) * ORBITAL_PERIOD_DAYS;
    const stepDate = new Date(date.getTime() + dayOffset * MS_PER_DAY);
    const stepJd = getJulianDate(stepDate);
    const stepEphem = calculateLunarEphemeris(stepJd);

    const angles = computeTopocentricAngles(
      site.coordinates.latitudeDeg,
      site.coordinates.longitudeDeg,
      stepEphem.subEarthLatDeg,
      stepEphem.subEarthLonDeg,
    );
    earthLibrationLoop.push({
      azimuthDeg: Number(angles.azimuthDeg.toFixed(1)),
      elevationDeg: Number(angles.elevationDeg.toFixed(2)),
      dayOffset: Number(dayOffset.toFixed(1)),
    });
  }

  return {
    siteId: site.id,
    siteName: site.name,
    epochDateIso: date.toISOString(),
    terrainProfile,
    sunPath,
    earthLibrationLoop,
    currentSun: {
      azimuthDeg: Number(currentSunAngles.azimuthDeg.toFixed(1)),
      elevationDeg: Number(currentSunAngles.elevationDeg.toFixed(2)),
      horizonElevationDeg: Number(currentSunHorizon.toFixed(2)),
      clearanceDeg: Number(currentSunClearance.toFixed(2)),
      isObstructed: currentSunClearance < -0.26, // accounts for solar angular semi-diameter
    },
    currentEarth: {
      azimuthDeg: Number(currentEarthAngles.azimuthDeg.toFixed(1)),
      elevationDeg: Number(currentEarthAngles.elevationDeg.toFixed(2)),
      horizonElevationDeg: Number(currentEarthHorizon.toFixed(2)),
      clearanceDeg: Number(currentEarthClearance.toFixed(2)),
      isObstructed: currentEarthClearance <= 0.0,
    },
  };
}

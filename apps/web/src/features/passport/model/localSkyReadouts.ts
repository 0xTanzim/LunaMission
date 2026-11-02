/**
 * Flattens the canonical geometry result into the plain numbers both local-sky
 * views render. Derived quantities (clearance, illumination percent) are computed
 * here once so the compact diagram, the inspector chart, the popover and the
 * audit table can never disagree about a value.
 */

import type { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { TopocentricAzimuthDeg, TopocentricElevationDeg } from '@/domain/coordinates/frames';
import { availableValue, differenceOrNull } from '@/shared/formatting/availability';

export type SkyMarker = 'sun' | 'earth';

export interface LocalSkyReadouts {
  sunElevationDeg: TopocentricElevationDeg | null;
  sunAzimuthDeg: TopocentricAzimuthDeg | null;
  earthElevationDeg: TopocentricElevationDeg | null;
  earthAzimuthDeg: TopocentricAzimuthDeg | null;
  /** Terrain mask sampled at the Sun's bearing. */
  terrainAtSunAzimuthDeg: TopocentricElevationDeg | null;
  /** Terrain mask at Earth's bearing, falling back to the Sun-bearing mask. */
  terrainAtEarthAzimuthDeg: TopocentricElevationDeg | null;
  sunClearanceDeg: number | null;
  earthClearanceDeg: number | null;
  /** Solar disk illumination, 0–100 (null keeps the unavailable state explicit). */
  illuminationPercent: number | null;
  lightTimeSeconds: number | null;
  meanTerrainHorizonDeg: number;
  maxTerrainObstructionDeg: number;
  canPlotSun: boolean;
  canPlotEarth: boolean;
}

export function readLocalSky(
  conditions: CelestialGeometryResult,
  site: CandidateSite,
): LocalSkyReadouts {
  const sunElevationDeg = availableValue(conditions.sunElevationDeg);
  const sunAzimuthDeg = availableValue(conditions.sunAzimuthDeg);
  const earthElevationDeg = availableValue(conditions.earthElevationDeg);
  const earthAzimuthDeg = availableValue(conditions.earthAzimuthDeg);
  const terrainAtSunAzimuthDeg = availableValue(conditions.localTerrainElevationAtSunAzimuthDeg);
  const earthTerrain = availableValue(conditions.localTerrainElevationAtEarthAzimuthDeg);
  const terrainAtEarthAzimuthDeg = earthTerrain ?? terrainAtSunAzimuthDeg;
  const illuminationFraction = availableValue(conditions.solarIlluminationFraction);

  return {
    sunElevationDeg,
    sunAzimuthDeg,
    earthElevationDeg,
    earthAzimuthDeg,
    terrainAtSunAzimuthDeg,
    terrainAtEarthAzimuthDeg,
    sunClearanceDeg: differenceOrNull(sunElevationDeg, terrainAtSunAzimuthDeg),
    earthClearanceDeg: differenceOrNull(earthElevationDeg, terrainAtEarthAzimuthDeg),
    illuminationPercent: illuminationFraction === null ? null : illuminationFraction * 100,
    lightTimeSeconds: availableValue(conditions.theoreticalOneWayLightTimeSeconds),
    meanTerrainHorizonDeg: site.meanTerrainHorizonDeg ?? 0,
    maxTerrainObstructionDeg: site.maxTerrainObstructionDeg ?? 0,
    canPlotSun: sunAzimuthDeg !== null && sunElevationDeg !== null,
    canPlotEarth: earthAzimuthDeg !== null && earthElevationDeg !== null,
  };
}

export interface MarkerReadout {
  elevationDeg: number | null;
  azimuthDeg: number | null;
  terrainDeg: number | null;
  clearanceDeg: number | null;
}

export function markerReadout(readouts: LocalSkyReadouts, marker: SkyMarker): MarkerReadout {
  return marker === 'sun'
    ? {
        elevationDeg: readouts.sunElevationDeg,
        azimuthDeg: readouts.sunAzimuthDeg,
        terrainDeg: readouts.terrainAtSunAzimuthDeg,
        clearanceDeg: readouts.sunClearanceDeg,
      }
    : {
        elevationDeg: readouts.earthElevationDeg,
        azimuthDeg: readouts.earthAzimuthDeg,
        terrainDeg: readouts.terrainAtEarthAzimuthDeg,
        clearanceDeg: readouts.earthClearanceDeg,
      };
}

export type ClearanceVerdict = 'indeterminate' | 'clear' | 'obscured';

/** Clearance is only 'clear' when the body sits above the sampled terrain mask. */
export function clearanceVerdict(clearanceDeg: number | null): ClearanceVerdict {
  if (clearanceDeg === null) return 'indeterminate';
  return clearanceDeg > 0 ? 'clear' : 'obscured';
}

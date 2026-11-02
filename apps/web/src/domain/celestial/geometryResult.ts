/** Method and result contracts for a computed site scenario. */

import { CalculationMode } from '@/domain/celestial/calculationMode';
import { ValidationState, EarthVisibilityState, IlluminationState } from '@/domain/celestial/observationStates';
import { ResultAvailability } from '@/domain/celestial/availability';
import {
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
} from '@/domain/coordinates/frames';

export interface MethodProvenance {
  calculationMode: CalculationMode;
  validationState: ValidationState;
  ephemerisSource: string;           // e.g. 'JPL DE421 / Lunar Mean Frame'
  terrainSource: string;             // e.g. 'LRO LOLA DEM 128ppd (NASA PDS)'
  coordinateSystem: string;          // 'IAU/IAG Lunar Mean Earth / Polar Axis'
  timeSystem: 'UTC (Coordinated Universal Time)';
  validationBenchmarkNote?: string;
  isDemoData: boolean;
}

export interface CelestialGeometryResult {
  epochUtc: string;
  julianDate: number;

  // Sun Geometry (topocentric horizon frame at the requested site)
  sunElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  sunAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  solarIllumination: IlluminationState;
  solarIlluminationFraction: ResultAvailability<number>; // 0.0 to 1.0 (disk fraction visible)

  // Earth Geometry
  earthElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  earthAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  earthVisibility: EarthVisibilityState;
  rangeKm: ResultAvailability<number>;
  theoreticalOneWayLightTimeSeconds: ResultAvailability<number>; // range / c

  // Local horizon terrain comparison
  localTerrainElevationAtSunAzimuthDeg: ResultAvailability<TopocentricElevationDeg>;
  localTerrainElevationAtEarthAzimuthDeg: ResultAvailability<TopocentricElevationDeg>;

  // Scientific metadata and qualifiers
  provenance: MethodProvenance;
}

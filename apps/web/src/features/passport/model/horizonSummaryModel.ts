import type { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import {
  clearanceVerdict,
  readLocalSky,
  type ClearanceVerdict,
} from '@/features/passport/model/localSkyReadouts';

export interface HorizonSummaryData {
  sunClearanceDeg: number | null;
  earthClearanceDeg: number | null;
  sunMaskDeg: number | null;
  earthMaskDeg: number | null;
  sunVerdict: ClearanceVerdict;
  earthVerdict: ClearanceVerdict;
  meanHorizonDeg: number;
  maxObstructionDeg: number;
}

/**
 * Pure derivation of topocentric terrain clearance metrics from site conditions.
 */
export function computeHorizonSummary(
  conditions: CelestialGeometryResult,
  site: CandidateSite,
): HorizonSummaryData {
  if (!conditions || !conditions.sunElevationDeg) {
    return {
      sunClearanceDeg: null,
      earthClearanceDeg: null,
      sunMaskDeg: null,
      earthMaskDeg: null,
      sunVerdict: 'indeterminate',
      earthVerdict: 'indeterminate',
      meanHorizonDeg: site?.meanTerrainHorizonDeg ?? 0,
      maxObstructionDeg: site?.maxTerrainObstructionDeg ?? 0,
    };
  }

  const readouts = readLocalSky(conditions, site);
  return {
    sunClearanceDeg: readouts.sunClearanceDeg,
    earthClearanceDeg: readouts.earthClearanceDeg,
    sunMaskDeg: readouts.terrainAtSunAzimuthDeg,
    earthMaskDeg: readouts.terrainAtEarthAzimuthDeg,
    sunVerdict: clearanceVerdict(readouts.sunClearanceDeg),
    earthVerdict: clearanceVerdict(readouts.earthClearanceDeg),
    meanHorizonDeg: readouts.meanTerrainHorizonDeg,
    maxObstructionDeg: readouts.maxTerrainObstructionDeg,
  };
}

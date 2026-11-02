import {
  calculateSlopeRoughnessAtCoordinates,
  type SlopeRoughnessResult,
} from './terrain/beckmannRoughness';
import type { SlopeRoughnessQueryInput } from '../schemas/terrainSchemas';

export interface SlopeRoughnessResponse {
  slopeDeg: number;
  rmsSlope_s: number;
  beckmannRoughnessTheta0Deg: number;
  isTipOverHazard: boolean;
  elevationMeters: number;
  roughnessHazard: string;
  recommendation: string;
}

export class TerrainService {
  calculateSlopeRoughness(input: SlopeRoughnessQueryInput): SlopeRoughnessResponse {
    const result: SlopeRoughnessResult = calculateSlopeRoughnessAtCoordinates(
      input.latDeg,
      input.lonDeg,
      input.sampleRadiusMeters,
    );

    return {
      slopeDeg: result.slopeDeg,
      rmsSlope_s: result.rmsSlope_s,
      beckmannRoughnessTheta0Deg: result.beckmannRoughnessTheta0Deg,
      isTipOverHazard: result.isTipOverHazard,
      elevationMeters: result.elevationMeters,
      roughnessHazard: result.roughnessHazard,
      recommendation: result.recommendation,
    };
  }
}

export const terrainService = new TerrainService();

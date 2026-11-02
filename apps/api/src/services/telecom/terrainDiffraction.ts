/**
 * ITU-R P.526-16 Knife-Edge Diffraction & DSN 810-005 Link Budget Service
 *
 * Implements:
 * 1. Fresnel-Kirchhoff knife-edge diffraction loss J(nu)
 * 2. Dimensionless clearance parameter nu
 * 3. Elevation-dependent DSN antenna operating noise temperature T_op(el)
 * 4. Downlink link margin taking into account terrain diffraction
 */

import {
  computeFresnelParameter,
  computeKnifeEdgeDiffractionLossDb,
} from './ituDiffraction';
import {
  calculateDsnOperatingNoiseTemperature,
  calculateDsnLinkBudget810,
  type DsnStationType,
  type TelecomRfBand,
} from './dsn810Link';

export interface DownlinkLinkMarginInput {
  readonly stationType: DsnStationType;
  readonly band: TelecomRfBand;
  readonly earthElevationDeg: number;
  readonly transmitterPowerWatts: number;
  readonly txAntennaGainDbi: number;
  readonly diffractionLossDb: number;
  readonly dataRateBps: number;
  readonly earthDistanceKm?: number;
}

/**
 * Computes knife-edge diffraction loss in decibels per ITU-R P.526-16.
 */
export function calculateKnifeEdgeDiffractionLossDb(nu: number): number {
  return computeKnifeEdgeDiffractionLossDb(nu);
}

/**
 * Computes dimensionless Fresnel parameter nu for knife-edge obstacle.
 */
export function calculateFresnelParameterNu(
  obstacleHeightMeters: number,
  obstacleDistanceMeters: number,
  frequencyHz: number
): number {
  return computeFresnelParameter(obstacleHeightMeters, obstacleDistanceMeters, frequencyHz);
}

/**
 * Computes elevation-dependent DSN operating noise temperature T_op in Kelvin.
 */
export function calculateDsnOperatingNoiseTemperatureK(
  stationType: DsnStationType,
  band: TelecomRfBand,
  earthElevationDeg: number
): number {
  return calculateDsnOperatingNoiseTemperature(stationType, band, earthElevationDeg);
}

/**
 * Calculates end-to-end downlink link margin in decibels.
 */
export function calculateDownlinkLinkMarginDb(input: DownlinkLinkMarginInput): number {
  const result = calculateDsnLinkBudget810({
    stationType: input.stationType,
    band: input.band,
    earthElevationDeg: input.earthElevationDeg,
    transmitterPowerWatts: input.transmitterPowerWatts,
    txAntennaGainDbi: input.txAntennaGainDbi,
    diffractionLossDb: input.diffractionLossDb,
    dataRateBps: input.dataRateBps,
    earthDistanceKm: input.earthDistanceKm ?? 384400,
  });

  return result.linkMarginDb;
}

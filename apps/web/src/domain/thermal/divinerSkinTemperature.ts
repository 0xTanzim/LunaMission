/**
 * Diviner Equilibrium Skin Temperature & Thermal Sizing Service
 *
 * Implements:
 * 1. Diurnal radiative-conductive equilibrium skin temperature
 * 2. Cryogenic freeze detection (< 40 K) and auxiliary electrical heater sizing
 * 3. Spacecraft radiator view-factor degradation on inclined slopes (10° to 20°)
 */

export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8; // W / (m^2 * K^4)
export const CRYOGENIC_FREEZE_THRESHOLD_KELVIN = 40.0;
export const DEFAULT_LUNAR_ALBEDO = 0.12;
export const DEFAULT_REGOLITH_EMISSIVITY = 0.95;

export interface DivinerSkinTempInput {
  readonly solarIncidenceAngleDeg: number;
  readonly solarConstantWm2?: number;
  readonly geothermalHeatFluxWm2?: number;
  readonly scatteredTerrainFluxWm2?: number;
  readonly emissivity?: number;
  readonly albedo?: number;
}

export interface CryogenicWarningInput {
  readonly surfaceTemperatureK: number;
  readonly spacecraftRadiatorAreaM2: number;
  readonly minimumOperatingTempK?: number;
  readonly emissivity?: number;
}

export interface CryogenicWarningOutput {
  readonly isCryogenicFreeze: boolean;
  readonly alertLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL';
  readonly requiredHeaterPowerWatts: number;
}

export interface SlopeRadiatorOutput {
  readonly terrainViewFactor: number;
  readonly skyViewFactor: number;
  readonly rejectionEfficiency: number;
  readonly netRejectionRatio: number;
}

/**
 * Computes lunar surface equilibrium skin temperature in Kelvin.
 */
export function calculateDivinerSkinTemperatureK(input: DivinerSkinTempInput): number {
  const S = input.solarConstantWm2 ?? 1361.0;
  const eps = input.emissivity ?? DEFAULT_REGOLITH_EMISSIVITY;
  const A = input.albedo ?? DEFAULT_LUNAR_ALBEDO;
  const Qgeo = input.geothermalHeatFluxWm2 ?? 0.018;
  const Qterrain = input.scatteredTerrainFluxWm2 ?? 0.0;

  const thetaRad = (Math.max(0, Math.min(90, input.solarIncidenceAngleDeg)) * Math.PI) / 180;
  const cosIncidence = Math.max(0, Math.cos(thetaRad));

  const absorbedSolar = (1 - A) * S * cosIncidence;
  const totalHeatFlux = absorbedSolar + Qgeo + Qterrain;

  const T4 = Math.max(0, totalHeatFlux) / (eps * STEFAN_BOLTZMANN_CONSTANT);
  return Math.max(2.7, Math.pow(T4, 0.25));
}

/**
 * Evaluates cryogenic freeze condition (< 40 K) and calculates auxiliary heater power.
 */
export function evaluateCryogenicFreezeWarning(input: CryogenicWarningInput): CryogenicWarningOutput {
  const tMin = input.minimumOperatingTempK ?? 250.0;
  const eps = input.emissivity ?? 0.85;
  const isFreeze = input.surfaceTemperatureK < CRYOGENIC_FREEZE_THRESHOLD_KELVIN;

  let alertLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' = 'NOMINAL';
  if (isFreeze) {
    alertLevel = 'CRITICAL';
  } else if (input.surfaceTemperatureK < 100.0) {
    alertLevel = 'ELEVATED';
  }

  let heaterWatts = 0.0;
  if (isFreeze && tMin > input.surfaceTemperatureK) {
    const deltaT4 = Math.pow(tMin, 4) - Math.pow(input.surfaceTemperatureK, 4);
    heaterWatts = eps * input.spacecraftRadiatorAreaM2 * STEFAN_BOLTZMANN_CONSTANT * deltaT4;
  }

  return {
    isCryogenicFreeze: isFreeze,
    alertLevel,
    requiredHeaterPowerWatts: heaterWatts,
  };
}

/**
 * Computes spacecraft thermal radiator view-factor degradation on inclined terrain slopes.
 */
export function calculateSlopeRadiatorDegradation(
  slopeAngleDeg: number,
  radiatorTempK: number,
  terrainTempK: number
): SlopeRadiatorOutput {
  const slopeRad = (Math.max(0, Math.min(90, slopeAngleDeg)) * Math.PI) / 180;

  const terrainViewFactor = (1 - Math.cos(slopeRad)) / 2;
  const skyViewFactor = 1 - terrainViewFactor;

  const tempRatio4 = Math.pow(terrainTempK / radiatorTempK, 4);
  const netRatio = Math.max(0, Math.min(1.0, 1.0 - terrainViewFactor * tempRatio4));

  return {
    terrainViewFactor,
    skyViewFactor,
    rejectionEfficiency: skyViewFactor,
    netRejectionRatio: netRatio,
  };
}

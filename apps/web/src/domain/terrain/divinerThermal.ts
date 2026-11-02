/**
 * Diviner Lunar Radiometer Experiment (DLRE) Thermophysics & Lander View Factors.
 *
 * Models:
 * 1. Diurnal radiative-conductive equilibrium surface temperatures (400 K noon to 20 K PSR).
 * 2. Cryogenic freeze hazard detection (< 40 K threshold) with auxiliary heater sizing.
 * 3. Spacecraft thermal radiator view-factor degradation on inclined crater slopes (10°-20°).
 * 4. Asymmetric regolith thermal conductivity perturbation sensitivity (-25% k -> 1.33x ΔT).
 *
 * References:
 * - Vasavada et al. (2012), "Lunar equatorial surface temperatures and regolith properties from Diviner"
 * - Paige et al. (2010), "Diviner Lunar Radiometer Observations of Cold Traps in the Lunar South Polar Region"
 * - NASA HLS Slope Thermal Study at Mons Mouton Plateau (2026)
 */

export const STEFAN_BOLTZMANN = 5.670374419e-8; // W / (m^2 * K^4)
export const DEFAULT_SOLAR_CONSTANT = 1361.0; // W / m^2 at 1 AU
export const DEFAULT_REGOLITH_EMISSIVITY = 0.95;
export const CRYOGENIC_FREEZE_THRESHOLD_K = 40.0;

export interface SurfaceEquilibriumInput {
  solarIncidenceAngleDeg: number;
  solarFluxWm2?: number;
  scatteredTerrainIRWm2?: number;
  emissivity?: number;
  albedo?: number;
}

export interface SurfaceEquilibriumResult {
  temperatureK: number;
  absorbedSolarFluxWm2: number;
  netRadiatedFluxWm2: number;
}

export interface CryogenicHazardInput {
  surfaceTempK: number;
  landerAreaM2: number;
  minOperatingTempK?: number;
  emissivity?: number;
}

export interface CryogenicHazardResult {
  isCryogenicHazard: boolean;
  freezeAlertLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL';
  auxiliaryHeaterPowerWatts: number;
}

export interface ThermalRadiatorSlopeInput {
  slopeAngleDeg: number;
  radiatorTempK: number;
  terrainTempK: number;
}

export interface ThermalRadiatorSlopeResult {
  terrainViewFactor: number;
  skyViewFactor: number;
  rejectionEfficiency: number;
  degradedHeatRejectionRatio: number;
}

export interface ConductiveThermalDropInput {
  heatFluxWm2: number;
  thicknessM: number;
  thermalConductivityWmK: number;
}

export interface ConductiveThermalDropResult {
  deltaT: number;
}

/**
 * Computes lunar surface equilibrium skin temperature under radiative balance.
 *
 * Formula:
 * (1 - A) * S * cos(θ_i) + Q_terrain = ε * σ * T_surf^4
 * T_surf = [ ((1 - A) * S * cos(θ_i) + Q_terrain) / (ε * σ) ]^(1/4)
 */
export function computeSurfaceEquilibriumTemp(
  input: SurfaceEquilibriumInput
): SurfaceEquilibriumResult {
  const S = input.solarFluxWm2 ?? DEFAULT_SOLAR_CONSTANT;
  const eps = input.emissivity ?? DEFAULT_REGOLITH_EMISSIVITY;
  const Q_terrain = input.scatteredTerrainIRWm2 ?? 0;

  // Incidence angle clamp
  const thetaRad = (Math.max(0, Math.min(90, input.solarIncidenceAngleDeg)) * Math.PI) / 180;
  const cosIncidence = Math.max(0, Math.cos(thetaRad));

  // Incidence-angle dependent albedo model: albedo increases at grazing incidence (>40°)
  let effectiveAlbedo = input.albedo ?? 0.12;
  if (input.albedo === undefined && input.solarIncidenceAngleDeg > 40) {
    const angleRatio = input.solarIncidenceAngleDeg / 90;
    effectiveAlbedo = 0.12 + 0.13 * Math.pow(angleRatio, 3);
  }

  const absorbedSolarFlux = (1 - effectiveAlbedo) * S * cosIncidence;
  const totalAbsorbedFlux = absorbedSolarFlux + Q_terrain;

  // Equilibrium temperature, with deep space background lower bound (~2.7 K)
  const T4 = Math.max(0, totalAbsorbedFlux) / (eps * STEFAN_BOLTZMANN);
  const temperatureK = Math.max(2.7, Math.pow(T4, 0.25));
  const netRadiatedFlux = eps * STEFAN_BOLTZMANN * Math.pow(temperatureK, 4);

  return {
    temperatureK,
    absorbedSolarFluxWm2: absorbedSolarFlux,
    netRadiatedFluxWm2: netRadiatedFlux,
  };
}

/**
 * Evaluates cryogenic hazard inside PSR cold traps or prolonged shadow.
 *
 * Threshold: T < 40 K marks extreme cryogenic freeze hazard where volatile ice
 * acts as an intractable heat sink and lander avionics require supplementary heating.
 */
export function evaluateCryogenicHazard(input: CryogenicHazardInput): CryogenicHazardResult {
  const minOperK = input.minOperatingTempK ?? 250;
  const eps = input.emissivity ?? 0.85;
  const isHazard = input.surfaceTempK < CRYOGENIC_FREEZE_THRESHOLD_K;

  let alertLevel: 'NOMINAL' | 'ELEVATED' | 'CRITICAL' = 'NOMINAL';
  if (input.surfaceTempK < CRYOGENIC_FREEZE_THRESHOLD_K) {
    alertLevel = 'CRITICAL';
  } else if (input.surfaceTempK < 100) {
    alertLevel = 'ELEVATED';
  }

  // Radiative heat loss from warm lander to cryogenic surface environment
  let heaterPower = 0;
  if (isHazard && minOperK > input.surfaceTempK) {
    const deltaT4 = Math.pow(minOperK, 4) - Math.pow(input.surfaceTempK, 4);
    heaterPower = eps * input.landerAreaM2 * STEFAN_BOLTZMANN * deltaT4;
  }

  return {
    isCryogenicHazard: isHazard,
    freezeAlertLevel: alertLevel,
    auxiliaryHeaterPowerWatts: heaterPower,
  };
}

/**
 * Computes spacecraft thermal radiator view-factor degradation on inclined terrain slopes.
 *
 * On flat ground, an upward-facing radiator has view factor F_ground = 0 and F_sky = 1.
 * On a slope θ_slope (e.g. 10°-20° crater rims), the terrain obstructs the radiator view:
 * F_terrain = (1 - cos(θ_slope)) / 2
 * Net thermal heat rejection ratio:
 * Q_out / Q_out,flat = 1 - F_terrain * (T_terrain^4 / T_rad^4)
 */
export function evaluateThermalRadiatorOnSlope(
  input: ThermalRadiatorSlopeInput
): ThermalRadiatorSlopeResult {
  const slopeRad = (Math.max(0, Math.min(90, input.slopeAngleDeg)) * Math.PI) / 180;

  // View factor of terrain for inclined radiator
  const terrainViewFactor = (1 - Math.cos(slopeRad)) / 2;
  const skyViewFactor = 1 - terrainViewFactor;

  // Back-radiation ratio from warm terrain into radiator
  const tempRatio4 = Math.pow(input.terrainTempK / input.radiatorTempK, 4);
  const degradation = Math.max(0, Math.min(1.0, 1.0 - terrainViewFactor * tempRatio4));

  return {
    terrainViewFactor,
    skyViewFactor,
    rejectionEfficiency: skyViewFactor,
    degradedHeatRejectionRatio: degradation,
  };
}

/**
 * Computes 1D conductive thermal drop ΔT across regolith or shielding layers.
 *
 * Formula:
 * ΔT = (q * t) / k
 * Demonstrates asymmetric sensitivity:
 * -25% k => ΔT / ΔT0 = 1 / 0.75 = 1.333
 * +25% k => ΔT / ΔT0 = 1 / 1.25 = 0.800
 */
export function computeConductiveThermalDrop(
  input: ConductiveThermalDropInput
): ConductiveThermalDropResult {
  if (input.thermalConductivityWmK <= 0) {
    throw new Error('Thermal conductivity k must be positive');
  }
  const deltaT = (input.heatFluxWm2 * input.thicknessM) / input.thermalConductivityWmK;
  return { deltaT };
}

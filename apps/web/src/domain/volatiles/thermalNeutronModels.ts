import { sampleTerrainAtLatLon } from '@/domain/terrain/lolaSouthPoleDemSampler';
import type {
  TemperatureCategory,
  SublimationStability,
  ExtractionMethod,
  VolatileProspectingResult,
} from '@/domain/volatiles/types';

export const WATER_ICE_STABILITY_TEMP_KELVIN = 110.0;
export const DRY_LUNAR_REGOLITH_CPS = 12.8;
export const MIN_LEND_SUPPRESSION_CPS = 6.2;
export const LUNAR_REGOLITH_DENSITY_KG_M3 = 1500.0;

export interface DivinerThermalData {
  tempKelvin: number;
  category: TemperatureCategory;
  stability: SublimationStability;
}

export function evaluateDivinerTemperature(latDeg: number, lonDeg: number): DivinerThermalData {
  const terrain = sampleTerrainAtLatLon(latDeg, lonDeg);
  let tempKelvin = 0;

  if (terrain.isPermanentlyShadowed) {
    const depthFactor = Math.max(0, Math.min(1, -terrain.elevationMeters / 4500));
    tempKelvin = Math.round((45.0 + (1 - depthFactor) * 45.0) * 10) / 10;
  } else {
    const polarDistDeg = 90.0 - Math.abs(latDeg);
    const baseTemp = 130.0 + polarDistDeg * 12.0;
    const elevBoost = Math.max(0, (terrain.elevationMeters / 1000.0) * 8.0);
    tempKelvin = Math.round((baseTemp + elevBoost) * 10) / 10;
  }

  let category: TemperatureCategory;
  let stability: SublimationStability;

  if (tempKelvin < WATER_ICE_STABILITY_TEMP_KELVIN) {
    category = 'cryogenic_cold_trap';
    stability = 'perennially_stable';
  } else if (tempKelvin < 180.0) {
    category = 'sub_freezing_shadow';
    stability = 'geologically_transient';
  } else {
    category = 'illuminated_regolith';
    stability = 'rapidly_sublimating';
  }

  return { tempKelvin, category, stability };
}

export interface LendNeutronData {
  neutronFluxCps: number;
  hydrogenWeightPct: number;
  waterEquivalentHydrogenPct: number;
}

export function evaluateLendNeutronFlux(latDeg: number, lonDeg: number): LendNeutronData {
  const terrain = sampleTerrainAtLatLon(latDeg, lonDeg);
  let neutronFluxCps = DRY_LUNAR_REGOLITH_CPS;
  let hydrogenWeightPct = 0.04;

  if (terrain.isPermanentlyShadowed) {
    const depthFactor = Math.max(0, Math.min(1, -terrain.elevationMeters / 4200));
    neutronFluxCps = Math.round((MIN_LEND_SUPPRESSION_CPS + (1 - depthFactor) * 2.8) * 10) / 10;
    hydrogenWeightPct = Math.round((0.22 + depthFactor * 0.28) * 100) / 100;
  } else {
    const polarDistDeg = 90.0 - Math.abs(latDeg);
    const enhancement = Math.max(0, (7.0 - polarDistDeg) * 0.015);
    hydrogenWeightPct = Math.round((0.04 + enhancement) * 100) / 100;
    neutronFluxCps = Math.round((DRY_LUNAR_REGOLITH_CPS - enhancement * 12.0) * 10) / 10;
  }

  const waterEquivalentHydrogenPct = Math.round(hydrogenWeightPct * 8.936 * 100) / 100;

  return { neutronFluxCps, hydrogenWeightPct, waterEquivalentHydrogenPct };
}

export function prospectVolatilesAtCoordinates(
  latDeg: number,
  lonDeg: number,
): VolatileProspectingResult {
  const terrain = sampleTerrainAtLatLon(latDeg, lonDeg);
  const thermal = evaluateDivinerTemperature(latDeg, lonDeg);
  const neutron = evaluateLendNeutronFlux(latDeg, lonDeg);

  const estimatedIceDensityKgPerM3 =
    Math.round(LUNAR_REGOLITH_DENSITY_KG_M3 * (neutron.waterEquivalentHydrogenPct / 100.0) * 10) /
    10;
  const iceYieldMetricTonsPerHectare = Math.round(estimatedIceDensityKgPerM3 * 10.0);

  let score = 0;
  if (thermal.stability === 'perennially_stable') score += 50;
  else if (thermal.stability === 'geologically_transient') score += 25;

  const concScore = Math.min(35, Math.round((neutron.waterEquivalentHydrogenPct / 3.5) * 35));
  score += concScore;

  if (terrain.slopeDeg > 15.0) score = Math.max(0, score - 20);
  else if (terrain.slopeDeg <= 8.0) score = Math.min(100, score + 15);

  let extractionMethod: ExtractionMethod = 'unviable';
  if (score >= 60 && terrain.slopeDeg <= 15.0) extractionMethod = 'sublimation_tent';
  else if (score >= 35) extractionMethod = 'deep_thermal_coring';

  return {
    coordinates: { latDeg, lonDeg },
    elevationMeters: terrain.elevationMeters,
    isPsr: terrain.isPermanentlyShadowed,
    divinerTempKelvin: thermal.tempKelvin,
    temperatureCategory: thermal.category,
    epithermalNeutronFluxCps: neutron.neutronFluxCps,
    hydrogenWeightPct: neutron.hydrogenWeightPct,
    waterEquivalentHydrogenPct: neutron.waterEquivalentHydrogenPct,
    estimatedIceDensityKgPerM3,
    iceYieldMetricTonsPerHectare,
    sublimationStability: thermal.stability,
    isruFeasibilityScore: score,
    extractionMethod,
  };
}

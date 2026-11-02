/**
 * Volatile Water-Ice Prospecting & In-Situ Resource Utilization (ISRU) Engine
 *
 * Grounded in NASA LRO Diviner surface temperatures, LEND epithermal neutron flux,
 * and LOLA altimetry to evaluate economic viability of water extraction at the lunar south pole.
 */

import { sampleTerrainAtLatLon } from '../terrain/lolaSouthPoleDemSampler';
import { evaluateDivinerTemperature } from './divinerThermalModel';
import { evaluateLendNeutronFlux } from './lendNeutronModel';
import type { ExtractionMethod, VolatileProspectingResult } from '@luna/contracts';

export const LUNAR_REGOLITH_DENSITY_KG_M3 = 1500.0; // Typical Apollo lunar soil core bulk density

export function prospectVolatilesAtCoordinates(
  latDeg: number,
  lonDeg: number,
): VolatileProspectingResult {
  const terrain = sampleTerrainAtLatLon(latDeg, lonDeg);
  const thermal = evaluateDivinerTemperature(latDeg, lonDeg);
  const neutron = evaluateLendNeutronFlux(latDeg, lonDeg);

  // Volatile mass density: kg H2O per cubic meter of regolith
  const estimatedIceDensityKgPerM3 = Math.round(
    LUNAR_REGOLITH_DENSITY_KG_M3 * (neutron.waterEquivalentHydrogenPct / 100.0) * 10,
  ) / 10;

  // Metric tons of H2O per hectare (10,000 m^2) to 1.0 meter excavation depth
  const iceYieldMetricTonsPerHectare = Math.round(
    estimatedIceDensityKgPerM3 * 10.0,
  );

  // ISRU Feasibility Score (0 - 100)
  let score = 0;
  if (thermal.stability === 'perennially_stable') {
    score += 50;
  } else if (thermal.stability === 'geologically_transient') {
    score += 25;
  }

  // Concentration bonus (up to 35 points for WEH >= 3.5%)
  const concScore = Math.min(35, Math.round((neutron.waterEquivalentHydrogenPct / 3.5) * 35));
  score += concScore;

  // Slope accessibility penalty (steep scarps >15° impede autonomous rovers and mining haulers)
  if (terrain.slopeDeg > 15.0) {
    score = Math.max(0, score - 20);
  } else if (terrain.slopeDeg <= 8.0) {
    score = Math.min(100, score + 15);
  }

  // Extraction Architecture
  let extractionMethod: ExtractionMethod = 'unviable';
  if (score >= 60 && terrain.slopeDeg <= 15.0) {
    extractionMethod = 'sublimation_tent';
  } else if (score >= 35) {
    extractionMethod = 'deep_thermal_coring';
  }

  return {
    coordinates: {
      latDeg: Math.round(latDeg * 10000) / 10000,
      lonDeg: Math.round(lonDeg * 10000) / 10000,
    },
    elevationMeters: Math.round(terrain.elevationMeters),
    isPsr: terrain.isPermanentlyShadowed,
    divinerTempKelvin: thermal.tempKelvin,
    temperatureCategory: thermal.category,
    epithermalNeutronFluxCps: neutron.neutronFluxCps,
    hydrogenWeightPct: neutron.hydrogenWeightPct,
    waterEquivalentHydrogenPct: neutron.waterEquivalentHydrogenPct,
    estimatedIceDensityKgPerM3,
    iceYieldMetricTonsPerHectare,
    sublimationStability: thermal.stability,
    isruFeasibilityScore: Math.min(100, Math.max(0, score)),
    extractionMethod,
  };
}

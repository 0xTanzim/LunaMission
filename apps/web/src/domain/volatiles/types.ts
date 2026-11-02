/**
 * Lunar Volatiles & Water-Ice Prospecting Types
 *
 * Grounded in NASA LRO Diviner Thermal Radiometer and LEND Epithermal Neutron Detector data.
 */

export type TemperatureCategory =
  | 'cryogenic_cold_trap'   // <110 K: Perennially stable for water ice
  | 'sub_freezing_shadow'   // 110 K - 180 K: Transient or buried ice
  | 'illuminated_regolith'; // >180 K: Fast sublimation of exposed ice

export type SublimationStability =
  | 'perennially_stable'    // Sublimation loss < 1 mm per billion years
  | 'geologically_transient' // Stable for thousands of years only if buried
  | 'rapidly_sublimating';  // Sublimates in hours to days

export type ExtractionMethod =
  | 'sublimation_tent'      // Inverted thermal canopy for shallow icy regolith
  | 'deep_thermal_coring'   // Down-hole rotary drill with heated auger
  | 'unviable';             // Water concentration below economic threshold

export interface VolatileProspectingResult {
  coordinates: {
    latDeg: number;
    lonDeg: number;
  };
  elevationMeters: number;
  isPsr: boolean;
  divinerTempKelvin: number;
  temperatureCategory: TemperatureCategory;
  epithermalNeutronFluxCps: number;
  hydrogenWeightPct: number;
  waterEquivalentHydrogenPct: number;
  estimatedIceDensityKgPerM3: number;
  iceYieldMetricTonsPerHectare: number;
  sublimationStability: SublimationStability;
  isruFeasibilityScore: number; // 0 - 100
  extractionMethod: ExtractionMethod;
}

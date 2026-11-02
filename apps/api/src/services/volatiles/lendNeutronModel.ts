/**
 * NASA LRO LEND Epithermal Neutron Detector Model
 *
 * Models epithermal neutron flux suppression to estimate water-equivalent hydrogen (WEH).
 * References: Mitrofanov et al. (2010), Sanin et al. (2017) LEND observations.
 */

import { sampleTerrainAtLatLon } from '../terrain/lolaSouthPoleDemSampler';

export const DRY_LUNAR_REGOLITH_CPS = 12.8;
export const MIN_LEND_SUPPRESSION_CPS = 6.2;

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

  return {
    neutronFluxCps,
    hydrogenWeightPct,
    waterEquivalentHydrogenPct,
  };
}

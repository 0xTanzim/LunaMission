/**
 * Mission Power Balance & Battery Simulation (Plan.md § 5 Pillar B.4).
 *
 * Turns an *already-computed* scenario evaluation into an engineering estimate of solar-array
 * electrical output and battery state of charge. No astronomy, no ephemeris call, no horizon
 * ray-march and no new event solving happens here: the inputs are the evaluated solar-disk
 * visibility fraction, the apparent solar elevation/azimuth, and the step duration.
 *
 * Model equations (per step i, duration dt_i in hours; see skill ref 07 for the uncertainty
 * stance and Plan.md § 1 Principle 3 for the "vehicle limits are inputs, not lunar facts" rule):
 *
 *   Rated array output at normal incidence, full disk:  P_rated = S0 * A * eta              [W]
 *   Panel outward unit normal:   n = (cos e_p cos a_p, cos e_p sin a_p, sin e_p)
 *   Sun unit direction:          s = (cos e_s cos a_s, cos e_s sin a_s, sin e_s)
 *   Incidence cosine:            c_i = max(0, n . s) = max(0, sin e_p sin e_s + cos e_p cos e_s cos(a_s - a_p))
 *                                      (horizontal panel: e_p = 90 deg  =>  c_i = max(0, sin e_s))
 *   Array output:                P_array,i = F_vis,i * P_rated * c_i                        [W]
 *   Bus load:                    P_load,i  = P_hotel + P_payload                            [W]
 *   Net power:                   P_net,i   = P_array,i - P_load,i                           [W]
 *   Step energy:                 dE_i      = P_net,i * dt_i                                 [Wh]
 *   Battery SOC:                 SOC_i     = clamp(SOC_(i-1) + dE_i, 0, E_batt)              [Wh]
 *                                SOC%_i    = 100 * SOC_i / E_batt                           [%]
 *   Unserved load energy:        max(0, -(SOC_(i-1) + dE_i))                                [Wh]
 *   Curtailed (surplus) energy:  max(0,  (SOC_(i-1) + dE_i) - E_batt)                       [Wh]
 *   DoD floor:                   E_floor   = E_batt * (1 - DoD)                             [Wh]
 *
 * Invariant: **solar-disk visibility is not generated electrical power.** Every value returned
 * here is an estimate under explicit, user-supplied hardware parameters and is labelled as such;
 * the assumptions that make it an estimate travel with the payload.
 */

import {
  MAX_POWER_BALANCE_STEPS,
  powerBalanceRequestSchema,
  type PanelOrientation,
  type PowerBalanceRequestInput,
  type PowerBalanceResult,
  type PowerBalanceStep,
  type SolarPowerStepInput,
} from '@luna/contracts';
import {
  HORIZONTAL_PANEL_ASSUMPTION,
  POWER_BALANCE_RESULT_LABEL,
  POWER_MODEL_ASSUMPTIONS,
  POWER_MODEL_LIMITATIONS,
} from './powerModelAssumptions';

const DEG_TO_RAD = Math.PI / 180;
const MS_PER_HOUR = 3_600_000;
/** Floating-point slack when comparing an SOC against the DoD floor, Wh. */
const SOC_EPSILON_WH = 1e-9;

/** Structural source of one evaluated step: exactly the `sun` field of a sub-interval. */
export interface EvaluatedSolarStepSource {
  startEpochMs: number;
  endEpochMs: number;
  sun: {
    meanElevationDeg: number;
    meanAzimuthDeg: number;
    fractionalSolarDiskVisibility: number;
    irradianceWeightedDiskFraction?: number;
  };
}

function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

/** Panel outward normal in the local topocentric frame (elevation above local horizontal). */
interface PanelNormal {
  azimuthDeg: number;
  elevationDeg: number;
  description: string;
}

function resolvePanelNormal(orientation: PanelOrientation | undefined): PanelNormal {
  if (!orientation || orientation.kind === 'horizontal') {
    return {
      azimuthDeg: 0,
      elevationDeg: 90,
      description: HORIZONTAL_PANEL_ASSUMPTION,
    };
  }
  return {
    azimuthDeg: orientation.normalAzimuthDeg,
    elevationDeg: orientation.normalElevationDeg,
    description:
      `Fixed panel normal supplied as an explicit mission input: azimuth ` +
      `${orientation.normalAzimuthDeg} deg east of local north, elevation ` +
      `${orientation.normalElevationDeg} deg above the local horizontal.`,
  };
}

/**
 * `max(0, n . s)`: the cosine of the incidence angle for a panel with outward normal `n` and
 * an incident solar direction `s`. Negative values (back-lit panel) are clamped to zero.
 */
function incidenceCosine(normal: PanelNormal, solarAzimuthDeg: number, solarElevationDeg: number): number {
  const eP = normal.elevationDeg * DEG_TO_RAD;
  const eS = solarElevationDeg * DEG_TO_RAD;
  const deltaAz = (solarAzimuthDeg - normal.azimuthDeg) * DEG_TO_RAD;
  const raw = Math.sin(eP) * Math.sin(eS) + Math.cos(eP) * Math.cos(eS) * Math.cos(deltaAz);
  return Math.min(1, Math.max(0, raw));
}

/**
 * Computes the power balance / battery simulation for a validated request.
 *
 * Throws a `ZodError` when the request violates the contract (invalid parameters, empty step
 * list, non-increasing step bounds, out-of-range disk fraction). No silent clamping of the
 * *inputs* is performed: only the incidence cosine and the battery SOC are clamped, and those
 * clamps are physical (back-lit panel, battery energy limits).
 */
export function computePowerBalance(request: PowerBalanceRequestInput): PowerBalanceResult {
  const { parameters, steps: inputSteps } = powerBalanceRequestSchema.parse(request);

  const normal = resolvePanelNormal(parameters.panelOrientation);
  const ratedArrayOutputW =
    parameters.solarIrradianceWPerM2 * parameters.solarArrayAreaM2 * parameters.arrayEfficiency;
  const loadW = parameters.baseHotelLoadW + parameters.payloadLoadW;
  const capacityWh = parameters.batteryCapacityWh;
  const minimumAllowedStateOfChargeWh = capacityWh * (1 - parameters.depthOfDischargeLimit);

  let socWh = Math.min(capacityWh, Math.max(0, capacityWh * parameters.initialStateOfChargeFraction));
  let minimumStateOfChargeWh = socWh;
  let finalStateOfChargeWh = socWh;

  let cumulativeSolarEnergyWh = 0;
  let cumulativeLoadEnergyWh = 0;
  let cumulativeCurtailedEnergyWh = 0;
  let cumulativeEnergyDeficitWh = 0;
  let totalDurationHours = 0;
  let chargeSaturationReached = false;
  let depletionReached = false;

  const steps: PowerBalanceStep[] = [];

  for (const input of inputSteps) {
    const durationHours = (input.endEpochMs - input.startEpochMs) / MS_PER_HOUR;
    const cosine = incidenceCosine(normal, input.solarAzimuthDeg, input.solarElevationDeg);

    // Limb-darkened irradiance fraction is the correct solar flux proxy; the geometric
    // area fraction over-weights the dimmer limb. Fall back only when it was not supplied.
    const irradianceWeightedInputUsed = input.irradianceWeightedDiskFraction !== undefined;
    const fluxFraction = irradianceWeightedInputUsed
      ? input.irradianceWeightedDiskFraction!
      : input.fractionalSolarDiskVisibility;

    // Estimate only: flux fraction x rated output x incidence cosine.
    const solarArrayOutputW = fluxFraction * ratedArrayOutputW * cosine;
    const netPowerW = solarArrayOutputW - loadW;
    const stepEnergyWh = netPowerW * durationHours;

    const unboundedSocWh = socWh + stepEnergyWh;
    const unservedLoadWh = unboundedSocWh < 0 ? -unboundedSocWh : 0;
    const curtailedEnergyWh = unboundedSocWh > capacityWh ? unboundedSocWh - capacityWh : 0;
    socWh = Math.min(capacityWh, Math.max(0, unboundedSocWh));

    const belowDepthOfDischargeFloor = socWh < minimumAllowedStateOfChargeWh - SOC_EPSILON_WH;
    minimumStateOfChargeWh = Math.min(minimumStateOfChargeWh, socWh);

    cumulativeSolarEnergyWh += solarArrayOutputW * durationHours;
    cumulativeLoadEnergyWh += loadW * durationHours;
    cumulativeCurtailedEnergyWh += curtailedEnergyWh;
    cumulativeEnergyDeficitWh += unservedLoadWh;
    totalDurationHours += durationHours;
    if (curtailedEnergyWh > 0) chargeSaturationReached = true;
    if (unservedLoadWh > 0) depletionReached = true;
    finalStateOfChargeWh = socWh;

    steps.push({
      startEpochMs: input.startEpochMs,
      endEpochMs: input.endEpochMs,
      startDateUtc: new Date(input.startEpochMs).toISOString(),
      endDateUtc: new Date(input.endEpochMs).toISOString(),
      durationHours: round(durationHours),
      solarElevationDeg: round(input.solarElevationDeg, 6),
      solarAzimuthDeg: round(input.solarAzimuthDeg, 6),
      fractionalSolarDiskVisibility: round(input.fractionalSolarDiskVisibility, 6),
      irradianceWeightedDiskFraction:
        input.irradianceWeightedDiskFraction === undefined
          ? undefined
          : round(input.irradianceWeightedDiskFraction, 6),
      irradianceWeightedInputUsed,
      panelIncidenceAngleDeg: round(Math.acos(cosine) / DEG_TO_RAD, 6),
      panelIncidenceCosine: round(cosine, 9),
      solarArrayOutputW: round(solarArrayOutputW),
      loadW: round(loadW),
      netPowerW: round(netPowerW),
      stateOfChargeWh: round(socWh),
      stateOfChargePercent: round((100 * socWh) / capacityWh),
      unservedLoadWh: round(unservedLoadWh),
      curtailedEnergyWh: round(curtailedEnergyWh),
      belowDepthOfDischargeFloor,
    });
  }

  const minimumStateOfChargePercent = (100 * minimumStateOfChargeWh) / capacityWh;
  const depthOfDischargeRespected = minimumStateOfChargeWh >= minimumAllowedStateOfChargeWh - SOC_EPSILON_WH;
  const cumulativeNetEnergyWh = cumulativeSolarEnergyWh - cumulativeLoadEnergyWh;

  return {
    resultClass: 'engineering_estimate',
    observable: 'estimated_electrical_power_from_geometric_solar_disk_visibility',
    status: 'approximate',
    label: POWER_BALANCE_RESULT_LABEL,
    ratedArrayOutputW: round(ratedArrayOutputW),
    totalDurationHours: round(totalDurationHours),
    steps,
    totals: {
      cumulativeSolarEnergyWh: round(cumulativeSolarEnergyWh),
      cumulativeLoadEnergyWh: round(cumulativeLoadEnergyWh),
      cumulativeNetEnergyWh: round(cumulativeNetEnergyWh),
      cumulativeCurtailedEnergyWh: round(cumulativeCurtailedEnergyWh),
      cumulativeEnergyDeficitWh: round(cumulativeEnergyDeficitWh),
    },
    battery: {
      capacityWh: round(capacityWh),
      depthOfDischargeLimit: parameters.depthOfDischargeLimit,
      initialStateOfChargeFraction: parameters.initialStateOfChargeFraction,
      minimumAllowedStateOfChargeWh: round(minimumAllowedStateOfChargeWh),
      minimumAllowedStateOfChargePercent: round((100 * minimumAllowedStateOfChargeWh) / capacityWh),
      minimumStateOfChargeWh: round(minimumStateOfChargeWh),
      minimumStateOfChargePercent: round(minimumStateOfChargePercent),
      finalStateOfChargeWh: round(finalStateOfChargeWh),
      finalStateOfChargePercent: round((100 * finalStateOfChargeWh) / capacityWh),
      chargeSaturationReached,
      depletionReached,
      depthOfDischargeRespected,
      depthOfDischargeBreachWh: round(
        Math.max(0, minimumAllowedStateOfChargeWh - minimumStateOfChargeWh),
      ),
    },
    assumptions: [normal.description, ...POWER_MODEL_ASSUMPTIONS],
    limitations: [...POWER_MODEL_LIMITATIONS],
  };
}

/** Maximum number of steps accepted by `computePowerBalance`, re-exported for callers. */
export const POWER_BALANCE_STEP_LIMIT = MAX_POWER_BALANCE_STEPS;

/**
 * Adapts evaluated scenario sub-intervals (structurally: their `sun` block) into power-model
 * steps. Re-uses the visibility solver's already-computed mean elevation, mean azimuth and
 * geometric disk fraction — this is a shape adaptation, not a new computation.
 */
export function powerStepsFromEvaluatedSubIntervals(
  intervals: readonly EvaluatedSolarStepSource[],
): SolarPowerStepInput[] {
  return intervals.map((interval) => ({
    startEpochMs: interval.startEpochMs,
    endEpochMs: interval.endEpochMs,
    solarElevationDeg: interval.sun.meanElevationDeg,
    solarAzimuthDeg: interval.sun.meanAzimuthDeg,
    fractionalSolarDiskVisibility: interval.sun.fractionalSolarDiskVisibility,
    ...(interval.sun.irradianceWeightedDiskFraction === undefined
      ? {}
      : { irradianceWeightedDiskFraction: interval.sun.irradianceWeightedDiskFraction }),
  }));
}

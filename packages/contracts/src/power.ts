import { z } from 'zod';
import { evaluationStatusEnum } from './common';

/**
 * Mission Power Balance & Battery Simulation contracts (Plan.md § 5 Pillar B.4).
 *
 * Scope: schemas, DTOs and documented defaults only. All arithmetic lives in
 * `apps/api/src/services/operations/powerBalance.ts`.
 *
 * Governing invariant (lunar-landing-site-science SKILL.md § "Scientific invariants"):
 * **solar-disk visibility is not generated electrical power.** A visible-disk fraction is a
 * geometric/irradiance observable; converting it into watts requires explicit, mission-
 * configurable hardware parameters (Plan.md § 1 Principle 3). Every payload produced from
 * these schemas is therefore labelled an *engineering estimate* and carries its assumptions.
 *
 * Units convention: metres (m), square metres (m²), watts (W), watt-hours (Wh), degrees (°),
 * UTC epoch milliseconds (ms), hours (h).
 */

/**
 * Mean total solar irradiance at 1 AU (TSI), W/m².
 *
 * This is a *default model parameter*, not a lunar fact: it is the mean TSI at one
 * astronomical unit, and the user may override `solarIrradianceWPerM2`. The ~±3.4 %
 * annual Earth–Sun distance variation and solar-cycle variability are not modelled.
 */
export const SOLAR_IRRADIANCE_AT_1_AU_W_PER_M2 = 1361;

/** Hard bound on the number of power steps accepted in one request (DoS guard). */
export const MAX_POWER_BALANCE_STEPS = 50_000;

/** Panel normal fixed to the local zenith; a documented simplified installation. */
export const horizontalPanelOrientationSchema = z.object({
  kind: z.literal('horizontal'),
});
export type HorizontalPanelOrientation = z.infer<typeof horizontalPanelOrientationSchema>;

/**
 * Panel outward normal fixed in the local topocentric horizontal frame:
 * azimuth east-positive from local north `[0°, 360°)`, elevation above the local
 * horizontal `[-90°, +90°]`. No tracking, gimbal limits or body self-shading are modelled.
 */
export const fixedNormalPanelOrientationSchema = z.object({
  kind: z.literal('fixed_normal'),
  normalAzimuthDeg: z.number().finite().min(0).lt(360),
  normalElevationDeg: z.number().finite().min(-90).max(90),
});
export type FixedNormalPanelOrientation = z.infer<typeof fixedNormalPanelOrientationSchema>;

export const panelOrientationSchema = z.discriminatedUnion('kind', [
  horizontalPanelOrientationSchema,
  fixedNormalPanelOrientationSchema,
]);
export type PanelOrientation = z.infer<typeof panelOrientationSchema>;

/**
 * Explicit mission/vehicle model parameters. None of these is a lunar physical constant:
 * they are the mission designer's inputs (Plan.md § 1 Principle 3).
 */
export const powerModelParametersSchema = z.object({
  /** Total solar-array area, m². */
  solarArrayAreaM2: z.number().finite().positive(),
  /** Nameplate array efficiency (electrical out / irradiance incident), fraction in (0, 1]. */
  arrayEfficiency: z.number().finite().gt(0).lte(1),
  /** Irradiance at normal incidence used by the model, W/m². Defaults to mean TSI at 1 AU. */
  solarIrradianceWPerM2: z.number().finite().positive().default(SOLAR_IRRADIANCE_AT_1_AU_W_PER_M2),
  /** Installed battery energy capacity, Wh. */
  batteryCapacityWh: z.number().finite().positive(),
  /** Fraction of capacity that may be withdrawn before the vehicle DoD limit is violated, (0, 1]. */
  depthOfDischargeLimit: z.number().finite().gt(0).lte(1),
  /** Continuous spacecraft housekeeping load, W. */
  baseHotelLoadW: z.number().finite().nonnegative(),
  /** Continuous payload load, W. */
  payloadLoadW: z.number().finite().nonnegative(),
  /** State of charge at the first step, fraction of capacity in [0, 1]. Defaults to full. */
  initialStateOfChargeFraction: z.number().finite().min(0).max(1).default(1),
  /**
   * Panel orientation. When omitted, the documented horizontal (zenith-facing) panel
   * assumption is applied and reported in the result's assumptions.
   */
  panelOrientation: panelOrientationSchema.optional(),
});
export type PowerModelParameters = z.infer<typeof powerModelParametersSchema>;
export const PowerModelParametersSchema = powerModelParametersSchema;

/**
 * One evaluated time step. All fields are taken from an already-computed scenario
 * evaluation (see `EvaluatedSubInterval.sun`): no astronomy, ephemeris or horizon
 * work is performed by the power model.
 */
export const solarPowerStepInputSchema = z
  .object({
    startEpochMs: z.number().finite(),
    endEpochMs: z.number().finite(),
    /** Apparent solar centre elevation above the local horizontal, degrees. */
    solarElevationDeg: z.number().finite().min(-90).max(90),
    /** Apparent solar centre azimuth, degrees east-positive from local north. */
    solarAzimuthDeg: z.number().finite(),
    /** Geometric visible fraction of the solar disk, `[0, 1]`, from the visibility solver. */
    fractionalSolarDiskVisibility: z.number().finite().min(0).max(1),
    /**
     * Limb-darkened visible irradiance fraction from the finite-disk integrator, `[0, 1]`.
     * Preferred over the geometric fraction as the solar flux proxy when present; absent
     * for legacy sub-intervals that predate the field.
     */
    irradianceWeightedDiskFraction: z.number().finite().min(0).max(1).optional(),
  })
  .refine((step) => step.endEpochMs > step.startEpochMs, {
    message: 'endEpochMs must be strictly greater than startEpochMs',
    path: ['endEpochMs'],
  });
export type SolarPowerStepInput = z.infer<typeof solarPowerStepInputSchema>;
export const SolarPowerStepInputSchema = solarPowerStepInputSchema;

export const powerBalanceRequestSchema = z.object({
  parameters: powerModelParametersSchema,
  steps: z
    .array(solarPowerStepInputSchema)
    .min(1, 'at least one evaluated solar step is required')
    .max(MAX_POWER_BALANCE_STEPS, `at most ${MAX_POWER_BALANCE_STEPS} power steps are accepted`),
});
export type PowerBalanceRequest = z.infer<typeof powerBalanceRequestSchema>;
export const PowerBalanceRequestSchema = powerBalanceRequestSchema;
/**
 * Caller-side (pre-default) request shape: `solarIrradianceWPerM2` and
 * `initialStateOfChargeFraction` may be omitted and then take the documented defaults.
 */
export type PowerBalanceRequestInput = z.input<typeof powerBalanceRequestSchema>;

/** Per-step engineering-estimate output. All powers in W, energies in Wh. */
export const powerBalanceStepSchema = z.object({
  startEpochMs: z.number(),
  endEpochMs: z.number(),
  startDateUtc: z.string(),
  endDateUtc: z.string(),
  durationHours: z.number().positive(),
  solarElevationDeg: z.number(),
  solarAzimuthDeg: z.number(),
  fractionalSolarDiskVisibility: z.number().min(0).max(1),
  /** Irradiance-weighted disk fraction actually used as the flux proxy, when supplied. */
  irradianceWeightedDiskFraction: z.number().min(0).max(1).optional(),
  /** True when the limb-darkened fraction drove the flux term instead of the geometric one. */
  irradianceWeightedInputUsed: z.boolean(),
  /** Angle between the panel outward normal and the apparent solar centre, degrees. */
  panelIncidenceAngleDeg: z.number().min(0).max(90),
  /** `max(0, n̂_panel · ŝ_sun)`, dimensionless `[0, 1]`; 0 when the panel is back-lit. */
  panelIncidenceCosine: z.number().min(0).max(1),
  /** Estimated solar-array electrical output for this step, W (>= 0). */
  solarArrayOutputW: z.number().nonnegative(),
  /** Modelled bus load (hotel + payload), W. */
  loadW: z.number().nonnegative(),
  /** `solarArrayOutputW - loadW`, W (signed: negative means the battery supplies the bus). */
  netPowerW: z.number(),
  /** Battery state of charge at the end of this step, Wh, within `[0, capacityWh]`. */
  stateOfChargeWh: z.number().nonnegative(),
  /** Battery state of charge at the end of this step, % within `[0, 100]`. */
  stateOfChargePercent: z.number().min(0).max(100),
  /** Load energy the empty battery could not deliver during this step, Wh (>= 0). */
  unservedLoadWh: z.number().nonnegative(),
  /** Surplus generation discarded because the battery was already full, Wh (>= 0). */
  curtailedEnergyWh: z.number().nonnegative(),
  /** True when the end-of-step SOC is below `capacityWh × (1 - depthOfDischargeLimit)`. */
  belowDepthOfDischargeFloor: z.boolean(),
});
export type PowerBalanceStep = z.infer<typeof powerBalanceStepSchema>;

export const powerBalanceTotalsSchema = z.object({
  /** Σ array output × duration, Wh. */
  cumulativeSolarEnergyWh: z.number(),
  /** Σ load × duration, Wh. */
  cumulativeLoadEnergyWh: z.number(),
  /** `cumulativeSolarEnergyWh - cumulativeLoadEnergyWh`, Wh (signed). */
  cumulativeNetEnergyWh: z.number(),
  /** Surplus generation discarded on a full battery, Wh. */
  cumulativeCurtailedEnergyWh: z.number().nonnegative(),
  /**
   * Cumulative energy deficit: load energy demanded while the battery was empty and could
   * not be supplied, Wh. This is unmet demand, not gross battery discharge.
   */
  cumulativeEnergyDeficitWh: z.number().nonnegative(),
});
export type PowerBalanceTotals = z.infer<typeof powerBalanceTotalsSchema>;

export const powerBalanceBatterySummarySchema = z.object({
  capacityWh: z.number().positive(),
  depthOfDischargeLimit: z.number().gt(0).lte(1),
  initialStateOfChargeFraction: z.number().min(0).max(1),
  /** `capacityWh × (1 - depthOfDischargeLimit)`, Wh: the mission DoD floor. */
  minimumAllowedStateOfChargeWh: z.number().nonnegative(),
  minimumAllowedStateOfChargePercent: z.number().min(0).max(100),
  /** Lowest modelled SOC over the run (start-of-run SOC included), Wh. */
  minimumStateOfChargeWh: z.number().nonnegative(),
  minimumStateOfChargePercent: z.number().min(0).max(100),
  finalStateOfChargeWh: z.number().nonnegative(),
  finalStateOfChargePercent: z.number().min(0).max(100),
  /** True when generation exceeded load with the battery at full capacity. */
  chargeSaturationReached: z.boolean(),
  /** True when the battery reached 0 Wh and load could no longer be supplied. */
  depletionReached: z.boolean(),
  /** True when `minimumStateOfChargeWh` stayed at or above the DoD floor. */
  depthOfDischargeRespected: z.boolean(),
  /** Depth below the DoD floor, Wh (0 when respected). */
  depthOfDischargeBreachWh: z.number().nonnegative(),
});
export type PowerBalanceBatterySummary = z.infer<typeof powerBalanceBatterySummarySchema>;

export const powerBalanceResultSchema = z.object({
  /** Literal discriminator: this payload is a model estimate, never a measured capability. */
  resultClass: z.literal('engineering_estimate'),
  /** The quantity actually computed, stated explicitly to prevent observables being conflated. */
  observable: z.literal('estimated_electrical_power_from_geometric_solar_disk_visibility'),
  status: evaluationStatusEnum,
  /** User-facing one-line label for the whole result. */
  label: z.string().min(1),
  /** Estimated array output at normal incidence and full visible disk, `S0 × A × η`, W. */
  ratedArrayOutputW: z.number().nonnegative(),
  totalDurationHours: z.number().positive(),
  steps: z.array(powerBalanceStepSchema).min(1),
  totals: powerBalanceTotalsSchema,
  battery: powerBalanceBatterySummarySchema,
  /** Model assumptions surfaced to the user (nonzero length by construction). */
  assumptions: z.array(z.string()).min(1),
  /** Structural limitations of the model (unmodelled physics). */
  limitations: z.array(z.string()).min(1),
});
export type PowerBalanceResult = z.infer<typeof powerBalanceResultSchema>;
export const PowerBalanceResultSchema = powerBalanceResultSchema;

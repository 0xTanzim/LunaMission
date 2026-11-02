/**
 * User-facing disclosure text for the mission power-balance model (Plan.md § 5 Pillar B.4).
 *
 * Kept separate from `powerBalance.ts` so the wording — which is the scientific honesty
 * surface of the module — can be reviewed and asserted independently of the arithmetic.
 *
 * Governing invariant: **solar-disk visibility is not generated electrical power.** The
 * power model turns a geometric visible-disk fraction into an *estimate* of array electrical
 * output. Nothing here may be described as guaranteed, assured or unconditionally available.
 */

/** One-line label attached to every power-balance payload. */
export const POWER_BALANCE_RESULT_LABEL =
  'Engineering estimate of electrical power and battery state of charge from evaluated ' +
  'solar-disk visibility — not a flight-qualified power model and not a guarantee of power';

/** Applied when the caller supplies no panel orientation. */
export const HORIZONTAL_PANEL_ASSUMPTION =
  'No panel orientation was supplied: a horizontal (zenith-facing) panel is assumed, so the ' +
  'incidence cosine equals sin(solar elevation) and the panel is back-lit for any solar ' +
  'elevation below the local horizontal.';

/**
 * Model assumptions surfaced verbatim in every result. Each entry states the model choice,
 * its unit/parameter, and what it costs the reader.
 */
export const POWER_MODEL_ASSUMPTIONS: readonly string[] = [
  'Irradiance: flux at normal incidence is the mean total solar irradiance at 1 AU ' +
    '(1361 W/m^2) unless overridden by solarIrradianceWPerM2. Annual solar-distance ' +
    'variation (+/-3.4 %), solar-cycle variability and lunar distance from the Sun ' +
    '(about 1 AU) are not modelled.',
  'Disk fraction as a flux proxy: when the sub-interval carries irradianceWeightedDiskFraction ' +
    '(limb-darkened visible irradiance fraction from the finite-disk integrator) it is used as ' +
    'the solar flux term. Only when that field is absent does the model fall back to the ' +
    'geometric fractionalSolarDiskVisibility, which over-weights the dimmer limb of a partially ' +
    'obscured disk. Each step reports irradianceWeightedInputUsed so the fallback is visible.',
  'Single-point efficiency: arrayEfficiency is applied as a constant nameplate efficiency at ' +
    'every incidence angle and temperature. No temperature derating, low-irradiance ' +
    'efficiency loss, MPPT/converter, harness or dust losses, and no mission-life ' +
    'degradation are modelled.',
  'Fixed panel geometry: the panel normal is fixed for the whole run (explicit ' +
    'azimuth/elevation, or the documented horizontal assumption). No sun tracking, ' +
    'articulation, gimbal travel limit, or shading of the array by the lander body or ' +
    'terrain is modelled.',
  'Pointing convention: incidence uses the apparent solar disk centre direction. Redistribution ' +
    'of irradiance across a partially occluded disk near the local horizon is not modelled.',
  'Zero-order hold: each step is piecewise constant over [startEpochMs, endEpochMs) with the ' +
    'evaluation interval mean as its value, and energy is integrated as power x step duration. ' +
    'Sub-step transients, including eclipse-entry/exit ramps, are unresolved.',
  'Ideal battery: the battery is an ideal energy reservoir with no round-trip charge/discharge ' +
    'efficiency loss, no internal resistance or voltage cut-off curve, no charge-rate (C-rate) ' +
    'limit, no thermal limit and no cell-to-cell imbalance.',
  'Constant load: bus load is baseHotelLoadW + payloadLoadW held constant across every step. ' +
    'No duty cycles, peak draws, thermostatic heater cycling, or load shedding are modelled.',
  'DoD as a constraint flag: depthOfDischargeLimit is evaluated against the minimum state of ' +
    'charge. The model discharges physically to 0 Wh (where load becomes unserved) rather than ' +
    'shedding load at the DoD floor.',
  'Surplus is discarded: generation above load with a full battery is curtailed (reported), ' +
    'not stored, redirected or used to raise the load.',
];

/**
 * Structural model limitations — physics that is absent from the computation entirely
 * (skill reference 07 § 1 "Structural" row), as opposed to a chosen modelling convention.
 */
export const POWER_MODEL_LIMITATIONS: readonly string[] = [
  'No thermal model: battery heater demand, radiator capacity, and array temperature are ' +
    'absent, so both generation and housekeeping load are temperature-independent here.',
  'No radiation, micrometeoroid, dust-accumulation or ageing effects on arrays or cells.',
  'No converter, regulator, bus or distribution losses beyond the single arrayEfficiency term.',
  'No redundancy or single-fault behaviour: the model has one array and one battery.',
  'No uncertainty propagation: vehicle parameters are taken at face value as supplied ' +
    '(Plan.md § 1 Principle 3), and the visibility-solver and DEM uncertainty envelope is not ' +
    'carried into the power result. A sensitivity study must vary inputs explicitly.',
  'Per-step values are interval means of the geometry, so very short partial-limb steps can ' +
    'be smeared across the full step duration.',
];

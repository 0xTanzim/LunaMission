/**
 * Engine and Provenance Identity
 * Single source of truth for the identifiers published in a scenario provenance manifest and
 * for the content-addressable cache key. Folding this identity into the cache key means a
 * solver, terrain-product or algorithm change can never be served from a stale cached result.
 */

export const ENGINE_VERSION = 'LunaMission-Engine-2.0.0';
export const SOLVER_ALGORITHM = 'ROLLE_HERMITE_BRENT_EVENT_SPLITTER';
export const EPHEMERIS_SOURCE = 'NASA_JPL_HORIZONS_API_COORD_301';
export const EPHEMERIS_DATASET = 'DE421/DE440';
export const TERRAIN_PRODUCT_ID = 'NASA_LOLA_PDS_LDEM_85S_20M';
export const TERRAIN_RESOLUTION_M = 20.0;
export const HORIZON_AZIMUTH_BINS = 360;
export const ROOT_BRACKET_TOLERANCE_SEC = 1.0;
export const TANGENTIAL_GRAZE_TOLERANCE_DEG = 1e-7;

/**
 * Solar is certified on the any-limb (upper_limb) criterion of masterplan § 6.2: the upper
 * limb of the apparent disk against the skyline minimum over the disk's azimuth footprint.
 * Earth contact keeps the centre criterion, which is geometric line-of-sight to the sub-Earth
 * point and is not a full-disk or RF-link statement.
 */
export const SOLVER_CONFIG: Readonly<Record<string, number | string | boolean>> = {
  sunLimbCriterion: 'upper_limb_footprint_min',
  earthLimbCriterion: 'center',
  rootBracketToleranceSec: ROOT_BRACKET_TOLERANCE_SEC,
  tangentialGrazeToleranceDeg: TANGENTIAL_GRAZE_TOLERANCE_DEG,
};

export const ALGORITHM_VERSION = `${ENGINE_VERSION}/${SOLVER_ALGORITHM}`;

/**
 * Multi-objective ranking identity (Plan.md § 6.5). Part of the cache fingerprint because the
 * rank assignment is a published output: a comparison cached before the Pareto frontier existed
 * has no `paretoFrontier` field, and serving that entry would silently hide f5's unavailability.
 */
export const PARETO_METHOD = 'NON_DOMINATED_SORT_EXACT_NO_SCALARISATION';

/**
 * C13 decision-trace contract version. Folded into the comparison cache key: a comparison cached
 * before the trace existed carries no explanation, and serving it would silently hide exactly the
 * evidence the trace publishes.
 */
export const DECISION_TRACE_VERSION = '1.0.0';

/** Included in the scenario cache key so a model change invalidates cached evaluations. */
export const ENGINE_FINGERPRINT = [
  ENGINE_VERSION,
  SOLVER_ALGORITHM,
  EPHEMERIS_DATASET,
  TERRAIN_PRODUCT_ID,
  String(TERRAIN_RESOLUTION_M),
  String(HORIZON_AZIMUTH_BINS),
  SOLVER_CONFIG.sunLimbCriterion,
  SOLVER_CONFIG.earthLimbCriterion,
  String(SOLVER_CONFIG.rootBracketToleranceSec),
  PARETO_METHOD,
].join('|');

/**
 * C13 Decision-Trace Evidence Catalogue
 *
 * Single source of truth for (a) which dataset and solver produce each gated number, (b) how each
 * configured vehicle limit is phrased in physical units, and (c) which capabilities would have
 * informed the decision but carry no data in this data model.
 *
 * Nothing here is a measurement. These are descriptors, so a reader can see for every deciding
 * number which product it came from (skill ref 07 § 7: nominal result, drivers, assumptions and
 * unresolved structural risks must be published together) and can never mistake an absent
 * capability for a favourable result.
 */

import type {
  ConstraintName,
  DecisionTraceMetricId,
  VehicleConstraints,
} from '@luna/contracts';
import {
  EPHEMERIS_DATASET,
  EPHEMERIS_SOURCE,
  SOLVER_ALGORITHM,
  TERRAIN_PRODUCT_ID,
} from './engineIdentity';

export interface GatedMetricDefinition {
  readonly metricId: DecisionTraceMetricId;
  /** Lower-case clause used to open a margin sentence. */
  readonly label: string;
  readonly unit: string;
  /** Path inside the evaluate response the nominal value is read from. */
  readonly field: string;
  readonly datasetId: string;
  readonly datasetRole: 'terrain_horizon' | 'site_topography' | 'ephemeris';
  readonly algorithm: string;
  readonly note: string;
}

const HORIZON_NOTE = `skyline from data/curated-horizons.json (${TERRAIN_PRODUCT_ID}) evaluated against topocentric ${EPHEMERIS_DATASET} states from ${EPHEMERIS_SOURCE}`;

export const GATED_METRICS: Readonly<Record<DecisionTraceMetricId, GatedMetricDefinition>> = {
  longestContinuousSunlightHours: {
    metricId: 'longestContinuousSunlightHours',
    label: 'max continuous sunlight',
    unit: 'h',
    field: 'metrics.longestContinuousSunlitWindowHours',
    datasetId: TERRAIN_PRODUCT_ID,
    datasetRole: 'terrain_horizon',
    algorithm: SOLVER_ALGORITHM,
    note: HORIZON_NOTE,
  },
  maxContinuousDarknessHours: {
    metricId: 'maxContinuousDarknessHours',
    label: 'max continuous shadow',
    unit: 'h',
    field: 'metrics.longestContinuousDarkWindowHours',
    datasetId: TERRAIN_PRODUCT_ID,
    datasetRole: 'terrain_horizon',
    algorithm: SOLVER_ALGORITHM,
    note: HORIZON_NOTE,
  },
  cumulativeDteHours: {
    metricId: 'cumulativeDteHours',
    label: 'cumulative direct-to-Earth contact',
    unit: 'h',
    field: 'metrics.cumulativeDteHours',
    datasetId: EPHEMERIS_DATASET,
    datasetRole: 'ephemeris',
    algorithm: SOLVER_ALGORITHM,
    note: `Earth centre line-of-sight from ${EPHEMERIS_SOURCE}, occluded by the ${TERRAIN_PRODUCT_ID} skyline; geometric line-of-sight only, not an RF link budget`,
  },
  nominalPointSlopeDeg: {
    metricId: 'nominalPointSlopeDeg',
    label: 'nominal point slope',
    unit: '°',
    field: 'metrics.landingSlopeDeg',
    datasetId: 'PGDA_PRODUCT_78_LOLA_TOPOGRAPHY_PROFILE',
    datasetRole: 'site_topography',
    algorithm: 'LOLA_48_POINT_ALTIMETRIC_TRANSECT_MAX_SLOPE',
    note: 'one nominal slope at the registered coordinate; no dispersion, no quantile, no area weighting (ADR-05)',
  },
};

export interface ConstraintDefinition {
  readonly constraintName: ConstraintName;
  readonly metricId: DecisionTraceMetricId;
  readonly relation: 'at_least' | 'at_most';
  /** Noun phrase for the configured limit, used in the margin sentence. */
  readonly thresholdNoun: string;
}

export const CONSTRAINT_DEFINITIONS: Readonly<Record<ConstraintName, ConstraintDefinition>> = {
  minContinuousSunlight: {
    constraintName: 'minContinuousSunlight',
    metricId: 'longestContinuousSunlightHours',
    relation: 'at_least',
    thresholdNoun: 'endurance requirement',
  },
  maxContinuousDarkness: {
    constraintName: 'maxContinuousDarkness',
    metricId: 'maxContinuousDarknessHours',
    relation: 'at_most',
    thresholdNoun: 'battery allowance',
  },
  minDte: {
    constraintName: 'minDte',
    metricId: 'cumulativeDteHours',
    relation: 'at_least',
    thresholdNoun: 'direct-to-Earth contact requirement',
  },
  maxLandingSlope: {
    constraintName: 'maxLandingSlope',
    metricId: 'nominalPointSlopeDeg',
    relation: 'at_most',
    thresholdNoun: 'tip-over limit',
  },
};

/** Fixed order, so a trace is byte-stable for identical inputs. */
export const CONSTRAINT_ORDER: readonly ConstraintName[] = [
  'minContinuousSunlight',
  'maxContinuousDarkness',
  'minDte',
  'maxLandingSlope',
];

export function readConstraintLimit(constraints: VehicleConstraints, name: ConstraintName): number {
  switch (name) {
    case 'minContinuousSunlight':
      return constraints.minContinuousSunlightHours;
    case 'maxContinuousDarkness':
      return constraints.maxContinuousDarknessHours;
    case 'minDte':
      return constraints.minDteHours;
    case 'maxLandingSlope':
      return constraints.maxLandingSlopeDeg;
  }
}

export interface UnavailableCapability {
  readonly capabilityId: string;
  readonly label: string;
  readonly appliesToConstraints: readonly ConstraintName[];
  readonly consequence: string;
}

/**
 * Capabilities this data model genuinely lacks. Each entry states what the decision may NOT be
 * read as, so a rendered trace cannot turn a gap into an implied guarantee.
 */
export const UNAVAILABLE_CAPABILITIES: readonly UnavailableCapability[] = [
  {
    capabilityId: 'dem_clone_uncertainty_ensemble',
    label: 'PGDA Product 78 DEM clone ensemble (Plan.md § 9)',
    appliesToConstraints: ['minContinuousSunlight', 'maxContinuousDarkness', 'minDte'],
    consequence:
      'Terrain uncertainty is a deterministic theta_low/theta_high sensitivity envelope, not a ' +
      'probability distribution: no confidence level, percentile or probability of survival applies.',
  },
  {
    capabilityId: 'landing_ellipse_dispersion',
    label: 'Area-weighted landing-ellipse dispersion (ADR-05, Plan.md § 6.4)',
    appliesToConstraints: ['maxLandingSlope'],
    consequence:
      'The slope limit is checked at one nominal coordinate. It is not a P95 slope, not ' +
      'area-weighted and says nothing about touchdown dispersion across an ellipse.',
  },
  {
    capabilityId: 'rf_link_budget',
    label: 'Direct-to-Earth RF link budget',
    appliesToConstraints: ['minDte'],
    consequence:
      'cumulativeDteHours is geometric Earth line-of-sight only. It is not RF closure, not a ' +
      'guaranteed datalink and not a relay schedule.',
  },
];

export function unavailableCapabilitiesFor(
  evaluated: readonly ConstraintName[],
): UnavailableCapability[] {
  return UNAVAILABLE_CAPABILITIES.filter((capability) =>
    capability.appliesToConstraints.some((name) => evaluated.includes(name)),
  ).map((capability) => ({ ...capability, appliesToConstraints: [...capability.appliesToConstraints] }));
}

/**
 * Shapes the three-tier comparison request and its cache identity.
 *
 * Kept out of the hook so the request a comparison submits, and the key it is cached
 * under, are derivable and testable without rendering.
 */

import type { VehicleConstraints } from '@luna/contracts';

/** Constraints applied when the operator has not tuned the vehicle (defaults to physical Polar Survey baseline). */
export const DEFAULT_VEHICLE_CONSTRAINTS: VehicleConstraints = {
  minContinuousSunlightHours: 0.0,
  maxContinuousDarknessHours: 336.0,
  minDteHours: 0.0,
  maxLandingSlopeDeg: 45.0,
};

/** The scenario inputs a comparison depends on, taken from the authoritative store. */
export interface ComparisonScenarioInputs {
  startUtc: string;
  stopUtc: string;
  observerMastHeightM: 1.0 | 2.0 | 5.0 | 10.0;
  sunVisibilityCriterion: 'upperLimb' | 'fullDisk';
  earthVisibilityCriterion: 'center' | 'fullDisk' | 'anyLimb';
  launchSlipOffsetDays: number;
}

export interface ComparisonRequest extends ComparisonScenarioInputs {
  siteIds: string[];
  constraints?: VehicleConstraints;
  pairwise?: { siteIdA?: string; siteIdB?: string };
}

export function buildComparisonRequest(
  inputs: ComparisonScenarioInputs,
  siteIds: string[],
  constraints?: VehicleConstraints,
  pairwise?: { siteIdA?: string; siteIdB?: string },
): ComparisonRequest {
  return {
    startUtc: inputs.startUtc,
    stopUtc: inputs.stopUtc,
    observerMastHeightM: inputs.observerMastHeightM,
    sunVisibilityCriterion: inputs.sunVisibilityCriterion,
    earthVisibilityCriterion: inputs.earthVisibilityCriterion,
    launchSlipOffsetDays: inputs.launchSlipOffsetDays,
    siteIds,
    constraints,
    pairwise,
  };
}

/** Cache identity: every input that changes the computed comparison, site order included. */
export function getComparisonCacheKey(request: ComparisonRequest): string {
  const vehicles = request.constraints ?? DEFAULT_VEHICLE_CONSTRAINTS;
  const constraints = [
    vehicles.minContinuousSunlightHours,
    vehicles.maxContinuousDarknessHours,
    vehicles.minDteHours,
    vehicles.maxLandingSlopeDeg,
  ].join(':');
  const pair = request.pairwise
    ? `${request.pairwise.siteIdA ?? ''}:${request.pairwise.siteIdB ?? ''}`
    : 'none';
  return [
    [...request.siteIds].sort().join(','),
    request.startUtc,
    request.stopUtc,
    request.observerMastHeightM,
    request.sunVisibilityCriterion,
    request.earthVisibilityCriterion,
    request.launchSlipOffsetDays,
    constraints,
    pair,
  ].join('|');
}

/** REST body for `POST /api/v1/scenarios/compare`. */
export function toComparisonPayload(request: ComparisonRequest) {
  return {
    siteIds: request.siteIds,
    startUtc: request.startUtc,
    stopUtc: request.stopUtc,
    observerMastHeightM: request.observerMastHeightM,
    sunVisibilityCriterion: request.sunVisibilityCriterion,
    earthVisibilityCriterion: request.earthVisibilityCriterion,
    launchSlipOffsetDays: request.launchSlipOffsetDays,
    vehicleConstraints: request.constraints ?? DEFAULT_VEHICLE_CONSTRAINTS,
    rankingPreferences: {
      primarySortMetric: 'longestContinuousSunlight' as const,
      secondarySortMetric: 'maxContinuousDarkness' as const,
      tertiarySortMetric: 'cumulativeOverlapHours' as const,
      tieToleranceHours: 2.0,
    },
    pairwiseSelection: request.pairwise,
  };
}

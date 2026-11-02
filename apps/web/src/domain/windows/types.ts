/**
 * Pareto-Optimal Mission Landing Window Types
 *
 * Multi-objective temporal optimization structures for Artemis & CLPS surface missions.
 */

export type WindowFeasibilityVerdict = 'optimal' | 'acceptable' | 'constrained';

export interface RankedLandingWindow {
  rank: number;
  startDateIso: string;
  endDateIso: string;
  startEpochMs: number;
  endEpochMs: number;
  durationDays: number;
  sunlightPercentage: number;
  continuousSunlightHours: number;
  maxShadowHours: number;
  dteAvailabilityPercentage: number;
  minEarthElevationDeg: number;
  paretoScore: number; // 0 - 100
  feasibilityVerdict: WindowFeasibilityVerdict;
}

export interface ParetoWindowRequest {
  siteId: string;
  startEpochMs: number;
  endEpochMs: number;
  stayDurationDays?: number;
  minSunlightPct?: number;
  maxContinuousShadowHours?: number;
  minEarthElevationDeg?: number;
  topN?: number;
}

export interface ParetoOptimizationResult {
  siteId: string;
  siteName: string;
  totalWindowsEvaluated: number;
  topWindows: RankedLandingWindow[];
  searchRange: {
    startIso: string;
    endIso: string;
  };
}

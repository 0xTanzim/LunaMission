/**
 * Pareto-Optimal Landing Window Solver
 *
 * Automatically sweeps temporal parameter space across months/years (2026-2028),
 * evaluating environmental bottlenecks to identify the mathematical Pareto frontier
 * balancing continuous solar power against direct-to-Earth communication links.
 */

import { CANDIDATE_SITES } from '../../data/catalog';
import { evaluateLandingWindow } from '../celestial/missionWindows';
import { formatIsoUtc } from '../utils/timeUtils';
import { MS_PER_DAY } from '../utils/astronomyConstants';
import type {
  ParetoOptimizationResult,
  ParetoWindowRequest,
  RankedLandingWindow,
  WindowFeasibilityVerdict,
} from '@luna/contracts';

export function solveParetoLandingWindows(
  request: ParetoWindowRequest,
): ParetoOptimizationResult {
  const site = CANDIDATE_SITES.find((s) => s.id === request.siteId) || CANDIDATE_SITES[0];
  const stayDays = Math.max(3, Math.min(60, request.stayDurationDays || 14));
  const minSunPct = request.minSunlightPct ?? 0;
  const maxShadowH = request.maxContinuousShadowHours ?? 999;
  const minEarthElev = request.minEarthElevationDeg;
  const topLimit = Math.max(1, Math.min(20, request.topN || 5));

  const startMs = request.startEpochMs;
  const endMs = request.endEpochMs;
  const searchSpanMs = Math.max(MS_PER_DAY * stayDays, endMs - startMs);

  // Step size: evaluate candidate windows every 3.5 days (half synodic quarter)
  const stepMs = 3.5 * MS_PER_DAY;
  const numWindows = Math.max(1, Math.floor((searchSpanMs - stayDays * MS_PER_DAY) / stepMs));

  const candidateWindows: RankedLandingWindow[] = [];

  for (let i = 0; i <= numWindows; i++) {
    const windowStartMs = startMs + i * stepMs;
    const windowEndMs = windowStartMs + stayDays * MS_PER_DAY;
    if (windowEndMs > endMs + MS_PER_DAY) break;

    const evaluation = evaluateLandingWindow(
      site,
      new Date(windowStartMs),
      stayDays,
      'terrain-aware',
      6, // 6h step intervals for fast scanning
    );

    // Filter against hard operational constraints
    if (evaluation.sunlightPercentage < minSunPct) continue;
    if (evaluation.maxShadowHours > maxShadowH) continue;

    // Minimum Earth elevation throughout the window
    let minObservedEarthElev = 90;
    for (const sample of evaluation.timelineSamples) {
      if (sample.earthElevationDeg < minObservedEarthElev) {
        minObservedEarthElev = sample.earthElevationDeg;
      }
    }

    if (minEarthElev !== undefined && minObservedEarthElev < minEarthElev) continue;

    // Multi-objective Pareto Score (0 - 100):
    // 45% Sunlight percentage + 35% DTE communication percentage + 20% Shadow resilience
    const shadowResilience = Math.max(0, 100 - (evaluation.maxShadowHours / 72.0) * 100);
    const paretoScore = Math.round(
      evaluation.sunlightPercentage * 0.45 +
      evaluation.dteAvailabilityPercentage * 0.35 +
      shadowResilience * 0.20,
    );

    let feasibilityVerdict: WindowFeasibilityVerdict = 'constrained';
    if (paretoScore >= 75 && evaluation.maxShadowHours <= 24) {
      feasibilityVerdict = 'optimal';
    } else if (paretoScore >= 50 && evaluation.maxShadowHours <= 60) {
      feasibilityVerdict = 'acceptable';
    }

    candidateWindows.push({
      rank: 0,
      startDateIso: formatIsoUtc(new Date(windowStartMs)),
      endDateIso: formatIsoUtc(new Date(windowEndMs)),
      startEpochMs: windowStartMs,
      endEpochMs: windowEndMs,
      durationDays: stayDays,
      sunlightPercentage: evaluation.sunlightPercentage,
      continuousSunlightHours: evaluation.continuousSunlightHours,
      maxShadowHours: evaluation.maxShadowHours,
      dteAvailabilityPercentage: evaluation.dteAvailabilityPercentage,
      minEarthElevationDeg: Math.round(minObservedEarthElev * 10) / 10,
      paretoScore,
      feasibilityVerdict,
    });
  }

  // Sort descending by Pareto Score
  candidateWindows.sort((a, b) => b.paretoScore - a.paretoScore);

  // Assign ranks
  const topWindows = candidateWindows.slice(0, topLimit).map((win, idx) => ({
    ...win,
    rank: idx + 1,
  }));

  return {
    siteId: site.id,
    siteName: site.name,
    totalWindowsEvaluated: numWindows + 1,
    topWindows,
    searchRange: {
      startIso: formatIsoUtc(new Date(startMs)),
      endIso: formatIsoUtc(new Date(endMs)),
    },
  };
}

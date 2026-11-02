/**
 * Rolle's Theorem & Brent's Method Event-Splitting Visibility Solver
 * Milestone M4: Master partition assembler, exact duration integrator, and report generator.
 * Governed by AGENTS.md § 4.4 and docs/SCIENCE_FEASIBILITY.md § 4.4.
 */

import type { HorizonProfile, TopocentricTrajectory } from '@luna/contracts';
import { splitStepEvents } from './eventSplitter';
import {
  clampedFootprintHalfWidthDeg,
  limbSign,
  resolveHorizonDeg,
} from './finiteDiskClearance';
import { computeHermiteCoeffs, evalHermite, unwrapAzimuth } from './hermiteSpline';
import type {
  CelestialTargetType,
  HorizonProfileType,
  LimbCriterion,
  VisibilityEvent,
  VisibilityInterval,
  VisibilityReport,
  VisibilitySummaryMetrics,
} from './visibilityTypes';

export interface SolveVisibilityOptions {
  sunTrajectory: TopocentricTrajectory;
  earthTrajectory: TopocentricTrajectory;
  horizonProfile: HorizonProfile;
  mastHeightMeters?: number;
  siteId?: string;
  bracketToleranceSeconds?: number;
  tangentialGrazeToleranceDeg?: number;
}

/**
 * Visibility predicate at a single instant, evaluated with the same clearance model that
 * `splitStepEvents` partitions on: the footprint half-width is frozen at the ephemeris-step
 * midpoint so the discrete interval state and the event partition cannot disagree.
 */
function evaluateClearanceAtEpoch(
  traj: TopocentricTrajectory,
  epochMs: number,
  profile: HorizonProfile,
  criterion: LimbCriterion,
  profileType: HorizonProfileType,
): boolean {
  const pts = traj.points;
  if (pts.length < 2) return false;
  let idx = pts.findIndex((p, i) => i < pts.length - 1 && pts[i]!.epochMs <= epochMs && pts[i + 1]!.epochMs >= epochMs);
  if (idx === -1) idx = epochMs < pts[0]!.epochMs ? 0 : pts.length - 2;

  const pt0 = pts[idx]!;
  const pt1 = pts[idx + 1]!;
  const dtSec = (pt1.epochMs - pt0.epochMs) / 1000.0;
  const tau = dtSec > 0 ? (epochMs - pt0.epochMs) / (pt1.epochMs - pt0.epochMs) : 0.0;
  const dtHr = dtSec / 3600.0;

  const az0 = pt0.azimuthDeg;
  const az1 = unwrapAzimuth(az0, pt1.azimuthDeg);
  const cAz = computeHermiteCoeffs(az0, az1, pt0.azimuthRateDegHr, pt1.azimuthRateDegHr, dtHr);
  const cEl = computeHermiteCoeffs(pt0.elevationDeg, pt1.elevationDeg, pt0.elevationRateDegHr, pt1.elevationRateDegHr, dtHr);

  const elevationDeg = evalHermite(cEl, tau);
  const angularRadiusDeg = (1.0 - tau) * pt0.angularRadiusDeg + tau * pt1.angularRadiusDeg;
  const halfWidthDeg = clampedFootprintHalfWidthDeg(
    evalHermite(cEl, 0.5),
    0.5 * (pt0.angularRadiusDeg + pt1.angularRadiusDeg),
  );
  const horizonDeg = resolveHorizonDeg({
    profile,
    criterion,
    profileType,
    centerAzimuthDeg: evalHermite(cAz, tau),
    centerElevationDeg: elevationDeg,
    angularRadiusDeg,
    halfWidthDeg,
  });

  return elevationDeg + limbSign(criterion) * angularRadiusDeg >= horizonDeg;
}


function buildIntervals(
  segments: { startMs: number; endMs: number; state: 'visible' | 'blocked' }[],
  target: CelestialTargetType | 'Sun_AND_Earth',
): VisibilityInterval[] {
  if (segments.length === 0) return [];
  const merged: VisibilityInterval[] = [];
  let curr = { ...segments[0]! };

  for (let i = 1; i < segments.length; i++) {
    const s = segments[i]!;
    if (s.state === curr.state && s.startMs === curr.endMs) {
      curr.endMs = s.endMs;
    } else {
      const dur = (curr.endMs - curr.startMs) / 3600000.0;
      merged.push({
        startEpochMs: curr.startMs,
        endEpochMs: curr.endMs,
        startDateUtc: new Date(curr.startMs).toISOString(),
        endDateUtc: new Date(curr.endMs).toISOString(),
        durationHours: dur,
        target,
        state: curr.state,
      });
      curr = { ...s };
    }
  }

  const dur = (curr.endMs - curr.startMs) / 3600000.0;
  merged.push({
    startEpochMs: curr.startMs,
    endEpochMs: curr.endMs,
    startDateUtc: new Date(curr.startMs).toISOString(),
    endDateUtc: new Date(curr.endMs).toISOString(),
    durationHours: dur,
    target,
    state: curr.state,
  });

  return merged;
}

function calculateMetrics(
  totalEvalHours: number,
  sunIntervals: VisibilityInterval[],
  dteIntervals: VisibilityInterval[],
  combinedIntervals: VisibilityInterval[],
): VisibilitySummaryMetrics {
  const sumHours = (ints: VisibilityInterval[], state: 'visible' | 'blocked') =>
    ints.filter((i) => i.state === state).reduce((acc, i) => acc + i.durationHours, 0.0);

  const maxHours = (ints: VisibilityInterval[], state: 'visible' | 'blocked') =>
    ints.filter((i) => i.state === state).reduce((max, i) => Math.max(max, i.durationHours), 0.0);

  const sunlitHours = sumHours(sunIntervals, 'visible');
  const dteHours = sumHours(dteIntervals, 'visible');
  const combinedHours = sumHours(combinedIntervals, 'visible');

  return {
    totalEvaluationHours: totalEvalHours,
    totalSunlitHours: sunlitHours,
    sunlightPercentage: totalEvalHours > 0 ? (sunlitHours / totalEvalHours) * 100.0 : 0.0,
    continuousSunlightMaxHours: maxHours(sunIntervals, 'visible'),
    maxContinuousShadowHours: maxHours(sunIntervals, 'blocked'),
    dteAvailabilityPercentage: totalEvalHours > 0 ? (dteHours / totalEvalHours) * 100.0 : 0.0,
    maxDteOutageHours: maxHours(dteIntervals, 'blocked'),
    combinedSunAndEarthHours: combinedHours,
    combinedSunAndEarthPercentage: totalEvalHours > 0 ? (combinedHours / totalEvalHours) * 100.0 : 0.0,
  };
}

export function solveVisibility(options: SolveVisibilityOptions): VisibilityReport {
  const {
    sunTrajectory,
    earthTrajectory,
    horizonProfile,
    mastHeightMeters = 2.0,
    siteId,
    bracketToleranceSeconds = 1.0,
    tangentialGrazeToleranceDeg = 1e-7,
  } = options;

  const sunPts = sunTrajectory.points;
  const earthPts = earthTrajectory.points;
  if (sunPts.length < 2 || earthPts.length < 2) {
    throw new Error('Trajectories must contain at least 2 ephemeris points');
  }

  const tStartMs = Math.max(sunPts[0]!.epochMs, earthPts[0]!.epochMs);
  const tEndMs = Math.min(sunPts[sunPts.length - 1]!.epochMs, earthPts[earthPts.length - 1]!.epochMs);
  const totalEvalHours = Math.max(0, (tEndMs - tStartMs) / 3600000.0);

  const events: VisibilityEvent[] = [];
  const fullDiskSunEvents: VisibilityEvent[] = [];

  for (let i = 0; i < sunPts.length - 1; i++) {
    const step = {
      pt0: sunPts[i]!,
      pt1: sunPts[i + 1]!,
      horizonProfile,
      target: 'Sun' as const,
      bracketTolSec: bracketToleranceSeconds,
      tangentialGrazeTolDeg: tangentialGrazeToleranceDeg,
    };
    events.push(...splitStepEvents({ ...step, criterion: 'upper_limb' }));
    fullDiskSunEvents.push(...splitStepEvents({ ...step, criterion: 'full_disk' }));
  }

  for (let i = 0; i < earthPts.length - 1; i++) {
    const ev = splitStepEvents({
      pt0: earthPts[i]!,
      pt1: earthPts[i + 1]!,
      horizonProfile,
      target: 'Earth',
      criterion: 'center',
      bracketTolSec: bracketToleranceSeconds,
      tangentialGrazeTolDeg: tangentialGrazeToleranceDeg,
    });
    events.push(...ev);
  }

  const rawEpochs = [
    tStartMs,
    tEndMs,
    ...events.map((e) => e.epochMs),
    ...sunPts.map((p) => p.epochMs).filter((t) => t >= tStartMs && t <= tEndMs),
    ...earthPts.map((p) => p.epochMs).filter((t) => t >= tStartMs && t <= tEndMs),
  ].sort((a, b) => a - b);

  // Master sorted partition without duplicates within 500ms
  const masterTimeline: number[] = [];
  for (const ep of rawEpochs) {
    if (masterTimeline.length === 0 || ep - masterTimeline[masterTimeline.length - 1]! >= 500) {
      masterTimeline.push(ep);
    }
  }

  const generateSegments = (profileType: HorizonProfileType) => {
    const sunSegs: { startMs: number; endMs: number; state: 'visible' | 'blocked' }[] = [];
    const dteSegs: { startMs: number; endMs: number; state: 'visible' | 'blocked' }[] = [];
    const combSegs: { startMs: number; endMs: number; state: 'visible' | 'blocked' }[] = [];

    for (let j = 0; j < masterTimeline.length - 1; j++) {
      const sMs = masterTimeline[j]!;
      const eMs = masterTimeline[j + 1]!;
      const mid = 0.5 * (sMs + eMs);

      const isSun = evaluateClearanceAtEpoch(sunTrajectory, mid, horizonProfile, 'upper_limb', profileType);
      const isEarth = evaluateClearanceAtEpoch(earthTrajectory, mid, horizonProfile, 'center', profileType);

      sunSegs.push({ startMs: sMs, endMs: eMs, state: isSun ? 'visible' : 'blocked' });
      dteSegs.push({ startMs: sMs, endMs: eMs, state: isEarth ? 'visible' : 'blocked' });
      combSegs.push({ startMs: sMs, endMs: eMs, state: isSun && isEarth ? 'visible' : 'blocked' });
    }

    const sunInts = buildIntervals(sunSegs, 'Sun');
    const dteInts = buildIntervals(dteSegs, 'Earth');
    const combInts = buildIntervals(combSegs, 'Sun_AND_Earth');
    const metrics = calculateMetrics(totalEvalHours, sunInts, dteInts, combInts);
    return { sunInts, dteInts, combInts, metrics };
  };

  const nominalData = generateSegments('nominal');
  const lowData = generateSegments('low');
  const highData = generateSegments('high');

  return {
    siteId,
    mastHeightMeters,
    events: events.sort((a, b) => a.epochMs - b.epochMs),
    fullDiskSunEvents: fullDiskSunEvents.sort((a, b) => a.epochMs - b.epochMs),
    sunlitIntervals: nominalData.sunInts,
    dteIntervals: nominalData.dteInts,
    combinedIntervals: nominalData.combInts,
    nominalMetrics: nominalData.metrics,
    sensitivityEnvelope: {
      thetaLowMetrics: lowData.metrics,
      thetaHighMetrics: highData.metrics,
    },
    provenance: {
      ephemerisSource: sunTrajectory.source,
      horizonSource: 'data/curated-horizons.json',
      solverAlgorithm: "Four-Stage Rolle's Theorem & Brent's Method Event-Splitting Visibility Solver",
      bracketToleranceSeconds,
      tangentialGrazeToleranceDeg,
    },
  };
}

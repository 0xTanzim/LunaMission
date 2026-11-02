import { describe, expect, it } from 'bun:test';
import type { HorizonProfile, TopocentricEphemerisPoint, TopocentricTrajectory } from '@luna/contracts';
import { splitStepEvents } from '../../src/services/celestial/eventSplitter';
import {
  clampedFootprintHalfWidthDeg,
  extremumBranchAt,
  extremumBreakpointsDeg,
  extremumModeForLimb,
  evaluateSkylineBranch,
  resolveHorizonDeg,
  skylineCandidateBranches,
} from '../../src/services/celestial/finiteDiskClearance';
import { computeHermiteCoeffs, evalHermite, unwrapAzimuth } from '../../src/services/celestial/hermiteSpline';
import { horizonProfileService } from '../../src/services/celestial/horizonProfileService';
import { solveVisibility } from '../../src/services/celestial/visibilitySolver';

const baseMs = 1778846400000; // 2026-05-15T12:00:00Z
const stepSec = 600;

function flatHorizon(elevation = 0.0): HorizonProfile {
  return {
    elevationNominalDeg: Array(360).fill(elevation),
    thetaLowDeg: Array(360).fill(elevation),
    thetaHighDeg: Array(360).fill(elevation),
    blockerDistanceKm: Array(360).fill(10.0),
    blockerElevationMeters: Array(360).fill(0.0),
    binStatus: Array(360).fill('valid' as const),
  };
}

function setHorizonVertices(horizon: HorizonProfile, vertices: Record<number, number>): HorizonProfile {
  for (const [vertex, value] of Object.entries(vertices)) {
    const index = Number(vertex);
    horizon.elevationNominalDeg[index] = value;
    horizon.thetaLowDeg[index] = value;
    horizon.thetaHighDeg[index] = value;
  }
  return horizon;
}

function makePoint(
  epochMs: number,
  azimuthDeg: number,
  elevationDeg: number,
  angularRadiusDeg: number,
  azimuthRateDegHr = 0.0,
  elevationRateDegHr = 0.0,
): TopocentricEphemerisPoint {
  return {
    timestampUtc: new Date(epochMs).toISOString(),
    epochMs,
    azimuthDeg,
    elevationDeg,
    azimuthRateDegHr,
    elevationRateDegHr,
    angularRadiusDeg,
    rangeKm: 150000000,
    rangeRateKmS: 0,
  };
}

function makeTrajectory(points: TopocentricEphemerisPoint[], target: 'Sun' | 'Earth'): TopocentricTrajectory {
  return {
    target,
    targetCommand: target === 'Sun' ? '10' : '399',
    observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 },
    stepSize: '10m',
    source: 'finite-disk-oracle',
    cached: true,
    points,
  };
}

/** Horizon with a 10°/deg spire peaking at `apexDeg` on `vertexDeg`, base `baseDeg` elsewhere. */
function spireHorizon(vertexDeg: number, apexDeg: number, baseDeg: number): HorizonProfile {
  return setHorizonVertices(flatHorizon(baseDeg), {
    [vertexDeg - 1]: baseDeg,
    [vertexDeg]: apexDeg,
    [vertexDeg + 1]: baseDeg,
  });
}

describe('Finite-disk limb criteria (masterplan § 6.2)', () => {
  it('collapses all three criteria onto the single-ray skyline for a flat horizon', () => {
    const horizon = flatHorizon(1.0);
    const resolution = (criterion: 'upper_limb' | 'center' | 'full_disk') =>
      resolveHorizonDeg({
        profile: horizon,
        criterion,
        centerAzimuthDeg: 42.3,
        centerElevationDeg: 0.8,
        angularRadiusDeg: 0.26,
      });

    expect(resolution('center')).toBeCloseTo(1.0, 12);
    expect(resolution('upper_limb')).toBeCloseTo(1.0, 12);
    expect(resolution('full_disk')).toBeCloseTo(1.0, 12);
  });

  it('resolves any-limb against the footprint minimum and full-disk against its maximum', () => {
    // 10°/deg spire peaking at +2° on vertex 45, base −8° on vertices 44 and 46.
    const horizon = spireHorizon(45, 2.0, -8.0);
    const halfWidth = clampedFootprintHalfWidthDeg(1.0, 0.26);
    expect(halfWidth).toBeCloseTo(0.26003, 4);

    const skyline = (criterion: 'upper_limb' | 'center' | 'full_disk') =>
      resolveHorizonDeg({
        profile: horizon,
        criterion,
        centerAzimuthDeg: 45.0,
        centerElevationDeg: 1.0,
        angularRadiusDeg: 0.26,
      });

    // Left footprint end 45 − δ lies in bin 44: h = −8 + 10·(1 − δ) = −0.6003°
    expect(skyline('upper_limb')).toBeCloseTo(-0.6003, 3);
    // The apex at vertex 45 is inside the footprint, so the maximum is the vertex elevation.
    expect(skyline('full_disk')).toBeCloseTo(2.0, 9);
    expect(skyline('center')).toBeCloseTo(2.0, 9);
  });

  it('classifies the same instant as any-limb visible, centre blocked and full-disk blocked', () => {
    const horizon = spireHorizon(45, 2.0, -8.0);
    const sun = makePoint(baseMs, 45.0, 1.0, 0.26);
    const earth = makePoint(baseMs, 180.0, 1.0, 0.95);
    const sunTrajectory = makeTrajectory([sun, { ...sun, epochMs: baseMs + stepSec * 1000 }], 'Sun');
    const earthTrajectory = makeTrajectory([earth, { ...earth, epochMs: baseMs + stepSec * 1000 }], 'Earth');

    const report = solveVisibility({ sunTrajectory, earthTrajectory, horizonProfile: horizon });

    // El + R = 1.26 clears the −0.6003° flank for the whole step → 100% any-limb illumination.
    expect(report.nominalMetrics.sunlightPercentage).toBeCloseTo(100.0, 6);
    // El − R = 0.74 does not clear the +2.0° apex, so the disk is never fully visible.
    const maxOverFootprint = resolveHorizonDeg({
      profile: horizon,
      criterion: 'full_disk',
      centerAzimuthDeg: 45.0,
      centerElevationDeg: 1.0,
      angularRadiusDeg: 0.26,
    });
    expect(1.0 - 0.26 - maxOverFootprint).toBeLessThan(0.0);
  });

  it('sets full-disk, then centre, then any-limb while the footprint climbs a rising ramp', () => {
    // Horizon flat at 0° everywhere except vertex 32 = +10°, so bin 31 carries h = 10·(Az − 31).
    // Sun: El = 1.0°, R = 0.26°, δ = asin(sin 0.26° / cos 1.0°) = 0.260034°, Az from 30.6° to 31.45°.
    //   full_disk  : El − R = 0.74 = h(Az + δ)  → Az = 31.074 − δ = 30.81397° → τ = 0.25173 → 151.0 s
    //   centre     : El     = 1.00 = h(Az)      → Az = 31.10000°      → τ = 0.58824 → 352.9 s
    //   upper_limb : El + R = 1.26 = h(Az − δ)  → Az = 31.126 + δ = 31.38603° → τ = 0.92475 → 554.8 s
    const horizon = setHorizonVertices(flatHorizon(0.0), { 32: 10.0 });
    const sweepDeg = 0.85;
    const azimuthRateDegHr = sweepDeg / (stepSec / 3600);
    const pt0 = makePoint(baseMs, 30.6, 1.0, 0.26, azimuthRateDegHr, 0.0);
    const pt1 = makePoint(baseMs + stepSec * 1000, 30.6 + sweepDeg, 1.0, 0.26, azimuthRateDegHr, 0.0);

    const setTimeSec = (criterion: 'upper_limb' | 'center' | 'full_disk'): number => {
      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion });
      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe('SET');
      expect(Math.abs(events[0]!.clearanceDeg)).toBeLessThan(1e-3);
      return (events[0]!.epochMs - baseMs) / 1000.0;
    };

    const tFullDisk = setTimeSec('full_disk');
    const tCentre = setTimeSec('center');
    const tAnyLimb = setTimeSec('upper_limb');

    expect(Math.abs(tFullDisk - 151.0)).toBeLessThan(1.0);
    expect(Math.abs(tCentre - 352.9)).toBeLessThan(1.0);
    expect(Math.abs(tAnyLimb - 554.8)).toBeLessThan(1.0);
    expect(tFullDisk).toBeLessThan(tCentre);
    expect(tCentre).toBeLessThan(tAnyLimb);
  });

  it('detects an envelope branch switch where two footprint ends compete for the minimum', () => {
    // Local maximum at vertex 44 (bins 43 and 44 carry ±8°/deg). The footprint minimum is a
    // "Λ" of the two ends, kinked at the centre azimuth 44.0 where both ends tie — a break the
    // plain 1° vertex grid cannot represent.
    const horizon = setHorizonVertices(flatHorizon(0.0), { 43: -3.0, 44: 5.0, 45: -3.0 });
    const branches = skylineCandidateBranches(horizon, 44.0, 0.4);
    const crossings = extremumBreakpointsDeg(branches, 43.6, 44.4);

    expect(crossings.length).toBe(1);
    expect(crossings[0]!).toBeCloseTo(44.0, 9);

    const before = extremumBranchAt(branches, 43.85, 'min');
    const after = extremumBranchAt(branches, 44.15, 'min');
    expect(before.slope).toBeCloseTo(8.0, 9);
    expect(after.slope).toBeCloseTo(-8.0, 9);
    expect(evaluateSkylineBranch(before, 43.85)).toBeCloseTo(0.6, 9);
    expect(evaluateSkylineBranch(after, 44.15)).toBeCloseTo(0.6, 9);
  });

  it('maps criteria to their extremum mode and leaves the centre criterion unquantised', () => {
    expect(extremumModeForLimb('upper_limb')).toBe('min');
    expect(extremumModeForLimb('full_disk')).toBe('max');
    expect(extremumModeForLimb('center')).toBeNull();
  });

  it('nests the full-disk window inside the any-limb window over the real skyline', () => {
    const horizon = horizonProfileService.getHorizonProfileForSite('connecting-ridge', 2.0);
    let sampled = 0;

    for (let azimuthDeg = 0.0; azimuthDeg < 360.0; azimuthDeg += 1.7) {
      for (const elevationDeg of [-0.6, -0.1, 0.2, 0.9]) {
        const angularRadiusDeg = 0.26;
        const skyline = (criterion: 'upper_limb' | 'full_disk') =>
          resolveHorizonDeg({
            profile: horizon,
            criterion,
            centerAzimuthDeg: azimuthDeg,
            centerElevationDeg: elevationDeg,
            angularRadiusDeg,
          });

        const anyLimbClearance = elevationDeg + angularRadiusDeg - skyline('upper_limb');
        const fullDiskClearance = elevationDeg - angularRadiusDeg - skyline('full_disk');
        if (fullDiskClearance >= 0.0) expect(anyLimbClearance).toBeGreaterThanOrEqual(0.0);
        sampled += 1;
      }
    }

    expect(sampled).toBeGreaterThan(800);
  });

  it('resolves a near-zenith body as visible under both limb criteria with the capped footprint', () => {
    const horizon = horizonProfileService.getHorizonProfileForSite('connecting-ridge', 2.0);
    expect(clampedFootprintHalfWidthDeg(88.0, 0.26)).toBe(5.0);

    for (const criterion of ['upper_limb', 'full_disk'] as const) {
      const skyline = resolveHorizonDeg({
        profile: horizon,
        criterion,
        centerAzimuthDeg: 100.0,
        centerElevationDeg: 88.0,
        angularRadiusDeg: 0.26,
      });
      const limb = criterion === 'upper_limb' ? 0.26 : -0.26;
      expect(88.0 + limb - skyline).toBeGreaterThan(50.0);
    }
  });
});

describe('Finite-disk partition completeness', () => {
  it('agrees with a dense independent scan of the same clearance model over 24 hours', () => {
    const horizon = buildVariedHorizon();
    const startMs = Date.parse('2026-11-01T00:00:00.000Z');
    const stopMs = startMs + 24 * 3600 * 1000;

    const sunTrajectory = buildAnalyticTrajectory(startMs, stopMs);
    const earthTrajectory = makeTrajectory(
      sunTrajectory.points.map((p) => ({ ...p, angularRadiusDeg: 0.95, rangeKm: 384000 })),
      'Earth',
    );

    const report = solveVisibility({ sunTrajectory, earthTrajectory, horizonProfile: horizon });
    expect(report.events.length).toBeGreaterThan(4);

    const eventEpochs = report.events.map((e) => e.epochMs);
    let samplesChecked = 0;

    for (let epochMs = startMs; epochMs < stopMs; epochMs += 20000) {
      if (eventEpochs.some((e) => Math.abs(e - epochMs) <= 2000)) continue;
      const interval = report.sunlitIntervals.find(
        (i) => i.startEpochMs <= epochMs && epochMs < i.endEpochMs,
      );
      expect(interval).toBeDefined();
      expect(interval!.state).toBe(anyLimbVisibleAt(sunTrajectory, epochMs, horizon) ? 'visible' : 'blocked');
      samplesChecked += 1;
    }

    expect(samplesChecked).toBeGreaterThan(4000);
  });

  it('reports a full-disk event for every state change a dense scan can observe', () => {
    const horizon = buildVariedHorizon();
    const startMs = Date.parse('2026-11-01T00:00:00.000Z');
    const stopMs = startMs + 24 * 3600 * 1000;
    const sunTrajectory = buildAnalyticTrajectory(startMs, stopMs);
    const earthTrajectory = makeTrajectory(
      sunTrajectory.points.map((p) => ({ ...p, angularRadiusDeg: 0.95, rangeKm: 384000 })),
      'Earth',
    );

    const report = solveVisibility({ sunTrajectory, earthTrajectory, horizonProfile: horizon });
    const crossingEvents = report.fullDiskSunEvents.filter((e) => e.type !== 'TANGENTIAL_GRAZE');
    expect(crossingEvents.length).toBeGreaterThan(0);

    const observedChanges: number[] = [];
    let previous = anyLimbFullyVisibleAt(sunTrajectory, startMs, horizon);
    for (let epochMs = startMs + 20000; epochMs < stopMs; epochMs += 20000) {
      const current = anyLimbFullyVisibleAt(sunTrajectory, epochMs, horizon);
      if (current !== previous) observedChanges.push(epochMs);
      previous = current;
    }

    // A dense scan resolves a transition only to its 20 s sampling step, so each reported
    // event must fall inside the bracket of the change it explains, and vice versa.
    expect(observedChanges.length).toBe(crossingEvents.length);
    for (const changeMs of observedChanges) {
      const covering = crossingEvents.filter((e) => Math.abs(e.epochMs - changeMs) <= 25000);
      expect(covering.length).toBe(1);
    }
  });
});

function buildVariedHorizon(): HorizonProfile {
  const horizon = flatHorizon(0.0);
  for (let vertex = 0; vertex < 360; vertex += 1) {
    const value = 0.75 * Math.sin(vertex * 0.37) + 0.45 * Math.sin(vertex * 1.13);
    horizon.elevationNominalDeg[vertex] = value;
    horizon.thetaLowDeg[vertex] = value - 0.1;
    horizon.thetaHighDeg[vertex] = value + 0.1;
  }
  return horizon;
}

/** Azimuth sweeps ±40° with a libration turnaround; elevation oscillates through the skyline. */
const AZIMUTH_MEAN_DEG = 220.0;
const AZIMUTH_AMPLITUDE_DEG = 40.0;
const AZIMUTH_PERIOD_H = 24.0;
const ELEVATION_MEAN_DEG = 0.15;
const ELEVATION_AMPLITUDE_DEG = 0.30;
const ELEVATION_PERIOD_H = 12.0;
const ELEVATION_PHASE = 0.7;

function analyticState(epochMs: number, startMs: number): {
  azimuthDeg: number;
  elevationDeg: number;
  azimuthRateDegHr: number;
  elevationRateDegHr: number;
} {
  const hours = (epochMs - startMs) / 3600000.0;
  const azimuthPhase = (2 * Math.PI * hours) / AZIMUTH_PERIOD_H;
  const elevationPhase = (2 * Math.PI * hours) / ELEVATION_PERIOD_H + ELEVATION_PHASE;
  return {
    azimuthDeg: AZIMUTH_MEAN_DEG + AZIMUTH_AMPLITUDE_DEG * Math.sin(azimuthPhase),
    elevationDeg: ELEVATION_MEAN_DEG + ELEVATION_AMPLITUDE_DEG * Math.sin(elevationPhase),
    azimuthRateDegHr:
      (AZIMUTH_AMPLITUDE_DEG * 2 * Math.PI * Math.cos(azimuthPhase)) / AZIMUTH_PERIOD_H,
    elevationRateDegHr:
      (ELEVATION_AMPLITUDE_DEG * 2 * Math.PI * Math.cos(elevationPhase)) / ELEVATION_PERIOD_H,
  };
}

function buildAnalyticTrajectory(startMs: number, stopMs: number): TopocentricTrajectory {
  const points: TopocentricEphemerisPoint[] = [];
  for (let epochMs = startMs; epochMs <= stopMs; epochMs += stepSec * 1000) {
    const state = analyticState(epochMs, startMs);
    points.push(
      makePoint(
        epochMs,
        state.azimuthDeg,
        state.elevationDeg,
        0.26,
        state.azimuthRateDegHr,
        state.elevationRateDegHr,
      ),
    );
  }
  return makeTrajectory(points, 'Sun');
}

interface CellState {
  azimuthDeg: number;
  elevationDeg: number;
  angularRadiusDeg: number;
  stepMidElevationDeg: number;
  stepMidRadiusDeg: number;
}

/** Independent reconstruction of the ephemeris cell state the solver interpolates over. */
function cellStateAtEpoch(trajectory: TopocentricTrajectory, epochMs: number): CellState {
  const points = trajectory.points;
  let index = points.length - 2;
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i]!.epochMs <= epochMs && points[i + 1]!.epochMs >= epochMs) {
      index = i;
      break;
    }
  }
  const p0 = points[index]!;
  const p1 = points[index + 1]!;
  const dtHr = (p1.epochMs - p0.epochMs) / 3600000.0;
  const tau = dtHr > 0 ? (epochMs - p0.epochMs) / (p1.epochMs - p0.epochMs) : 0.0;
  const cAz = computeHermiteCoeffs(p0.azimuthDeg, unwrapAzimuth(p0.azimuthDeg, p1.azimuthDeg), p0.azimuthRateDegHr, p1.azimuthRateDegHr, dtHr);
  const cEl = computeHermiteCoeffs(p0.elevationDeg, p1.elevationDeg, p0.elevationRateDegHr, p1.elevationRateDegHr, dtHr);

  return {
    azimuthDeg: evalHermite(cAz, tau),
    elevationDeg: evalHermite(cEl, tau),
    angularRadiusDeg: (1 - tau) * p0.angularRadiusDeg + tau * p1.angularRadiusDeg,
    stepMidElevationDeg: evalHermite(cEl, 0.5),
    stepMidRadiusDeg: 0.5 * (p0.angularRadiusDeg + p1.angularRadiusDeg),
  };
}

function clearanceDegAt(
  trajectory: TopocentricTrajectory,
  epochMs: number,
  horizon: HorizonProfile,
  criterion: 'upper_limb' | 'full_disk',
): number {
  const cell = cellStateAtEpoch(trajectory, epochMs);
  const limb = criterion === 'upper_limb' ? 1.0 : -1.0;
  const skyline = resolveHorizonDeg({
    profile: horizon,
    criterion,
    centerAzimuthDeg: cell.azimuthDeg,
    centerElevationDeg: cell.elevationDeg,
    angularRadiusDeg: cell.angularRadiusDeg,
    halfWidthDeg: clampedFootprintHalfWidthDeg(cell.stepMidElevationDeg, cell.stepMidRadiusDeg),
  });
  return cell.elevationDeg + limb * cell.angularRadiusDeg - skyline;
}

function anyLimbVisibleAt(trajectory: TopocentricTrajectory, epochMs: number, horizon: HorizonProfile): boolean {
  return clearanceDegAt(trajectory, epochMs, horizon, 'upper_limb') >= 0.0;
}

function anyLimbFullyVisibleAt(trajectory: TopocentricTrajectory, epochMs: number, horizon: HorizonProfile): boolean {
  return clearanceDegAt(trajectory, epochMs, horizon, 'full_disk') >= 0.0;
}

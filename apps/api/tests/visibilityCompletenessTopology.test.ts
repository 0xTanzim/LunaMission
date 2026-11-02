/**
 * Event-solver completeness evidence — event topology.
 *
 * What this suite establishes
 * --------------------------
 * The four-stage solver (Stage A azimuth-stationary split, Stage B skyline-vertex and
 * envelope-branch split, Stage C clearance-extremum split, Stage D Brent refinement) is
 * *partition-complete under stated assumptions*: on every ephemeris step the clearance
 * function is piecewise cubic in time with a single affine skyline branch per panel, and the
 * Stage A–C partition makes it strictly monotonic on every resulting sub-panel. Brent then
 * refines at most one root per monotonic sub-panel. What is proven is that no root *inside a
 * bracketed step under those assumptions* is skipped, plus that no root is invented. What is
 * **not** proven is that the ephemeris sampling itself brackets every physical crossing —
 * that is an empirical property of the sampling cadence, measured separately in
 * `visibilityCompletenessConvergence.test.ts` and `visibilityCompletenessReference.test.ts`.
 *
 * Every fixture here has a closed-form clearance polynomial, so the assertions compare the
 * solver against an exact analytic root rather than against another implementation.
 */

import { describe, expect, it } from 'bun:test';
import type { HorizonProfile, TopocentricEphemerisPoint, TopocentricTrajectory } from '@luna/contracts';
import { splitStepEvents } from '../src/services/celestial/eventSplitter';
import { solveVisibility } from '../src/services/celestial/visibilitySolver';
import type { VisibilityEvent } from '../src/services/celestial/visibilityTypes';

const baseMs = Date.parse('2026-05-15T12:00:00.000Z');

function flatHorizon(elevationDeg = 0.0): HorizonProfile {
  return {
    elevationNominalDeg: Array<number>(360).fill(elevationDeg),
    thetaLowDeg: Array<number>(360).fill(elevationDeg),
    thetaHighDeg: Array<number>(360).fill(elevationDeg),
    blockerDistanceKm: Array<number>(360).fill(10.0),
    blockerElevationMeters: Array<number>(360).fill(0.0),
    binStatus: Array(360).fill('valid' as const),
  };
}

function setVertices(horizon: HorizonProfile, vertices: Record<number, number>): HorizonProfile {
  for (const [vertex, value] of Object.entries(vertices)) {
    const index = ((Number(vertex) % 360) + 360) % 360;
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
  azimuthRateDegHr: number,
  elevationRateDegHr: number,
  angularRadiusDeg = 0.0,
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
    observerCoordinates: {
      latitudeDeg: -89.9,
      longitudeDeg: 0,
      elevationMeters: 0,
      mastHeightMeters: 2,
      horizonsAltKm: 0,
    },
    stepSize: '10m',
    source: 'completeness-fixture',
    cached: true,
    points,
  };
}

function secondsAfter(events: readonly VisibilityEvent[], base: number): number[] {
  return events.map((e) => (e.epochMs - base) / 1000.0);
}

describe('Event topology: tangency', () => {
  it('detects a zero-clearance touch once, with no sign flip and no fabricated interval', () => {
    // g(tau) = 4*(tau - 0.5)^2  =>  g(0) = g(1) = +1.0, g(0.5) = 0. No sign change anywhere,
    // so an endpoint-sign test sees nothing and a state-based integrator must not open a gap.
    const stepSec = 600;
    const dtHr = stepSec / 3600;
    const clearance = (tau: number): number => 4 * (tau - 0.5) ** 2;
    const dClearance = (tau: number): number => 8 * (tau - 0.5);

    const pt0 = makePoint(baseMs, 10.2, clearance(0), 0.0, dClearance(0) / dtHr);
    const pt1 = makePoint(baseMs + stepSec * 1000, 10.2, clearance(1), 0.0, dClearance(1) / dtHr);
    const horizon = flatHorizon(0.0);

    const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });

    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe('TANGENTIAL_GRAZE');
    expect(events[0]!.topology).toBe('tangency');
    // Residual against the analytic zero at tau = 0.5.
    expect(Math.abs(secondsAfter(events, baseMs)[0]! - 300.0)).toBeLessThan(0.05);
    expect(Math.abs(events[0]!.clearanceDeg)).toBeLessThanOrEqual(1e-7);
    // No sign flip: the clearance is strictly positive on both sides of the touch.
    expect(clearance(0.49)).toBeGreaterThan(0.0);
    expect(clearance(0.51)).toBeGreaterThan(0.0);

    // Time localisation is undefined at a grazing contact (skill ref 07 § 4).
    expect(Math.abs(events[0]!.clearanceRateDegPerHour)).toBeLessThan(1e-6);
    expect(events[0]!.timingSensitivityHoursPerDeg).toBeNull();

    // No visible interval is fabricated around the touch: one uninterrupted visible window.
    const report = solveVisibility({
      sunTrajectory: makeTrajectory([pt0, pt1], 'Sun'),
      earthTrajectory: makeTrajectory(
        [pt0, { ...pt1, elevationDeg: 20.0, elevationRateDegHr: 0.0 }],
        'Earth',
      ),
      horizonProfile: horizon,
    });
    expect(report.sunlitIntervals.length).toBe(1);
    expect(report.sunlitIntervals[0]!.state).toBe('visible');
    expect(report.sunlitIntervals[0]!.durationHours * 3600).toBeCloseTo(stepSec, 6);
  });

  it('does not report a tangency when the minimum clearance stays above the graze tolerance', () => {
    // Same shape lifted by 1e-4 deg: the extremum is 1e-4 above zero, three orders of
    // magnitude above the 1e-7 graze tolerance, so no event may be emitted.
    const stepSec = 600;
    const dtHr = stepSec / 3600;
    const lift = 1e-4;
    const clearance = (tau: number): number => 4 * (tau - 0.5) ** 2 + lift;
    const dClearance = (tau: number): number => 8 * (tau - 0.5);

    const events = splitStepEvents({
      pt0: makePoint(baseMs, 10.2, clearance(0), 0.0, dClearance(0) / dtHr),
      pt1: makePoint(baseMs + stepSec * 1000, 10.2, clearance(1), 0.0, dClearance(1) / dtHr),
      horizonProfile: flatHorizon(0.0),
      target: 'Sun',
      criterion: 'center',
    });

    expect(events.length).toBe(0);
  });
});

describe('Event topology: same-sign double crossing', () => {
  it('finds both roots inside one 6 h step whose two endpoints are both clear', () => {
    // Cubic clearance with two interior turning points (tau = 0.45633, 0.97701) and roots at
    // tau = 0.25 and 0.75:
    //   g(tau) = -1 * (tau - 0.25)(tau - 0.75)(tau - 1.15)
    //   g(0) = +0.215625, g(1) = +0.028125  ->  an endpoint-sign test reports "no event".
    const stepSec = 21600;
    const dtHr = stepSec / 3600;
    const r1 = 0.25;
    const r2 = 0.75;
    const r3 = 1.15;
    const k = -1.0;
    const clearance = (tau: number): number => k * (tau - r1) * (tau - r2) * (tau - r3);
    const dClearance = (tau: number): number =>
      k * (3 * tau * tau - 2 * (r1 + r2 + r3) * tau + (r1 * r2 + r1 * r3 + r2 * r3));

    // Precondition that makes this a genuine same-sign double crossing, not a sign change.
    expect(clearance(0)).toBeGreaterThan(0.0);
    expect(clearance(1)).toBeGreaterThan(0.0);

    const horizon = flatHorizon(0.0);
    const pt0 = makePoint(baseMs, 10.0, clearance(0), 0.0, dClearance(0) / dtHr);
    const pt1 = makePoint(baseMs + stepSec * 1000, 10.0, clearance(1), 0.0, dClearance(1) / dtHr);

    const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });

    expect(events.length).toBe(2);
    expect(events[0]!.type).toBe('SET');
    expect(events[1]!.type).toBe('RISE');
    const [tSet, tRise] = secondsAfter(events, baseMs);
    // Analytic roots at tau = 0.25 and 0.75 of a 21600 s step.
    expect(Math.abs(tSet! - 0.25 * stepSec)).toBeLessThan(0.05);
    expect(Math.abs(tRise! - 0.75 * stepSec)).toBeLessThan(0.05);
    expect(Math.abs(events[0]!.clearanceDeg)).toBeLessThan(1e-9);
    expect(Math.abs(events[1]!.clearanceDeg)).toBeLessThan(1e-9);

    // Both crossings are real state flips, so the integrator must carve a 3 h blocked gap out
    // of a step whose endpoints are both visible.
    const report = solveVisibility({
      sunTrajectory: makeTrajectory([pt0, pt1], 'Sun'),
      earthTrajectory: makeTrajectory(
        [pt0, { ...pt1, elevationDeg: 20.0, elevationRateDegHr: 0.0 }],
        'Earth',
      ),
      horizonProfile: horizon,
    });
    expect(report.sunlitIntervals.map((i) => i.state)).toEqual(['visible', 'blocked', 'visible']);
    const blocked = report.sunlitIntervals.find((i) => i.state === 'blocked')!;
    expect(blocked.durationHours).toBeCloseTo(3.0, 3);
    expect(report.nominalMetrics.totalSunlitHours).toBeCloseTo(3.0, 2);
  });
});

describe('Event topology: 0°/360° azimuth seam', () => {
  it('resolves both crossings of a skyline vertex that sits on the seam', () => {
    // Skyline: -1° everywhere, +2° at vertex 0, so bin 359 ramps up at +3°/deg and bin 0 ramps
    // down at -3°/deg. Body: El = +0.5°, Az sweeps 359.2° -> 0.8° across the seam.
    //   blocked while h(Az) > 0.5°  =>  Az > 359.5°  (SET)  and  Az < 0.5°  (RISE)
    const horizon = setVertices(flatHorizon(-1.0), { 0: 2.0, 1: -1.0 });
    const stepSec = 600;
    const sweepDeg = 1.6;
    const rateDegHr = sweepDeg / (stepSec / 3600);

    const events = splitStepEvents({
      pt0: makePoint(baseMs, 359.2, 0.5, rateDegHr, 0.0),
      pt1: makePoint(baseMs + stepSec * 1000, 0.8, 0.5, rateDegHr, 0.0),
      horizonProfile: horizon,
      target: 'Sun',
      criterion: 'center',
    });

    expect(events.length).toBe(2);
    expect(events.map((e) => e.type)).toEqual(['SET', 'RISE']);
    const [tSet, tRise] = secondsAfter(events, baseMs);
    expect(Math.abs(tSet! - 112.5)).toBeLessThan(0.05);
    expect(Math.abs(tRise! - 487.5)).toBeLessThan(0.05);
    // Event azimuths are reported normalised into [0, 360): 359.5 and 0.5.
    expect(events[0]!.azimuthDeg).toBeCloseTo(359.5, 4);
    expect(events[1]!.azimuthDeg).toBeCloseTo(0.5, 4);
    for (const e of events) {
      expect(e.azimuthDeg).toBeGreaterThanOrEqual(0.0);
      expect(e.azimuthDeg).toBeLessThan(360.0);
    }
  });

  it('produces exactly one crossing when the seam is crossed on a flat skyline', () => {
    // El ramps -0.3° -> +0.3° while Az sweeps 359.6° -> 0.4°. A solver that treats the raw
    // azimuth delta as -359.2° would either miss the crossing or manufacture one.
    const stepSec = 600;
    const rateDegHr = 0.8 / (stepSec / 3600);
    const clearanceRateDegHr = 0.6 / (stepSec / 3600);

    const events = splitStepEvents({
      pt0: makePoint(baseMs, 359.6, -0.3, rateDegHr, clearanceRateDegHr),
      pt1: makePoint(baseMs + stepSec * 1000, 0.4, 0.3, rateDegHr, clearanceRateDegHr),
      horizonProfile: flatHorizon(0.0),
      target: 'Sun',
      criterion: 'center',
    });

    expect(events.length).toBe(1);
    // Clearance goes from blocked (-0.3°) to visible (+0.3°), so this is a rise.
    expect(events[0]!.type).toBe('RISE');
    expect(Math.abs(secondsAfter(events, baseMs)[0]! - 300.0)).toBeLessThan(0.05);
    // Azimuth at the crossing is 360.0° unwrapped, reported as 0.0°.
    expect(events[0]!.azimuthDeg).toBeCloseTo(0.0, 6);
  });
});

describe('Event topology: azimuth reversal', () => {
  it('splits at the turn-around and reports exactly the four analytic crossings', () => {
    // Az(tau) = 45.4 - 3.2*(tau - 0.5)^2 is exactly quadratic, so cubic Hermite reproduces it
    // exactly. Skyline: +1° at vertex 45, -1° at 44 and 46 (slope +-2°/deg), body El = 0.5°.
    //   blocked while h > 0.5°  =>  44.75° < Az < 45.25°
    //   Az(0) = Az(1) = 44.6°, Az(0.5) = 45.4°  =>  SET, RISE, SET, RISE
    const horizon = setVertices(flatHorizon(-1.0), { 44: -1.0, 45: 1.0, 46: -1.0 });
    const stepSec = 600;
    const dtHr = stepSec / 3600;
    const azimuth = (tau: number): number => 45.4 - 3.2 * (tau - 0.5) ** 2;
    const azimuthRate = (tau: number): number => -6.4 * (tau - 0.5);

    const events = splitStepEvents({
      pt0: makePoint(baseMs, azimuth(0), 0.5, azimuthRate(0) / dtHr, 0.0),
      pt1: makePoint(baseMs + stepSec * 1000, azimuth(1), 0.5, azimuthRate(1) / dtHr, 0.0),
      horizonProfile: horizon,
      target: 'Sun',
      criterion: 'center',
    });

    // Analytic crossing times: tau = 0.5 -+ sqrt(0.65 / 3.2) and 0.5 -+ sqrt(0.15 / 3.2).
    const down = (delta: number): number => 0.5 - Math.sqrt(delta / 3.2);
    const up = (delta: number): number => 0.5 + Math.sqrt(delta / 3.2);
    const analytic = [down(0.65), down(0.15), up(0.15), up(0.65)].map((tau) => tau * stepSec);

    expect(events.map((e) => e.type)).toEqual(['SET', 'RISE', 'SET', 'RISE']);
    const times = secondsAfter(events, baseMs);
    for (let i = 0; i < analytic.length; i++) {
      expect(Math.abs(times[i]! - analytic[i]!)).toBeLessThan(0.05);
    }
    // The retrace is symmetric about the turn-around, and the turn-around itself is not an event.
    expect(times[0]! + times[3]!).toBeCloseTo(stepSec, 6);
    expect(times[1]! + times[2]!).toBeCloseTo(stepSec, 6);
    expect(events.some((e) => Math.abs((e.epochMs - baseMs) / 1000.0 - 300.0) < 1.0)).toBe(false);
  });

  it('reports nothing when the body turns around entirely below the skyline', () => {
    const stepSec = 600;
    const events = splitStepEvents({
      pt0: makePoint(baseMs, 120.0, 0.2, 2.4, 0.0),
      pt1: makePoint(baseMs + stepSec * 1000, 119.9, 0.2, -3.6, 0.0),
      horizonProfile: flatHorizon(0.5),
      target: 'Earth',
      criterion: 'center',
    });

    expect(events.length).toBe(0);
    // The blocked state is continuous across the dAz/dt = 0 split.
    const report = solveVisibility({
      sunTrajectory: makeTrajectory([makePoint(baseMs, 120.0, 0.2, 2.4, 0.0), makePoint(baseMs + stepSec * 1000, 119.9, 0.2, -3.6, 0.0)], 'Sun'),
      earthTrajectory: makeTrajectory([makePoint(baseMs, 120.0, 0.2, 2.4, 0.0), makePoint(baseMs + stepSec * 1000, 119.9, 0.2, -3.6, 0.0)], 'Earth'),
      horizonProfile: flatHorizon(0.5),
    });
    expect(report.sunlitIntervals.length).toBe(1);
    expect(report.sunlitIntervals[0]!.state).toBe('blocked');
  });
});

describe('Error budget: numerical bracket versus physical uncertainty', () => {
  it('keeps the root bracket, the achieved residual and the physical time spread separate', () => {
    // Linear, very slow crossing: El goes -0.002° -> +0.002° over 6 h, so the clearance rate is
    // 6.667e-4 deg/h. Skill ref 07 § 4: dt*/dp = -1 / (dg/dt), so a 0.1° horizon uncertainty
    // becomes ~150 h of timing spread even though the root converges to well under a second.
    const stepSec = 21600;
    const dtHr = stepSec / 3600;
    const clearance = (tau: number): number => -0.002 + 0.004 * tau;
    const rateDegHr = 0.004 / dtHr;

    const events = splitStepEvents({
      pt0: makePoint(baseMs, 30.0, clearance(0), 0.0, rateDegHr),
      pt1: makePoint(baseMs + stepSec * 1000, 30.0, clearance(1), 0.0, rateDegHr),
      horizonProfile: flatHorizon(0.0),
      target: 'Sun',
      criterion: 'center',
      bracketTolSec: 1.0,
    });

    expect(events.length).toBe(1);
    const event = events[0]!;
    // 1. Numerical bracket: the declared Brent tolerance, in seconds.
    expect(event.solverToleranceSeconds).toBe(1.0);
    // 2. Achieved numerical residual against the analytic root.
    const achievedResidualSec = Math.abs(secondsAfter(events, baseMs)[0]! - 0.5 * stepSec);
    expect(achievedResidualSec).toBeLessThan(event.solverToleranceSeconds);
    // 3. Physical spread: |dt*/dh| is reported per event so the caller can propagate horizon
    //    uncertainty, and it is six orders of magnitude larger than the bracket.
    expect(event.timingSensitivityHoursPerDeg).not.toBeNull();
    expect(event.timingSensitivityHoursPerDeg!).toBeCloseTo(1.0 / Math.abs(rateDegHr), 6);
    const horizonSigmaDeg = 0.1;
    const physicalSpreadHours = event.timingSensitivityHoursPerDeg! * horizonSigmaDeg;
    expect(physicalSpreadHours).toBeCloseTo(150.0, 3);
    expect(physicalSpreadHours * 3600.0).toBeGreaterThan(event.solverToleranceSeconds * 1e5);
    expect(achievedResidualSec * 3600.0).toBeLessThan(physicalSpreadHours / 1e5);
  });
});

import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HorizonProfile, TopocentricTrajectory } from '@luna/contracts';
import { brentRoot } from '../apps/api/src/services/celestial/brentSolver';
import { splitStepEvents } from '../apps/api/src/services/celestial/eventSplitter';
import {
  computeHermiteCoeffs,
  evalHermite,
  evalHermiteDeriv,
  solveDerivativeRoots,
  solveHermiteValueCrossing,
  unwrapAzimuth,
} from '../apps/api/src/services/celestial/hermiteSpline';
import { horizonProfileService } from '../apps/api/src/services/celestial/horizonProfileService';
import { topocentricEphemerisService } from '../apps/api/src/services/celestial/ephemerisService';
import { solveVisibility } from '../apps/api/src/services/celestial/visibilitySolver';
import type { M4SolverProofArtifact } from '../apps/api/src/services/celestial/visibilityTypes';

function createFlatHorizon(elevation = 0.0): HorizonProfile {
  return {
    elevationNominalDeg: Array(360).fill(elevation),
    thetaLowDeg: Array(360).fill(elevation),
    thetaHighDeg: Array(360).fill(elevation),
    blockerDistanceKm: Array(360).fill(10.0),
    blockerElevationMeters: Array(360).fill(0.0),
    binStatus: Array(360).fill('valid' as const),
  };
}

describe('Milestone M4: Adversarial Challenge & Analytical Oracles', () => {
  const baseMs = 1778846400000; // 2026-05-15T12:00:00Z
  const stepMs = 600000;        // 600 seconds (10 minutes)

  test('Adversarial Oracle 1: Initial Open Window Dynamic Generalization', () => {
    const horizon = createFlatHorizon(0.0);

    // Dynamic test: Sun starts at +0.20°, sets at tau = 0.40 (t = 240s)
    // El(0) = 0.20, El(0.40) = 0, rate = -0.20 / (240 / 3600) = -3.0 deg/h
    // El(1) = 0.20 - 3.0 * (600 / 3600) = -0.30 deg
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 25.0,
      elevationDeg: 0.20,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -3.0,
      angularRadiusDeg: 0.0,
      rangeKm: 1.5e8,
      rangeRateKmS: 0,
    };
    const pt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 25.0,
      elevationDeg: -0.30,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -3.0,
      angularRadiusDeg: 0.0,
      rangeKm: 1.5e8,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });
    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe('SET');
    const tSec = (events[0]!.epochMs - baseMs) / 1000.0;
    expect(Math.abs(tSec - 240.0)).toBeLessThanOrEqual(0.001);
  });

  test('Adversarial Oracle 2: Vertex Double Crossing Across 0°/360° Seam', () => {
    // Spire at azimuth 0.0° (vertex between bin 359 and bin 0)
    // Spire elevation = +3.0°, base at 359° and 1° = -7.0°
    const horizon = createFlatHorizon(0.0);
    horizon.elevationNominalDeg[359] = -7.0;
    horizon.elevationNominalDeg[0] = 3.0;
    horizon.elevationNominalDeg[1] = -7.0;

    // Body traverses from 359.5° to 0.5° (unwrapped: 359.5° to 360.5°)
    // Sweep rate = 1.0 deg / 600s = 6.0 deg/h
    // Vertex is reached at tau = 0.50 (300s).
    // In bin 359: theta(Az) = -7 + 10*(Az - 359). For El = 1.0°: Az > 359.8° => tau > 0.30 => t_set = 180s.
    // In bin 0: theta(Az) = 3 - 10*(Az - 0). For El = 1.0°: Az < 0.2° => tau < 0.70 => t_rise = 420s.
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 359.5,
      elevationDeg: 1.0,
      azimuthRateDegHr: 6.0,
      elevationRateDegHr: 0.0,
      angularRadiusDeg: 0.0,
      rangeKm: 1.5e8,
      rangeRateKmS: 0,
    };
    const pt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 0.5,
      elevationDeg: 1.0,
      azimuthRateDegHr: 6.0,
      elevationRateDegHr: 0.0,
      angularRadiusDeg: 0.0,
      rangeKm: 1.5e8,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });
    expect(events.length).toBe(2);
    expect(events[0]!.type).toBe('SET');
    expect(events[1]!.type).toBe('RISE');

    const tSet = (events[0]!.epochMs - baseMs) / 1000.0;
    const tRise = (events[1]!.epochMs - baseMs) / 1000.0;
    expect(Math.abs(tSet - 180.0)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(tRise - 420.0)).toBeLessThanOrEqual(0.01);
  });

  test('Adversarial Oracle 3: Asymmetric Intra-Bin Same-Sign Double Crossing', () => {
    // Endpoints: g(0) = +0.50, g(1) = +0.80.
    // Cubic polynomial with interior minimum dipping below zero:
    // Let g(tau) = 3*tau^2 - 2.7*tau + 0.50
    // Extremum dg/dtau = 6*tau - 2.7 = 0 => tau_ext = 0.45 (270s)
    // g(0.45) = 3*(0.2025) - 2.7*(0.45) + 0.5 = 0.6075 - 1.215 + 0.5 = -0.1075 < 0
    // Roots of 3*tau^2 - 2.7*tau + 0.5 = 0:
    // disc = 2.7^2 - 4*3*0.5 = 7.29 - 6.0 = 1.29
    // tau1 = (2.7 - sqrt(1.29)) / 6 = (2.7 - 1.1357817) / 6 = 0.260703 (156.42s)
    // tau2 = (2.7 + sqrt(1.29)) / 6 = (2.7 + 1.1357817) / 6 = 0.639297 (383.58s)
    const horizon = createFlatHorizon(0.0);
    // Rate at tau=0: -2.7 / (600/3600) = -16.2 deg/h
    // Rate at tau=1: (6 - 2.7) / (600/3600) = 3.3 / (1/6) = +19.8 deg/h
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 50.0,
      elevationDeg: 0.50,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -16.2,
      angularRadiusDeg: 0.0,
      rangeKm: 1.5e8,
      rangeRateKmS: 0,
    };
    const pt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 50.0,
      elevationDeg: 0.80,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: 19.8,
      angularRadiusDeg: 0.0,
      rangeKm: 1.5e8,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });
    expect(events.length).toBe(2);
    expect(events[0]!.type).toBe('SET');
    expect(events[1]!.type).toBe('RISE');

    const tSet = (events[0]!.epochMs - baseMs) / 1000.0;
    const tRise = (events[1]!.epochMs - baseMs) / 1000.0;
    expect(Math.abs(tSet - 156.422)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(tRise - 383.578)).toBeLessThanOrEqual(0.01);
  });

  test('Adversarial Oracle 4: Tangential Graze State Parity Invariant', () => {
    // When grazing tangent at 0.0°, solveVisibility must NOT fracture into false shadow
    const horizon = createFlatHorizon(0.0);
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 10.2,
      elevationDeg: 1.0,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -24.0,
      angularRadiusDeg: 0.0,
      rangeKm: 1.5e8,
      rangeRateKmS: 0,
    };
    const pt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 10.2,
      elevationDeg: 1.0,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: 24.0,
      angularRadiusDeg: 0.0,
      rangeKm: 1.5e8,
      rangeRateKmS: 0,
    };

    const sunTrajectory: TopocentricTrajectory = {
      target: 'Sun',
      targetCommand: '10',
      observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 },
      stepSize: '10m',
      source: 'benchmark-fixture',
      cached: true,
      points: [pt0, pt1],
    };
    const earthTrajectory = { ...sunTrajectory, target: 'Earth' as const, targetCommand: '399' as const };

    const report = solveVisibility({ sunTrajectory, earthTrajectory, horizonProfile: horizon });
    expect(report.sunlitIntervals.length).toBe(1);
    expect(report.sunlitIntervals[0]!.state).toBe('visible');
    expect(report.sunlitIntervals[0]!.durationHours * 3600).toBeCloseTo(600.0, 1);
    expect(report.nominalMetrics.totalSunlitHours).toBeCloseTo(600.0 / 3600.0, 4);
    expect(report.nominalMetrics.maxContinuousShadowHours).toBe(0.0);
  });

  test('Adversarial Oracle 5: Earth Libration Turnaround in Free Space (No Occlusion)', () => {
    // Azimuth turnaround in flat open horizon with high elevation
    const horizon = createFlatHorizon(0.0);
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 120.00,
      elevationDeg: 5.0,
      azimuthRateDegHr: 2.4,
      elevationRateDegHr: 0.0,
      angularRadiusDeg: 0.0,
      rangeKm: 384000,
      rangeRateKmS: 0,
    };
    const pt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 119.90,
      elevationDeg: 5.0,
      azimuthRateDegHr: -3.6,
      elevationRateDegHr: 0.0,
      angularRadiusDeg: 0.0,
      rangeKm: 384000,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Earth', criterion: 'center' });
    expect(events.length).toBe(0); // Zero events because elevation stays safely above horizon
  });

  test('Adversarial Oracle 6: Disjoint vs Contained Multi-Criteria Overlaps', () => {
    const horizon = createFlatHorizon(0.0);

    // Subtest A: Completely Disjoint Windows
    // Sun visible [0, 200]s (tau 0 to 0.333), Earth visible [400, 600]s (tau 0.667 to 1)
    const sunPt0 = { timestampUtc: new Date(baseMs).toISOString(), epochMs: baseMs, azimuthDeg: 10, elevationDeg: 1.0, azimuthRateDegHr: 0, elevationRateDegHr: -18.0, angularRadiusDeg: 0, rangeKm: 1.5e8, rangeRateKmS: 0 };
    const sunPt1 = { timestampUtc: new Date(baseMs + stepMs).toISOString(), epochMs: baseMs + stepMs, azimuthDeg: 10, elevationDeg: -2.0, azimuthRateDegHr: 0, elevationRateDegHr: -18.0, angularRadiusDeg: 0, rangeKm: 1.5e8, rangeRateKmS: 0 };
    const earthPt0 = { timestampUtc: new Date(baseMs).toISOString(), epochMs: baseMs, azimuthDeg: 180, elevationDeg: -2.0, azimuthRateDegHr: 0, elevationRateDegHr: 18.0, angularRadiusDeg: 0, rangeKm: 3.84e5, rangeRateKmS: 0 };
    const earthPt1 = { timestampUtc: new Date(baseMs + stepMs).toISOString(), epochMs: baseMs + stepMs, azimuthDeg: 180, elevationDeg: 1.0, azimuthRateDegHr: 0, elevationRateDegHr: 18.0, angularRadiusDeg: 0, rangeKm: 3.84e5, rangeRateKmS: 0 };

    const reportA = solveVisibility({
      sunTrajectory: { target: 'Sun', targetCommand: '10', observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 }, stepSize: '10m', source: 'b', cached: true, points: [sunPt0, sunPt1] },
      earthTrajectory: { target: 'Earth', targetCommand: '399', observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 }, stepSize: '10m', source: 'b', cached: true, points: [earthPt0, earthPt1] },
      horizonProfile: horizon,
    });

    const overlapA = reportA.combinedIntervals.filter((i) => i.state === 'visible');
    expect(overlapA.length).toBe(0);
    expect(reportA.nominalMetrics.combinedSunAndEarthHours).toBe(0.0);
    expect(reportA.nominalMetrics.combinedSunAndEarthPercentage).toBe(0.0);

    // Subtest B: Fully Contained Window
    // Earth visible [150, 450]s completely inside Sun visible [0, 600]s
    const sunPtAll = { ...sunPt0, elevationDeg: 3.0, elevationRateDegHr: 0.0 };
    const sunPtAllEnd = { ...sunPt1, elevationDeg: 3.0, elevationRateDegHr: 0.0 };
    // Earth dips from -0.75° to +0.25° to -0.75° (roots at 150s and 450s, visible between 150s and 450s)
    const earthDip0 = { timestampUtc: new Date(baseMs).toISOString(), epochMs: baseMs, azimuthDeg: 180, elevationDeg: -0.75, azimuthRateDegHr: 0, elevationRateDegHr: 24.0, angularRadiusDeg: 0, rangeKm: 3.84e5, rangeRateKmS: 0 };
    const earthDip1 = { timestampUtc: new Date(baseMs + stepMs).toISOString(), epochMs: baseMs + stepMs, azimuthDeg: 180, elevationDeg: -0.75, azimuthRateDegHr: 0, elevationRateDegHr: -24.0, angularRadiusDeg: 0, rangeKm: 3.84e5, rangeRateKmS: 0 };

    const reportB = solveVisibility({
      sunTrajectory: { target: 'Sun', targetCommand: '10', observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 }, stepSize: '10m', source: 'b', cached: true, points: [sunPtAll, sunPtAllEnd] },
      earthTrajectory: { target: 'Earth', targetCommand: '399', observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 }, stepSize: '10m', source: 'b', cached: true, points: [earthDip0, earthDip1] },
      horizonProfile: horizon,
    });

    const overlapB = reportB.combinedIntervals.find((i) => i.state === 'visible');
    expect(overlapB).toBeDefined();
    expect(overlapB!.durationHours * 3600).toBeCloseTo(300.0, 1); // [150, 450]s is 300s
    expect((overlapB!.startEpochMs - baseMs) / 1000.0).toBeCloseTo(150.0, 1);
    expect((overlapB!.endEpochMs - baseMs) / 1000.0).toBeCloseTo(450.0, 1);
  });

  test('Adversarial Oracle 7: Numerical Stability of Citardauq Formula in Catastrophic Cancellation', () => {
    // When B^2 >> 4AC, standard quadratic formula (-B + sqrt(B^2 - 4AC)) / 2A loses precision due to subtraction
    // Citardauq: q = -0.5*(B + sgn(B)*sqrt(disc)), r1 = q/A, r2 = C/q
    // Let's create Hermite derivative coeffs with huge B relative to 4AC:
    // 3*c3*tau^2 + 2*c2*tau + c1 = 0
    // A = 3*c3 = 1e-6, B = 2*c2 = 1.0, C = c1 = 1e-7
    // disc = 1.0 - 4*(1e-6)*(1e-7) = 1.0 - 4e-13
    const cFake = { c3: 1e-6 / 3.0, c2: 0.5, c1: 1e-7, c0: 0 };
    const roots = solveDerivativeRoots(cFake, -2e6, 10.0);
    expect(roots.length).toBe(2);
    expect(roots[0]!).toBeCloseTo(-1e6, -1);
    expect(roots[1]!).toBeCloseTo(-1e-7, 8);
    // r2 = C / q = 1e-7 / (-0.5 * (1 + 1)) = -1e-7
    expect(roots[0]!).toBeCloseTo(-1e6, -1);
    expect(roots[1]!).toBeCloseTo(-1e-7, 8);
  });
});

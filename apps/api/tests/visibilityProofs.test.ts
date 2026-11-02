import { describe, expect, it } from 'bun:test';
import type { HorizonProfile, TopocentricTrajectory } from '@luna/contracts';
import { splitStepEvents } from '../src/services/celestial/eventSplitter';
import { solveVisibility } from '../src/services/celestial/visibilitySolver';

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

describe('Stage 2.2 Analytical Visibility Solver Proofs (6 Edge Cases)', () => {
  const baseMs = 1778846400000; // 2026-05-15T12:00:00Z
  const stepMs = 600000;        // 10 minutes (600s)

  it('Proof Case 1: Initial Open Window at t_0', () => {
    // Sun starts visible at t_0 (El = +0.10°), sets at t = 180s (tau = 0.30)
    // El(tau) = 0.1 - (0.1 / 0.3)*tau = 0.1 - 0.333333*tau.
    // At tau=0: El = +0.1. At tau=0.3: El = 0. At tau=1: El = -0.233333.
    // Physical rate = -0.333333 / (600/3600) = -2.0 deg/h.
    const horizon = createFlatHorizon(0.0);
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 10.0,
      elevationDeg: 0.10,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -2.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };
    const pt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 10.0,
      elevationDeg: -0.23333333,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -2.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({
      pt0,
      pt1,
      horizonProfile: horizon,
      target: 'Sun',
      criterion: 'center',
    });

    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe('SET');
    const eventTimeSec = (events[0]!.epochMs - baseMs) / 1000.0;
    expect(eventTimeSec).toBeCloseTo(180.0, 1); // Exact setting at 180s

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
    expect(report.sunlitIntervals.length).toBe(2); // 1 visible, 1 blocked
    expect(report.sunlitIntervals[0]!.state).toBe('visible');
    expect(report.sunlitIntervals[0]!.durationHours * 3600).toBeCloseTo(180.0, 1);
    expect(report.sunlitIntervals[1]!.state).toBe('blocked');
    expect(report.sunlitIntervals[1]!.durationHours * 3600).toBeCloseTo(420.0, 1);
  });

  it('Proof Case 2: Vertex Double Crossing (Grid Vertex Split)', () => {
    // Azimuth sweeps 44.5° -> 45.5° across vertex 45.0° at t = 300s (tau = 0.5)
    // Narrow spire peaks at +2.0° at vertex 45°, with base -8.0° at 44° and 46°.
    // Constant body elevation El = +1.0°.
    // Bin 44: theta(Az) = -8 + 10*(Az - 44). Eclipsed when theta > 1.0 => Az > 44.9 (tau = 0.40, t = 240s, SET).
    // Bin 45: theta(Az) = 2 - 10*(Az - 45). Eclipsed when theta > 1.0 => Az < 45.1 (tau = 0.60, t = 360s, RISE).
    const horizon = createFlatHorizon(0.0);
    horizon.elevationNominalDeg[44] = -8.0;
    horizon.elevationNominalDeg[45] = 2.0;
    horizon.elevationNominalDeg[46] = -8.0;
    horizon.thetaLowDeg[44] = -8.0;
    horizon.thetaLowDeg[45] = 2.0;
    horizon.thetaLowDeg[46] = -8.0;
    horizon.thetaHighDeg[44] = -8.0;
    horizon.thetaHighDeg[45] = 2.0;
    horizon.thetaHighDeg[46] = -8.0;

    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 44.5,
      elevationDeg: 1.0,
      azimuthRateDegHr: 6.0, // 1 deg per 600s
      elevationRateDegHr: 0.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };
    const pt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 45.5,
      elevationDeg: 1.0,
      azimuthRateDegHr: 6.0,
      elevationRateDegHr: 0.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({
      pt0,
      pt1,
      horizonProfile: horizon,
      target: 'Sun',
      criterion: 'center',
    });

    // Stage B splits at vertex 45.0°, isolating both slopes without kink failure
    expect(events.length).toBe(2);
    expect(events[0]!.type).toBe('SET');
    expect(events[1]!.type).toBe('RISE');

    const tSetSec = (events[0]!.epochMs - baseMs) / 1000.0;
    const tRiseSec = (events[1]!.epochMs - baseMs) / 1000.0;
    expect(tSetSec).toBeCloseTo(240.0, 1);
    expect(tRiseSec).toBeCloseTo(360.0, 1);
  });

  it('Proof Case 3: Intra-Bin Same-Sign Double Crossing', () => {
    // Azimuth stays within bin [10°, 11°]. Horizon = 0.0°.
    // Quadratic clearance: g(tau) = 4*tau^2 - 4*tau + 0.75 = 4*(tau - 0.25)*(tau - 0.75).
    // g(0) = +0.75 > 0, g(1) = +0.75 > 0.
    // Minimum at tau = 0.5 where g(0.5) = -0.25 < 0.
    // Settling root at tau = 0.25 (150s), rising root at tau = 0.75 (450s).
    // Hermite representation: c3 = 0, c2 = 4, c1 = -4, c0 = 0.75.
    // Rate at tau=0 is -4 / (600/3600) = -24 deg/h. Rate at tau=1 is +4 / (600/3600) = +24 deg/h.
    const horizon = createFlatHorizon(0.0);
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 10.2,
      elevationDeg: 0.75,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -24.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };
    const pt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 10.2,
      elevationDeg: 0.75,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: 24.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({
      pt0,
      pt1,
      horizonProfile: horizon,
      target: 'Sun',
      criterion: 'center',
    });

    // Stage C Rolle's theorem split at extremum tau=0.5 isolates both roots!
    expect(events.length).toBe(2);
    expect(events[0]!.type).toBe('SET');
    expect(events[1]!.type).toBe('RISE');

    const tSetSec = (events[0]!.epochMs - baseMs) / 1000.0;
    const tRiseSec = (events[1]!.epochMs - baseMs) / 1000.0;
    expect(tSetSec).toBeCloseTo(150.0, 1);
    expect(tRiseSec).toBeCloseTo(450.0, 1);
  });

  it('Proof Case 4: Intra-Bin Tangential Graze', () => {
    // Trajectory dips to touch exactly 0.000000° tangent at tau = 0.5 (300s) without crossing below
    // g(tau) = 4*(tau - 0.5)^2 = 4*tau^2 - 4*tau + 1.0.
    // g(0) = 1.0, g(1) = 1.0, g(0.5) = 0.000000°.
    const horizon = createFlatHorizon(0.0);
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 10.2,
      elevationDeg: 1.0,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -24.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
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
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({
      pt0,
      pt1,
      horizonProfile: horizon,
      target: 'Sun',
      criterion: 'center',
      tangentialGrazeTolDeg: 1e-7,
    });

    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe('TANGENTIAL_GRAZE');
    const tGrazeSec = (events[0]!.epochMs - baseMs) / 1000.0;
    expect(tGrazeSec).toBeCloseTo(300.0, 1);
    expect(Math.abs(events[0]!.clearanceDeg)).toBeLessThanOrEqual(1e-7);

    // Verify visibility report preserves state parity (continuous visible)
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
  });

  it('Proof Case 5: Earth Libration Turnaround (dAz/dt = 0)', () => {
    // Azimuth reverses at tau = 0.40 (240s).
    // Az(tau) = a*tau^2 + b*tau + c. Peak at tau = 0.40.
    // Let Az(tau) = -0.5*(tau - 0.4)^2 + 120.08 = -0.5*tau^2 + 0.4*tau + 120.0
    // dAz/dtau = -1.0*tau + 0.4 = 0 => tau = 0.40.
    // Rate at tau=0: +0.4 / (600/3600) = +2.4 deg/h.
    // Rate at tau=1: -0.6 / (600/3600) = -3.6 deg/h.
    // Az(0) = 120.00, Az(1) = 119.90. Peak Az(0.4) = 120.08.
    // Spire at azimuth 120.04° with elevation +1.5°.
    // Earth elevation = +1.0° (occulted when Az > 120.04°).
    // Eclipsed during [tau_in, tau_out] around the turnaround point.
    const horizon = createFlatHorizon(0.0);
    // Bin 120 covers [120, 121]. Set bin 120 slope to produce ridge
    horizon.elevationNominalDeg[120] = 0.0;
    horizon.elevationNominalDeg[121] = 10.0; // slope = 10 deg/deg
    // Ridge elevation = 10 * (Az - 120).
    // Earth El = 0.5°. Occulted when 10 * (Az - 120) > 0.5 => Az > 120.05.
    // Az(tau) = -0.5*tau^2 + 0.4*tau + 120.0.
    // Az(tau) = 120.05 => -0.5*tau^2 + 0.4*tau - 0.05 = 0 => tau^2 - 0.8*tau + 0.1 = 0
    // tau = (0.8 +- sqrt(0.64 - 0.4)) / 2 = (0.8 +- sqrt(0.24)) / 2
    // tau_1 = (0.8 - 0.489898)/2 = 0.155051 (93.03s, SET)
    // tau_2 = (0.8 + 0.489898)/2 = 0.644949 (386.97s, RISE)
    const pt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 120.00,
      elevationDeg: 0.5,
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
      elevationDeg: 0.5,
      azimuthRateDegHr: -3.6,
      elevationRateDegHr: 0.0,
      angularRadiusDeg: 0.0,
      rangeKm: 384000,
      rangeRateKmS: 0,
    };

    const events = splitStepEvents({
      pt0,
      pt1,
      horizonProfile: horizon,
      target: 'Earth',
      criterion: 'center',
    });

    // Stage A splits at tau=0.40 turnaround, isolating the ingress and egress cleanly
    expect(events.length).toBe(2);
    expect(events[0]!.type).toBe('SET');
    expect(events[1]!.type).toBe('RISE');

    const tSetSec = (events[0]!.epochMs - baseMs) / 1000.0;
    const tRiseSec = (events[1]!.epochMs - baseMs) / 1000.0;
    expect(tSetSec).toBeCloseTo(93.03, 0);
    expect(tRiseSec).toBeCloseTo(386.97, 0);
  });

  it('Proof Case 6: Partial Sun-Earth Overlap Window Duration', () => {
    // Sun visible on [120, 600]s (duration 480s).
    // Earth visible on [0, 360]s (duration 360s).
    // Exact overlap is [120, 360]s (duration 240s = 4.00 min = 0.066667 h).
    const horizon = createFlatHorizon(0.0);

    // Sun starts at -0.5°, rate = +2.5 deg/h (reaches 0° at tau = 0.5 / (2.5 * 600/3600) = 0.20 => 120s)
    const sunPt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 10.0,
      elevationDeg: -0.5,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: 15.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };
    // Linear elevation from -0.5 to +2.0 => El(tau) = -0.5 + 2.5*tau => root at tau=0.2 (120s)
    const sunPt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 10.0,
      elevationDeg: 2.0,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: 15.0,
      angularRadiusDeg: 0.0,
      rangeKm: 150000000,
      rangeRateKmS: 0,
    };

    // Earth starts at +1.5°, linear to -1.0° => El(tau) = 1.5 - 2.5*tau => root at tau=0.6 (360s)
    const earthPt0 = {
      timestampUtc: new Date(baseMs).toISOString(),
      epochMs: baseMs,
      azimuthDeg: 180.0,
      elevationDeg: 1.5,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -15.0,
      angularRadiusDeg: 0.0,
      rangeKm: 384000,
      rangeRateKmS: 0,
    };
    const earthPt1 = {
      timestampUtc: new Date(baseMs + stepMs).toISOString(),
      epochMs: baseMs + stepMs,
      azimuthDeg: 180.0,
      elevationDeg: -1.0,
      azimuthRateDegHr: 0.0,
      elevationRateDegHr: -15.0,
      angularRadiusDeg: 0.0,
      rangeKm: 384000,
      rangeRateKmS: 0,
    };

    const sunTrajectory: TopocentricTrajectory = {
      target: 'Sun',
      targetCommand: '10',
      observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 },
      stepSize: '10m',
      source: 'benchmark-fixture',
      cached: true,
      points: [sunPt0, sunPt1],
    };
    const earthTrajectory: TopocentricTrajectory = {
      target: 'Earth',
      targetCommand: '399',
      observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 },
      stepSize: '10m',
      source: 'benchmark-fixture',
      cached: true,
      points: [earthPt0, earthPt1],
    };

    const report = solveVisibility({ sunTrajectory, earthTrajectory, horizonProfile: horizon });

    // Verify exact overlap interval [120, 360]s
    const visibleOverlap = report.combinedIntervals.find((i) => i.state === 'visible');
    expect(visibleOverlap).toBeDefined();
    const overlapDurationSec = visibleOverlap!.durationHours * 3600;
    expect(overlapDurationSec).toBeCloseTo(240.0, 1);
    expect((visibleOverlap!.startEpochMs - baseMs) / 1000.0).toBeCloseTo(120.0, 1);
    expect((visibleOverlap!.endEpochMs - baseMs) / 1000.0).toBeCloseTo(360.0, 1);
  });
});

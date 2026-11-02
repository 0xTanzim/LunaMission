/**
 * Event-solver completeness evidence — convergence.
 *
 * Two independent discretisation axes are refined against each other:
 *   1. the ephemeris sampling cadence (how the cubic Hermite interpolant is fed), and
 *   2. the skyline tessellation spacing (how the 1°-grid horizon is described).
 *
 * The four-stage root isolation itself is exact for a given discretisation: it partitions at
 * every azimuth-stationary point, every crossed skyline vertex and envelope branch switch, and
 * every clearance extremum, so each resulting sub-panel is monotonic and holds at most one
 * root. What these tests measure is the *input* error that survives that exact isolation, i.e.
 * how fast the event set converges as the inputs are refined. Convergence is evidence of
 * consistency, not a proof of completeness for an arbitrary trajectory.
 */

import { describe, expect, it } from 'bun:test';
import type { HorizonProfile, TopocentricEphemerisPoint, TopocentricTrajectory } from '@luna/contracts';
import { splitStepEvents } from '../src/services/celestial/eventSplitter';
import { solveVisibility } from '../src/services/celestial/visibilitySolver';
import type { VisibilityEvent, VisibilityReport } from '../src/services/celestial/visibilityTypes';

const startMs = Date.parse('2026-11-01T00:00:00.000Z');
const windowHours = 12;

/** Analytic body state: azimuth oscillates (so libration turn-arounds are exercised). */
const azimuthAt = (hours: number): number => 200 + 30 * Math.sin((2 * Math.PI * hours) / 24);
const azimuthRateAt = (hours: number): number =>
  ((30 * 2 * Math.PI) / 24) * Math.cos((2 * Math.PI * hours) / 24);
const elevationAt = (hours: number): number => 0.05 + 0.5 * Math.sin((2 * Math.PI * hours) / 4 + 0.4);
const elevationRateAt = (hours: number): number =>
  ((0.5 * 2 * Math.PI) / 4) * Math.cos((2 * Math.PI * hours) / 4 + 0.4);

/** Smooth analytic skyline, tessellated at `spacingDeg` and linearly interpolated to 1° bins. */
function tessellatedHorizon(spacingDeg: number, phaseDeg = 0.0): HorizonProfile {
  const skyline = (azDeg: number): number =>
    0.12 * Math.sin((3 * Math.PI * azDeg) / 180) + 0.06 * Math.cos((7 * Math.PI * azDeg) / 180);
  const anchorCount = Math.round(360 / spacingDeg);
  const anchors: number[] = [];
  for (let i = 0; i <= anchorCount; i++) anchors.push(skyline(i * spacingDeg + phaseDeg));

  const values: number[] = [];
  for (let bin = 0; bin < 360; bin++) {
    const anchorIndex = Math.floor(bin / spacingDeg);
    const fraction = (bin - anchorIndex * spacingDeg) / spacingDeg;
    values.push((1 - fraction) * anchors[anchorIndex]! + fraction * anchors[anchorIndex + 1]!);
  }

  return {
    elevationNominalDeg: values,
    thetaLowDeg: values.map((v) => v - 0.05),
    thetaHighDeg: values.map((v) => v + 0.05),
    blockerDistanceKm: Array<number>(360).fill(10.0),
    blockerElevationMeters: Array<number>(360).fill(0.0),
    binStatus: Array(360).fill('valid' as const),
  };
}

function ephemerisPoint(epochMs: number, hours: number): TopocentricEphemerisPoint {
  return {
    timestampUtc: new Date(epochMs).toISOString(),
    epochMs,
    azimuthDeg: ((azimuthAt(hours) % 360) + 360) % 360,
    elevationDeg: elevationAt(hours),
    azimuthRateDegHr: azimuthRateAt(hours),
    elevationRateDegHr: elevationRateAt(hours),
    angularRadiusDeg: 0.26,
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
    source: 'convergence-fixture',
    cached: true,
    points,
  };
}

/** Sun-centre events of the analytic body over the window at a given cadence. */
function centreEvents(cadenceSec: number, horizon: HorizonProfile): VisibilityEvent[] {
  const steps = Math.round((windowHours * 3600) / cadenceSec);
  const events: VisibilityEvent[] = [];
  for (let i = 0; i < steps; i++) {
    const epochMs = startMs + i * cadenceSec * 1000;
    events.push(
      ...splitStepEvents({
        pt0: ephemerisPoint(epochMs, (i * cadenceSec) / 3600),
        pt1: ephemerisPoint(epochMs + cadenceSec * 1000, ((i + 1) * cadenceSec) / 3600),
        horizonProfile: horizon,
        target: 'Sun',
        criterion: 'center',
      }),
    );
  }
  return events;
}

/** A root may be reported by both steps that share it; collapse coincident detections. */
function dedupe(events: readonly VisibilityEvent[], toleranceMs = 1000): VisibilityEvent[] {
  const sorted = [...events].sort((a, b) => a.epochMs - b.epochMs);
  const unique: VisibilityEvent[] = [];
  for (const event of sorted) {
    if (unique.length === 0 || event.epochMs - unique[unique.length - 1]!.epochMs > toleranceMs) {
      unique.push(event);
    }
  }
  return unique;
}

function maxResidualSec(a: readonly VisibilityEvent[], b: readonly VisibilityEvent[]): number {
  let worst = 0.0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    worst = Math.max(worst, Math.abs(a[i]!.epochMs - b[i]!.epochMs) / 1000.0);
  }
  return worst;
}

function solveWithCadence(cadenceSec: number, horizon: HorizonProfile): VisibilityReport {
  const steps = Math.round((windowHours * 3600) / cadenceSec);
  const sunPoints: TopocentricEphemerisPoint[] = [];
  const earthPoints: TopocentricEphemerisPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const epochMs = startMs + i * cadenceSec * 1000;
    const point = ephemerisPoint(epochMs, (i * cadenceSec) / 3600);
    sunPoints.push(point);
    // Earth parked high above the skyline so the report isolates solar behaviour.
    earthPoints.push({ ...point, elevationDeg: 30.0, elevationRateDegHr: 0.0, angularRadiusDeg: 0.95 });
  }
  return solveVisibility({
    sunTrajectory: makeTrajectory(sunPoints, 'Sun'),
    earthTrajectory: makeTrajectory(earthPoints, 'Earth'),
    horizonProfile: horizon,
  });
}

describe('Convergence: ephemeris time cadence', () => {
  const horizon = tessellatedHorizon(1.0);

  it('converges to one event set as the cadence is refined from 10 min to 1 min', () => {
    const reference = dedupe(centreEvents(60, horizon));
    expect(reference.length).toBeGreaterThanOrEqual(3);

    const cadences = [600, 300, 120, 60];
    const residuals: number[] = [];
    for (const cadence of cadences) {
      const events = dedupe(centreEvents(cadence, horizon));
      // Same event set: identical count and identical rise/set ordering.
      expect(events.length).toBe(reference.length);
      expect(events.map((e) => e.type)).toEqual(reference.map((e) => e.type));
      residuals.push(maxResidualSec(events, reference));
    }

    // Residual shrinks monotonically under refinement and the 10 min cadence is already
    // sub-second; the reference cadence reproduces itself exactly.
    for (let i = 1; i < residuals.length; i++) {
      expect(residuals[i]!).toBeLessThanOrEqual(residuals[i - 1]!);
    }
    expect(residuals[0]!).toBeLessThan(1.0);
    expect(residuals[1]!).toBeLessThanOrEqual(residuals[0]! + 1e-9);
    expect(residuals[residuals.length - 1]!).toBe(0.0);
  });

  it('converges to the same total illumination duration at every cadence', () => {
    const reports = [600, 300, 120].map((cadence) => solveWithCadence(cadence, horizon));
    const durations = reports.map((r) => r.nominalMetrics.totalSunlitHours);
    expect(durations.every((d) => d > 0.0 && d < windowHours)).toBe(true);
    for (let i = 1; i < durations.length; i++) {
      expect(durations[i]!).toBeCloseTo(durations[0]!, 2);
    }
    // Frozen evaluation window and identical boundary states: the horizon-band envelope agrees too.
    for (const report of reports) {
      expect(report.nominalMetrics.totalEvaluationHours).toBeCloseTo(windowHours, 6);
    }
  });
});

describe('Convergence: skyline azimuth-grid resolution', () => {
  const cadenceSec = 600;

  it('converges to one event set as the skyline tessellation is refined from 4° to 1°', () => {
    // Cadence held fixed so the residual isolates the skyline discretisation only.
    const reference = dedupe(centreEvents(cadenceSec, tessellatedHorizon(1.0)));
    expect(reference.length).toBeGreaterThanOrEqual(3);

    const residuals: number[] = [];
    for (const spacing of [4.0, 2.0]) {
      const events = dedupe(centreEvents(cadenceSec, tessellatedHorizon(spacing)));
      expect(events.length).toBe(reference.length);
      expect(events.map((e) => e.type)).toEqual(reference.map((e) => e.type));
      residuals.push(maxResidualSec(events, reference));
    }

    // Halving the tessellation spacing shrinks the event-time residual, and the residual is
    // bounded by the horizon change across the coarse cells divided by the crossing rate.
    expect(residuals[1]!).toBeLessThan(residuals[0]!);
    expect(residuals[0]!).toBeLessThan(200.0);
    expect(residuals[1]!).toBeLessThan(100.0);
  });

  it('converges to the same illumination duration as the skyline is refined', () => {
    const coarse = solveWithCadence(cadenceSec, tessellatedHorizon(4.0));
    const fine = solveWithCadence(cadenceSec, tessellatedHorizon(1.0));
    const medium = solveWithCadence(cadenceSec, tessellatedHorizon(2.0));

    // Duration residual strictly decreases with resolution and is far below one cadence step.
    const dCoarse = Math.abs(coarse.nominalMetrics.totalSunlitHours - fine.nominalMetrics.totalSunlitHours);
    const dMedium = Math.abs(medium.nominalMetrics.totalSunlitHours - fine.nominalMetrics.totalSunlitHours);
    expect(dMedium).toBeLessThanOrEqual(dCoarse);
    expect(dCoarse * 3600).toBeLessThan(cadenceSec);
    expect(fine.nominalMetrics.sunlightPercentage).toBeGreaterThan(0.0);
  });

  it('quantifies the residual 1°-tessellation error floor that remains at the finest grid', () => {
    // The solver supports exactly one azimuth grid: 360 bins of 1°. Shifting the analytic
    // skyline by a sub-grid phase and undoing the phase change in time shows how much a finer
    // skyline would still move the events. This is *input* discretisation, not solver error.
    const base = dedupe(centreEvents(cadenceSec, tessellatedHorizon(1.0)));
    const skylineSlopeDegPerDeg = 0.12 * ((3 * Math.PI) / 180);

    for (const phaseDeg of [0.25, 0.5, 0.75]) {
      const shifted = dedupe(centreEvents(cadenceSec, tessellatedHorizon(1.0, phaseDeg)));
      expect(shifted.length).toBe(base.length);
      expect(shifted.map((e) => e.type)).toEqual(base.map((e) => e.type));
      const shiftSec = maxResidualSec(shifted, base);
      // Bounded by the extra travel time across half a bin of skyline: half-bin skyline change
      // divided by the slowest crossing rate in the window.
      const boundSec = ((0.5 * skylineSlopeDegPerDeg) / 0.0005) * 3600.0;
      expect(shiftSec).toBeLessThan(boundSec);
      expect(shiftSec).toBeGreaterThan(0.0);
    }
  });
});

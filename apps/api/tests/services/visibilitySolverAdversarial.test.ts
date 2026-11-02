import { describe, expect, it } from 'bun:test';
import type { HorizonProfile, TopocentricEphemerisPoint, TopocentricTrajectory } from '@luna/contracts';
import { splitStepEvents } from '../../src/services/celestial/eventSplitter';
import { solveVisibility } from '../../src/services/celestial/visibilitySolver';
import { horizonProfileService } from '../../src/services/celestial/horizonProfileService';

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

const baseMs = 1778846400000; // 2026-05-15T12:00:00Z
const stepSec = 600;          // 10 minutes
const dtHr = stepSec / 3600.0;

function makePt(
  epochMs: number,
  az: number,
  el: number,
  azRate = 0.0,
  elRate = 0.0,
  radius = 0.0,
): TopocentricEphemerisPoint {
  return {
    timestampUtc: new Date(epochMs).toISOString(),
    epochMs,
    azimuthDeg: az,
    elevationDeg: el,
    azimuthRateDegHr: azRate,
    elevationRateDegHr: elRate,
    angularRadiusDeg: radius,
    rangeKm: 150000000,
    rangeRateKmS: 0,
  };
}

function makeTraj(
  pts: TopocentricEphemerisPoint[],
  target: 'Sun' | 'Earth' = 'Sun',
): TopocentricTrajectory {
  return {
    target,
    targetCommand: target === 'Sun' ? '10' : '399',
    observerCoordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 0, mastHeightMeters: 2, horizonsAltKm: 0 },
    stepSize: '10m',
    source: 'adversarial-suite',
    cached: true,
    points: pts,
  };
}

describe('Adversarial Stress Suite: Milestone M4 Visibility Solver', () => {
  describe('1. Tangential Grazes & Parity Preservation', () => {
    it('Scenario 1A: Positive near-graze (+1e-8°) from above preserves 100% visible parity', () => {
      const horizon = createFlatHorizon(0.0);
      const pt0 = makePt(baseMs, 30.0, 0.0625 + 1e-8, 0.0, (-0.25) / dtHr);
      const pt1 = makePt(baseMs + stepSec * 1000, 30.0, 0.0625 + 1e-8, 0.0, (+0.25) / dtHr);

      const events = splitStepEvents({
        pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center', tangentialGrazeTolDeg: 1e-7,
      });

      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe('TANGENTIAL_GRAZE');
      expect((events[0]!.epochMs - baseMs) / 1000.0).toBeCloseTo(300.0, 1);
      expect(events[0]!.clearanceDeg).toBeCloseTo(1e-8, 9);

      const sunTraj = makeTraj([pt0, pt1], 'Sun');
      const earthTraj = makeTraj([pt0, pt1], 'Earth');
      const report = solveVisibility({ sunTrajectory: sunTraj, earthTrajectory: earthTraj, horizonProfile: horizon });

      expect(report.sunlitIntervals.length).toBe(1);
      expect(report.sunlitIntervals[0]!.state).toBe('visible');
      expect(report.sunlitIntervals[0]!.durationHours * 3600).toBeCloseTo(600.0, 1);
      expect(report.nominalMetrics.maxContinuousShadowHours).toBe(0.0);
      expect(report.nominalMetrics.sunlightPercentage).toBeCloseTo(100.0, 4);
    });

    it('Scenario 1B: Exact zero graze (0.0000000°) touches horizon and maintains visible parity', () => {
      const horizon = createFlatHorizon(0.0);
      const pt0 = makePt(baseMs, 30.0, 0.0625, 0.0, (-0.25) / dtHr);
      const pt1 = makePt(baseMs + stepSec * 1000, 30.0, 0.0625, 0.0, (+0.25) / dtHr);

      const events = splitStepEvents({
        pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center', tangentialGrazeTolDeg: 1e-7,
      });

      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe('TANGENTIAL_GRAZE');
      expect((events[0]!.epochMs - baseMs) / 1000.0).toBeCloseTo(300.0, 1);
      expect(Math.abs(events[0]!.clearanceDeg)).toBeLessThan(1e-10);

      const sunTraj = makeTraj([pt0, pt1], 'Sun');
      const earthTraj = makeTraj([pt0, pt1], 'Earth');
      const report = solveVisibility({ sunTrajectory: sunTraj, earthTrajectory: earthTraj, horizonProfile: horizon });

      expect(report.sunlitIntervals.length).toBe(1);
      expect(report.sunlitIntervals[0]!.state).toBe('visible');
      expect(report.sunlitIntervals[0]!.durationHours * 3600).toBeCloseTo(600.0, 1);
      expect(report.nominalMetrics.sunlightPercentage).toBeCloseTo(100.0, 4);
    });

    it('Scenario 1C: Negative near-graze (-1e-8°) from below preserves 100% blocked parity', () => {
      const horizon = createFlatHorizon(0.0);
      const pt0 = makePt(baseMs, 30.0, -0.0625 - 1e-8, 0.0, (+0.25) / dtHr);
      const pt1 = makePt(baseMs + stepSec * 1000, 30.0, -0.0625 - 1e-8, 0.0, (-0.25) / dtHr);

      const events = splitStepEvents({
        pt0, pt1, horizonProfile: horizon, target: 'Earth', criterion: 'center', tangentialGrazeTolDeg: 1e-7,
      });

      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe('TANGENTIAL_GRAZE');
      expect((events[0]!.epochMs - baseMs) / 1000.0).toBeCloseTo(300.0, 1);
      expect(events[0]!.clearanceDeg).toBeCloseTo(-1e-8, 9);

      const earthTraj = makeTraj([pt0, pt1], 'Earth');
      const sunTraj = makeTraj([pt0, pt1], 'Sun');
      const report = solveVisibility({ sunTrajectory: sunTraj, earthTrajectory: earthTraj, horizonProfile: horizon });

      expect(report.dteIntervals.length).toBe(1);
      expect(report.dteIntervals[0]!.state).toBe('blocked');
      expect(report.dteIntervals[0]!.durationHours * 3600).toBeCloseTo(600.0, 1);
      expect(report.nominalMetrics.dteAvailabilityPercentage).toBe(0.0);
    });
  });

  describe('2. Rapid Bin Hopping (10+ Azimuth Bins in Single Step)', () => {
    it('traverses 16 bins with alternating ridge heights and finds all vertex splits without infinite loops', () => {
      const horizon = createFlatHorizon(0.0);
      for (let b = 0; b < 360; b++) {
        const val = b % 2 === 0 ? 2.0 : -1.0;
        horizon.elevationNominalDeg[b] = val;
        horizon.thetaLowDeg[b] = val;
        horizon.thetaHighDeg[b] = val;
      }

      const az0 = 10.2;
      const az1 = 25.8;
      const rateAz = (az1 - az0) / dtHr;
      const pt0 = makePt(baseMs, az0, 0.5, rateAz, 0.0);
      const pt1 = makePt(baseMs + stepSec * 1000, az1, 0.5, rateAz, 0.0);

      const t0 = performance.now();
      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });
      const elapsedMs = performance.now() - t0;

      expect(elapsedMs).toBeLessThan(50.0);
      expect(events.length).toBe(16);

      for (let i = 0; i < events.length; i++) {
        if (i > 0) {
          expect(events[i]!.epochMs).toBeGreaterThan(events[i - 1]!.epochMs);
          expect(events[i]!.type).not.toBe(events[i - 1]!.type);
        }
        expect(Math.abs(events[i]!.clearanceDeg)).toBeLessThan(1e-4);
      }

      const sunTraj = makeTraj([pt0, pt1], 'Sun');
      const earthTraj = makeTraj([pt0, pt1], 'Earth');
      const report = solveVisibility({ sunTrajectory: sunTraj, earthTrajectory: earthTraj, horizonProfile: horizon });

      const totalSunHours = report.sunlitIntervals.reduce((acc, int) => acc + int.durationHours, 0.0);
      expect(totalSunHours * 3600).toBeCloseTo(600.0, 1);
      expect(report.sunlitIntervals.length).toBeGreaterThan(5);
    });

    it('handles rapid bin hopping with turnaround (20 bin traverses in 1 step)', () => {
      const horizon = createFlatHorizon(0.0);
      for (let b = 10; b <= 20; b++) {
        const val = b % 2 === 0 ? 1.0 : -1.0;
        horizon.elevationNominalDeg[b] = val;
        horizon.thetaLowDeg[b] = val;
        horizon.thetaHighDeg[b] = val;
      }

      const pt0 = makePt(baseMs, 10.0, 0.0, 40.0 / dtHr, 0.0);
      const pt1 = makePt(baseMs + stepSec * 1000, 10.0, 0.0, -40.0 / dtHr, 0.0);

      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });

      expect(events.length).toBe(20);
      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.epochMs).toBeGreaterThan(events[i - 1]!.epochMs);
      }
    });
  });

  describe('3. Meridian Seam Crossing (0° / 360°)', () => {
    it('seamlessly tracks forward crossing from 358° to 2° across 360° with constant rate', () => {
      const horizon = createFlatHorizon(0.0);
      horizon.elevationNominalDeg[358] = 1.0;
      horizon.elevationNominalDeg[359] = 1.5;
      horizon.elevationNominalDeg[0] = 2.0;
      horizon.elevationNominalDeg[1] = 2.5;

      const pt0 = makePt(baseMs, 358.0, 1.2, 4.0 / dtHr, 1.0 / dtHr);
      const pt1 = makePt(baseMs + stepSec * 1000, 2.0, 2.2, 4.0 / dtHr, 1.0 / dtHr);

      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });
      for (const ev of events) {
        expect(ev.azimuthDeg).toBeGreaterThanOrEqual(0.0);
        expect(ev.azimuthDeg).toBeLessThan(360.0);
      }

      const h359_9 = horizonProfileService.evaluateHorizonAtAzimuth(horizon, 359.9);
      const h0_1 = horizonProfileService.evaluateHorizonAtAzimuth(horizon, 0.1);
      expect(h359_9).toBeCloseTo(1.5 + 0.5 * 0.9, 4);
      expect(h0_1).toBeCloseTo(2.0 + 0.5 * 0.1, 4);
    });

    it('seamlessly tracks reverse crossing from 1.5° to 358.5° across 0°', () => {
      const horizon = createFlatHorizon(1.0);
      const pt0 = makePt(baseMs, 1.5, 0.5, -3.0 / dtHr, 1.2 / dtHr);
      const pt1 = makePt(baseMs + stepSec * 1000, 358.5, 1.7, -3.0 / dtHr, 1.2 / dtHr);

      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Earth', criterion: 'center' });
      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe('RISE');
      expect(events[0]!.azimuthDeg).toBeGreaterThanOrEqual(0.0);
      expect(events[0]!.azimuthDeg).toBeLessThan(360.0);
    });

    it('accurately resolves diagonal crossing across seam with non-zero acceleration', () => {
      const horizon = createFlatHorizon(0.0);
      const pt0 = makePt(baseMs, 358.5, 0.6, 3.0 / dtHr, -1.0 / dtHr);
      const pt1 = makePt(baseMs + stepSec * 1000, 1.5, -0.4, 3.0 / dtHr, -1.0 / dtHr);

      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });
      expect(events.length).toBe(1);
      expect(events[0]!.type).toBe('SET');
      expect((events[0]!.epochMs - baseMs) / 1000.0).toBeCloseTo(360.0, 1);
      expect(events[0]!.azimuthDeg).toBeCloseTo(0.3, 4);
    });
  });

  describe('4. Libration Turnaround Exactly at a Bin Boundary Vertex', () => {
    it('isolates stationary azimuth point occurring at exact integer vertex 45.000000°', () => {
      const horizon = createFlatHorizon(0.0);
      horizon.elevationNominalDeg[44] = 0.5;
      horizon.elevationNominalDeg[45] = 2.0;

      const pt0 = makePt(baseMs, 44.0, 1.0, 4.0 / dtHr, 0.0);
      const pt1 = makePt(baseMs + stepSec * 1000, 44.0, 1.0, -4.0 / dtHr, 0.0);

      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Earth', criterion: 'center' });

      expect(events.length).toBe(2);
      expect(events[0]!.type).toBe('SET');
      expect(events[0]!.azimuthDeg).toBeCloseTo(44.333333, 4);
      expect(events[1]!.type).toBe('RISE');
      expect(events[1]!.azimuthDeg).toBeCloseTo(44.333333, 4);

      const earthTraj = makeTraj([pt0, pt1], 'Earth');
      const sunTraj = makeTraj([pt0, pt1], 'Sun');
      const report = solveVisibility({ sunTrajectory: sunTraj, earthTrajectory: earthTraj, horizonProfile: horizon });

      const sumSec = report.dteIntervals.reduce((acc, i) => acc + i.durationHours * 3600, 0);
      expect(sumSec).toBeCloseTo(600.0, 1);
      expect(report.dteIntervals.length).toBe(3);
      expect(report.dteIntervals[0]!.state).toBe('visible');
      expect(report.dteIntervals[1]!.state).toBe('blocked');
      expect(report.dteIntervals[2]!.state).toBe('visible');
    });

    it('handles turnaround right at a ridge cusp spanning bins 44 and 45', () => {
      const horizon = createFlatHorizon(0.0);
      horizon.elevationNominalDeg[44] = 0.0;
      horizon.elevationNominalDeg[45] = 2.0;
      horizon.elevationNominalDeg[46] = 0.0;

      const pt0 = makePt(baseMs, 44.2, 1.5, 3.2 / dtHr, 0.0);
      const pt1 = makePt(baseMs + stepSec * 1000, 44.2, 1.5, -3.2 / dtHr, 0.0);

      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Earth', criterion: 'center' });

      expect(events.length).toBe(2);
      expect(events[0]!.type).toBe('SET');
      expect(events[0]!.azimuthDeg).toBeCloseTo(44.75, 4);
      expect(events[1]!.type).toBe('RISE');
      expect(events[1]!.azimuthDeg).toBeCloseTo(44.75, 4);
    });
  });

  describe('5. Astrodynamics Invariants & Monotonicity', () => {
    it('enforces multi-limb criteria chronological sequence: t_upper < t_center < t_full', () => {
      const horizon = createFlatHorizon(1.0);
      const pt0 = makePt(baseMs, 20.0, 0.0, 1.0, 2.0 / dtHr, 0.25);
      const pt1 = makePt(baseMs + stepSec * 1000, 20.0 + dtHr, 2.0, 1.0, 2.0 / dtHr, 0.25);

      const evUpper = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'upper_limb' });
      const evCenter = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'center' });
      const evFull = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Sun', criterion: 'full_disk' });

      expect(evUpper.length).toBe(1);
      expect(evCenter.length).toBe(1);
      expect(evFull.length).toBe(1);

      expect(evUpper[0]!.epochMs).toBeLessThan(evCenter[0]!.epochMs);
      expect(evCenter[0]!.epochMs).toBeLessThan(evFull[0]!.epochMs);
      expect(evUpper[0]!.epochMs - baseMs).toBe(225000);
      expect(evCenter[0]!.epochMs - baseMs).toBe(300000);
      expect(evFull[0]!.epochMs - baseMs).toBe(375000);
    });

    it('strictly preserves sensitivity envelope area monotonicity: ThetaLow >= Nominal >= ThetaHigh', () => {
      const horizon: HorizonProfile = {
        elevationNominalDeg: Array(360).fill(1.0),
        thetaLowDeg: Array(360).fill(0.0),
        thetaHighDeg: Array(360).fill(2.0),
        blockerDistanceKm: Array(360).fill(10.0),
        blockerElevationMeters: Array(360).fill(0.0),
        binStatus: Array(360).fill('valid' as const),
      };

      const pt0 = makePt(baseMs, 20.0, -0.5, 1.0, 3.0 / dtHr, 0.25);
      const pt1 = makePt(baseMs + stepSec * 1000, 20.0 + dtHr, 2.5, 1.0, 3.0 / dtHr, 0.25);

      const sunTraj = makeTraj([pt0, pt1], 'Sun');
      const report = solveVisibility({ sunTrajectory: sunTraj, earthTrajectory: sunTraj, horizonProfile: horizon });

      const sunNom = report.nominalMetrics.totalSunlitHours;
      const sunLow = report.sensitivityEnvelope.thetaLowMetrics.totalSunlitHours;
      const sunHigh = report.sensitivityEnvelope.thetaHighMetrics.totalSunlitHours;

      expect(sunLow).toBeGreaterThanOrEqual(sunNom);
      expect(sunNom).toBeGreaterThanOrEqual(sunHigh);
      expect(sunLow).toBeCloseTo(0.166666, 4);
      expect(sunNom).toBeCloseTo(0.097222, 4);
      expect(sunHigh).toBeCloseTo(0.083333, 4);
    });

    it('safely handles completely stationary celestial body with zero azimuth and elevation rates', () => {
      const horizon = createFlatHorizon(0.0);
      const pt0 = makePt(baseMs, 45.0, 1.5, 0.0, 0.0, 0.25);
      const pt1 = makePt(baseMs + stepSec * 1000, 45.0, 1.5, 0.0, 0.0, 0.25);

      const events = splitStepEvents({ pt0, pt1, horizonProfile: horizon, target: 'Earth', criterion: 'center' });
      expect(events.length).toBe(0);

      const earthTraj = makeTraj([pt0, pt1], 'Earth');
      const report = solveVisibility({ sunTrajectory: earthTraj, earthTrajectory: earthTraj, horizonProfile: horizon });

      expect(report.dteIntervals.length).toBe(1);
      expect(report.dteIntervals[0]!.state).toBe('visible');
      expect(report.dteIntervals[0]!.durationHours * 3600).toBeCloseTo(600.0, 1);
      expect(report.nominalMetrics.dteAvailabilityPercentage).toBe(100.0);
    });
  });
});

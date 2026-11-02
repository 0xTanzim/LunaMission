import { describe, expect, it } from 'bun:test';
import {
  computeHermiteCoeffs,
  evalHermite,
  evalHermiteDeriv,
  solveDerivativeRoots,
  unwrapAzimuth,
} from '../../src/services/celestial/hermiteSpline';

describe('Hermite Spline & Continuous Azimuth Unwrapping', () => {
  it('correctly unwraps azimuth across 0°/360° meridian seam', () => {
    // Crossing from 359.8° to 0.2° should be +0.4° forward delta
    const unwrappedForward = unwrapAzimuth(359.8, 0.2);
    expect(unwrappedForward).toBeCloseTo(360.2, 8);

    // Crossing backwards from 0.2° to 359.8° should be -0.4° delta
    const unwrappedBackward = unwrapAzimuth(0.2, 359.8);
    expect(unwrappedBackward).toBeCloseTo(-0.2, 8);

    // Small normal motion
    expect(unwrapAzimuth(120.0, 120.5)).toBeCloseTo(120.5, 8);
  });

  it('computes Horner form coefficients and matches boundary values and rates', () => {
    const y0 = 10.0;
    const y1 = 12.0;
    const rate0 = 1.5; // deg/h
    const rate1 = 0.5; // deg/h
    const dtHr = 1.0;  // 1 hour

    const c = computeHermiteCoeffs(y0, y1, rate0, rate1, dtHr);

    // Boundary values
    expect(evalHermite(c, 0.0)).toBeCloseTo(y0, 10);
    expect(evalHermite(c, 1.0)).toBeCloseTo(y1, 10);

    // Boundary derivatives with respect to tau (dy/dtau = rate * dtHr)
    expect(evalHermiteDeriv(c, 0.0)).toBeCloseTo(rate0 * dtHr, 10);
    expect(evalHermiteDeriv(c, 1.0)).toBeCloseTo(rate1 * dtHr, 10);
  });

  it('accurately finds derivative roots using Citardauq stable formula', () => {
    // y(tau) = -4*tau^2 + 4*tau -> peak at tau = 0.5 where dy/dtau = -8*tau + 4 = 0
    // c3 = 0, c2 = -4, c1 = 4, c0 = 0
    const coeffs = { c3: 0, c2: -4, c1: 4, c0: 0 };
    const roots = solveDerivativeRoots(coeffs, 0, 1);
    expect(roots.length).toBe(1);
    expect(roots[0]).toBeCloseTo(0.5, 8);

    // Cubic with two extrema inside (0, 1):
    // y'(tau) = 3*(tau - 0.2)*(tau - 0.8) = 3*tau^2 - 3.0*tau + 0.48
    // 3*c3 = 3 => c3 = 1; 2*c2 = -3.0 => c2 = -1.5; c1 = 0.48
    const cubicCoeffs = { c3: 1, c2: -1.5, c1: 0.48, c0: 0 };
    const cubicRoots = solveDerivativeRoots(cubicCoeffs, 0, 1);
    expect(cubicRoots.length).toBe(2);
    expect(cubicRoots[0]).toBeCloseTo(0.2, 8);
    expect(cubicRoots[1]).toBeCloseTo(0.8, 8);
  });
});

describe('Brent Root Finder', () => {
  it('accurately refines roots to sub-second tolerance', async () => {
    const { brentRoot } = await import('../../src/services/celestial/brentSolver');
    // Function with root at tau = 0.3
    const f = (tau: number) => 2.0 * tau - 0.6;
    const root = brentRoot(f, 0.0, 1.0, 1e-6);
    expect(root).toBeCloseTo(0.3, 8);
    expect(Math.abs(f(root))).toBeLessThan(1e-10);
  });

  it('solves cubic polynomial root reliably', async () => {
    const { brentRoot } = await import('../../src/services/celestial/brentSolver');
    // (tau - 0.45)^3 - 0.01*(tau - 0.45) = 0 has root at 0.45, 0.35, 0.55
    const f = (tau: number) => Math.pow(tau - 0.45, 3) - 0.01 * (tau - 0.45);
    const root = brentRoot(f, 0.4, 0.5, 1e-6);
    expect(root).toBeCloseTo(0.45, 6);
  });

  it('throws or handles invalid bracket', async () => {
    const { brentRoot } = await import('../../src/services/celestial/brentSolver');
    const f = (tau: number) => tau * tau + 1.0; // always positive
    expect(() => brentRoot(f, 0.0, 1.0, 1e-6)).toThrow();
  });
});

describe('Horizon Profile Service', () => {
  it('loads curated horizons and interpolates mast heights', async () => {
    const { horizonProfileService } = await import('../../src/services/celestial/horizonProfileService');
    const profile2m = horizonProfileService.getHorizonProfileForSite('shackleton-rim', 2.0);
    expect(profile2m.elevationNominalDeg.length).toBe(360);

    // Test intermediate height (3.5m between 2.0m and 5.0m)
    const profile35m = horizonProfileService.getHorizonProfileForSite('shackleton-rim', 3.5);
    expect(profile35m.elevationNominalDeg.length).toBe(360);

    const profile5m = horizonProfileService.getHorizonProfileForSite('shackleton-rim', 5.0);
    // At higher mast, horizon obstruction is typically lower or equal
    expect(profile35m.elevationNominalDeg[0]).toBeLessThanOrEqual(profile2m.elevationNominalDeg[0] + 0.01);
  });

  it('evaluates affine bin spans and direct elevations smoothly', async () => {
    const { horizonProfileService } = await import('../../src/services/celestial/horizonProfileService');
    const profile = horizonProfileService.getHorizonProfileForSite('connecting-ridge', 2.0);

    const span = horizonProfileService.getHorizonBinSpan(profile, 45.4);
    expect(span.binIndex).toBe(45);
    expect(span.azBase).toBeCloseTo(45.0, 8);

    const elAt45 = horizonProfileService.evaluateHorizonAtAzimuth(profile, 45.0);
    const elAt46 = horizonProfileService.evaluateHorizonAtAzimuth(profile, 46.0);
    const elAt455 = horizonProfileService.evaluateHorizonAtAzimuth(profile, 45.5);

    expect(elAt455).toBeCloseTo(0.5 * (elAt45 + elAt46), 6);
  });
});

describe('Four-Stage Event Splitter', () => {
  it('isolates a sunrise/sunset event within a single step', async () => {
    const { splitStepEvents } = await import('../../src/services/celestial/eventSplitter');
    const { horizonProfileService } = await import('../../src/services/celestial/horizonProfileService');
    const profile = horizonProfileService.getHorizonProfileForSite('connecting-ridge', 2.0);

    // Synthetic step of 600 seconds (10 min) where elevation rises above horizon
    const pt0 = {
      timestampUtc: '2026-05-15T12:00:00Z',
      epochMs: 1778846400000,
      azimuthDeg: 45.0,
      elevationDeg: -2.0,
      azimuthRateDegHr: 0.1,
      elevationRateDegHr: 12.0,
      angularRadiusDeg: 0.26,
      rangeKm: 150000000,
      rangeRateKmS: 0.0,
    };
    const pt1 = {
      timestampUtc: '2026-05-15T12:10:00Z',
      epochMs: 1778846400000 + 600000,
      azimuthDeg: 45.0167,
      elevationDeg: 0.5,
      azimuthRateDegHr: 0.1,
      elevationRateDegHr: 12.0,
      angularRadiusDeg: 0.26,
      rangeKm: 150000000,
      rangeRateKmS: 0.0,
    };

    const events = splitStepEvents({
      pt0,
      pt1,
      horizonProfile: profile,
      target: 'Sun',
      criterion: 'upper_limb',
    });

    expect(events.length).toBeGreaterThanOrEqual(1);
    const riseEvent = events.find((e) => e.type === 'RISE');
    expect(riseEvent).toBeDefined();
    expect(riseEvent!.epochMs).toBeGreaterThan(pt0.epochMs);
    expect(riseEvent!.epochMs).toBeLessThan(pt1.epochMs);
  });
});

describe('Visibility Solver Public API', () => {
  it('integrates dual trajectories into master partition and generates full report', async () => {
    const { solveVisibility } = await import('../../src/services/celestial/visibilitySolver');
    const { horizonProfileService } = await import('../../src/services/celestial/horizonProfileService');
    const profile = horizonProfileService.getHorizonProfileForSite('shackleton-rim', 2.0);

    const baseMs = 1778846400000;
    const sunTrajectory = {
      target: 'Sun' as const,
      targetCommand: '10' as const,
      observerCoordinates: {
        latitudeDeg: -89.9,
        longitudeDeg: 0,
        elevationMeters: 4250,
        mastHeightMeters: 2.0,
        horizonsAltKm: 4.252,
      },
      stepSize: '10m',
      source: 'test-fixture',
      cached: true,
      points: [
        {
          timestampUtc: '2026-05-15T12:00:00Z',
          epochMs: baseMs,
          azimuthDeg: 10.0,
          elevationDeg: 0.8,
          azimuthRateDegHr: 0.5,
          elevationRateDegHr: 0.05,
          angularRadiusDeg: 0.26,
          rangeKm: 150000000,
          rangeRateKmS: 0,
        },
        {
          timestampUtc: '2026-05-15T12:10:00Z',
          epochMs: baseMs + 600000,
          azimuthDeg: 10.0833,
          elevationDeg: 0.8083,
          azimuthRateDegHr: 0.5,
          elevationRateDegHr: 0.05,
          angularRadiusDeg: 0.26,
          rangeKm: 150000000,
          rangeRateKmS: 0,
        },
      ],
    };

    const earthTrajectory = {
      target: 'Earth' as const,
      targetCommand: '399' as const,
      observerCoordinates: {
        latitudeDeg: -89.9,
        longitudeDeg: 0,
        elevationMeters: 4250,
        mastHeightMeters: 2.0,
        horizonsAltKm: 4.252,
      },
      stepSize: '10m',
      source: 'test-fixture',
      cached: true,
      points: [
        {
          timestampUtc: '2026-05-15T12:00:00Z',
          epochMs: baseMs,
          azimuthDeg: 180.0,
          elevationDeg: 1.5,
          azimuthRateDegHr: -0.1,
          elevationRateDegHr: 0.02,
          angularRadiusDeg: 0.95,
          rangeKm: 384000,
          rangeRateKmS: 0,
        },
        {
          timestampUtc: '2026-05-15T12:10:00Z',
          epochMs: baseMs + 600000,
          azimuthDeg: 179.9833,
          elevationDeg: 1.5033,
          azimuthRateDegHr: -0.1,
          elevationRateDegHr: 0.02,
          angularRadiusDeg: 0.95,
          rangeKm: 384000,
          rangeRateKmS: 0,
        },
      ],
    };

    const report = solveVisibility({
      sunTrajectory,
      earthTrajectory,
      horizonProfile: profile,
      mastHeightMeters: 2.0,
      siteId: 'shackleton-rim',
    });

    expect(report.siteId).toBe('shackleton-rim');
    expect(report.mastHeightMeters).toBe(2.0);
    expect(report.nominalMetrics.totalEvaluationHours).toBeCloseTo(600 / 3600, 6);
    expect(report.sensitivityEnvelope).toBeDefined();
    expect(report.provenance.solverAlgorithm).toContain("Rolle's Theorem");
  });
});





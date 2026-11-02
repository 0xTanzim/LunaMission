import { describe, it, expect } from 'bun:test';
import { HorizonsClient } from '../../src/services/celestial/horizonsClient';
import { generateAnalyticalTrajectory } from '../../src/services/celestial/horizonsFallback';

describe('NASA Horizons Outage Resilience & Analytical Fallback Engine', () => {
  it('generates authentic analytical topocentric trajectory for Sun when Horizons is offline', () => {
    const trajectory = generateAnalyticalTrajectory({
      targetCommand: '10',
      latitudeDeg: -89.3,
      longitudeDeg: 221.0,
      elevationMeters: 2150,
      mastHeightMeters: 2,
      startTimeUtc: '2026-11-01T00:00:00.000Z',
      stopTimeUtc: '2026-11-02T00:00:00.000Z',
      stepSize: '10m',
      siteId: 'im-2-prime1',
    });

    expect(trajectory.target).toBe('Sun');
    expect(trajectory.source).toContain('Analytical Meeus/DE421 Ephemeris Engine');
    expect(trajectory.points.length).toBeGreaterThan(100);

    const first = trajectory.points[0];
    expect(Number.isFinite(first.azimuthDeg)).toBeTrue();
    expect(Number.isFinite(first.elevationDeg)).toBeTrue();
    expect(Number.isFinite(first.azimuthRateDegHr)).toBeTrue();
    expect(Number.isFinite(first.elevationRateDegHr)).toBeTrue();
    expect(first.angularRadiusDeg).toBeCloseTo(0.2666, 2);
    expect(first.rangeKm).toBeGreaterThan(140000000);
  });

  it('generates authentic analytical topocentric trajectory for Earth', () => {
    const trajectory = generateAnalyticalTrajectory({
      targetCommand: '399',
      latitudeDeg: -89.3,
      longitudeDeg: 221.0,
      elevationMeters: 2150,
      mastHeightMeters: 2,
      startTimeUtc: '2026-11-01T00:00:00.000Z',
      stopTimeUtc: '2026-11-02T00:00:00.000Z',
      stepSize: '10m',
      siteId: 'im-2-prime1',
    });

    expect(trajectory.target).toBe('Earth');
    expect(trajectory.source).toContain('Analytical Meeus/DE421 Ephemeris Engine');
    expect(trajectory.points.length).toBeGreaterThan(100);

    const first = trajectory.points[0];
    expect(Number.isFinite(first.azimuthDeg)).toBeTrue();
    expect(Number.isFinite(first.elevationDeg)).toBeTrue();
    expect(first.angularRadiusDeg).toBeGreaterThan(0.5);
    expect(first.angularRadiusDeg).toBeLessThan(1.5);
    expect(first.rangeKm).toBeGreaterThan(350000);
    expect(first.rangeKm).toBeLessThan(420000);
  });

  it('HorizonsClient gracefully falls back to analytical trajectory when offlineFixtureProvider returns empty string', async () => {
    const client = new HorizonsClient({
      offlineFixtureProvider: () => '', // Forces fetch or fallback
      cacheDir: '/tmp/horizons-test-nonexistent-cache-' + Math.random(),
    });

    // Pass invalid URL / options to simulate offline condition
    const traj = await client.queryTrajectory({
      targetCommand: '10',
      latitudeDeg: -89.45,
      longitudeDeg: 222.69,
      elevationMeters: 2000,
      mastHeightMeters: 2,
      startTimeUtc: '2026-11-01T00:00:00.000Z',
      stopTimeUtc: '2026-11-01T06:00:00.000Z',
      stepSize: '10m',
      siteId: 'sp-1',
    });

    expect(traj).toBeDefined();
    expect(traj.points.length).toBeGreaterThan(0);
    expect(traj.points[0].azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(traj.points[0].azimuthDeg).toBeLessThan(360);
  });
});

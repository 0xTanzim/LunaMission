import { describe, it, expect } from 'bun:test';
import {
  computeObserverRadiusMeters,
  computeLocalEnuAngles,
  LUNAR_SPHERE_RADIUS_METERS,
  TopocentricEphemerisService,
} from '../../src/services/celestial/ephemerisService';
import {
  parseHorizonsCsvResponse,
  computeHorizonsCacheHash,
  HorizonsClient,
} from '../../src/services/celestial/horizonsClient';
import {
  getJulianDate,
  getEphemerisJulianDate,
  ephemerisJulianDateToDate,
  formatHorizonsDateUtc,
  TT_MINUS_UTC_SECONDS,
} from '../../src/services/utils/timeUtils';
import { topocentricTrajectorySchema } from '@luna/contracts';

describe('Adversarial Astrodynamic Boundary Stress Tests (Milestone M3)', () => {
  describe('1. Polar Singularity (|lat| = 90.0°)', () => {
    it('handles exact South Pole (-90.0°) without NaN or degenerate geometry', () => {
      const rObs = computeObserverRadiusMeters(0, 2);
      const targetSunKm: [number, number, number] = [150000000, 0, 0];
      const southPole = computeLocalEnuAngles(targetSunKm, -90.0, 0.0, rObs);

      expect(Number.isFinite(southPole.azimuthDeg)).toBe(true);
      expect(Number.isFinite(southPole.elevationDeg)).toBe(true);
      expect(southPole.elevationDeg).toBeGreaterThanOrEqual(-90);
      expect(southPole.elevationDeg).toBeLessThanOrEqual(90);
    });

    it('handles exact North Pole (+90.0°) and produces valid azimuth and elevation', () => {
      const rObs = computeObserverRadiusMeters(0, 2);
      const targetSunKm: [number, number, number] = [150000000, 0, 0];
      const northPole = computeLocalEnuAngles(targetSunKm, 90.0, 0.0, rObs);

      expect(Number.isFinite(northPole.azimuthDeg)).toBe(true);
      expect(Number.isFinite(northPole.elevationDeg)).toBe(true);
      expect(northPole.azimuthDeg).toBe(180.0);
    });

    it('exhibits continuous elevation across polar boundary limit (-89.999999° vs -90.0°)', () => {
      const rObs = computeObserverRadiusMeters(0, 2);
      const targetSunKm: [number, number, number] = [150000000, 0, 0];
      const southPole = computeLocalEnuAngles(targetSunKm, -90.0, 0.0, rObs);
      const nearPole = computeLocalEnuAngles(targetSunKm, -89.999999, 0.0, rObs);

      expect(Math.abs(nearPole.elevationDeg - southPole.elevationDeg)).toBeLessThan(0.001);
    });
  });

  describe('2. Negative Lunar Elevations (Deep Polar Craters)', () => {
    it('computes correct observer radius for negative elevations (e.g. Shackleton floor -4200m)', () => {
      const deepCraterZ = -4200;
      const rCrater = computeObserverRadiusMeters(deepCraterZ, 2.0);

      expect(rCrater).toBe(LUNAR_SPHERE_RADIUS_METERS - 4200 + 2.0);
      expect(rCrater).toBeGreaterThan(1700000);
    });

    it('accurately preserves negative elevation angles for sub-horizon celestial targets', () => {
      const phi = (-89.0 * Math.PI) / 180;
      const lam = 0;
      const rCrater = computeObserverRadiusMeters(-4200, 2.0);
      const rObsKm = rCrater / 1000.0;
      const upVec = [Math.cos(phi) * Math.cos(lam), Math.cos(phi) * Math.sin(lam), Math.sin(phi)];
      const northVec = [-Math.sin(phi) * Math.cos(lam), -Math.sin(phi) * Math.sin(lam), Math.cos(phi)];

      const elevTargetRad = (-1.5 * Math.PI) / 180;
      const dist = 150000000;
      const targetSubHorizon: [number, number, number] = [
        rObsKm * upVec[0] + dist * (Math.cos(elevTargetRad) * northVec[0] + Math.sin(elevTargetRad) * upVec[0]),
        rObsKm * upVec[1] + dist * (Math.cos(elevTargetRad) * northVec[1] + Math.sin(elevTargetRad) * upVec[1]),
        rObsKm * upVec[2] + dist * (Math.cos(elevTargetRad) * northVec[2] + Math.sin(elevTargetRad) * upVec[2]),
      ];

      const angles = computeLocalEnuAngles(targetSubHorizon, -89.0, 0.0, rCrater);
      expect(angles.elevationDeg).toBeLessThan(0);
      expect(angles.elevationDeg).toBeCloseTo(-1.5, 3);
    });
  });

  describe('3. Mast Height Boundaries (h_obs = 0m, 100m)', () => {
    it('properly evaluates ground-level pad (0m mast) and tall mast (100m)', () => {
      const z0 = 3820;
      const r0_0m = computeObserverRadiusMeters(z0, 0.0);
      const r0_100m = computeObserverRadiusMeters(z0, 100.0);

      expect(r0_0m).toBe(LUNAR_SPHERE_RADIUS_METERS + z0);
      expect(r0_100m).toBe(LUNAR_SPHERE_RADIUS_METERS + z0 + 100.0);
      expect(r0_100m - r0_0m).toBe(100.0);
    });

    it('differentiates CAS cache keys across different mast heights', () => {
      const base = {
        targetCommand: '10' as const,
        latitudeDeg: -89.45,
        longitudeDeg: 222.69,
        elevationMeters: 3820,
        startTimeUtc: '2026-May-15 12:00',
        stopTimeUtc: '2026-May-15 12:10',
      };
      const hash0m = computeHorizonsCacheHash({ ...base, mastHeightMeters: 0 });
      const hash100m = computeHorizonsCacheHash({ ...base, mastHeightMeters: 100 });

      expect(hash0m).not.toBe(hash100m);
    });
  });

  describe('4. Date Boundaries Spanning Solstices & Equinoxes', () => {
    const epochs = [
      { name: 'Vernal Equinox 2026', date: new Date('2026-03-20T12:00:00Z'), expected: '2026-Mar-20 12:00' },
      { name: 'Winter Solstice 2026', date: new Date('2026-06-21T12:00:00Z'), expected: '2026-Jun-21 12:00' },
      { name: 'Autumnal Equinox 2026', date: new Date('2026-09-22T12:00:00Z'), expected: '2026-Sep-22 12:00' },
      { name: 'Summer Solstice 2026', date: new Date('2026-12-21T12:00:00Z'), expected: '2026-Dec-21 12:00' },
      { name: 'Year Boundary Wrap', date: new Date('2026-12-31T23:59:00Z'), expected: '2026-Dec-31 23:59' },
      { name: 'New Year Epoch', date: new Date('2027-01-01T00:00:00Z'), expected: '2027-Jan-01 00:00' },
    ];

    it.each(epochs)('formats Horizons dates and verifies TT offset for $name', ({ date, expected }: { name: string; date: Date; expected: string }) => {
      expect(formatHorizonsDateUtc(date)).toBe(expected);

      const jdUtc = getJulianDate(date);
      const jdEphem = getEphemerisJulianDate(date);
      const diffSec = (jdEphem - jdUtc) * 86400.0;
      expect(Math.abs(diffSec - TT_MINUS_UTC_SECONDS)).toBeLessThan(1e-4);

      const roundTrip = ephemerisJulianDateToDate(jdEphem);
      expect(Math.abs(roundTrip.getTime() - date.getTime())).toBeLessThanOrEqual(1);
    });
  });

  describe('5. Zenith & Nadir Zero Division Safeguards', () => {
    it('safeguards against division by zero at exact zenith (+90°) and nadir (-90°)', () => {
      const zenithCsv = `
Center geodetic : 0.0, -90.0, 0.0
Date__(UT)__HR:MN, Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot
$$SOE
2026-Jun-21 12:00, 45.0, 90.0, 10.0, 0.0, 1900.0, 150000000.0, 0.0
2026-Jun-21 12:10, 45.0, -90.0, 10.0, 0.0, 1900.0, 150000000.0, 0.0
$$EOE`;
      const points = parseHorizonsCsvResponse(zenithCsv);
      expect(points).toHaveLength(2);
      expect(Number.isFinite(points[0].azimuthRateDegHr)).toBe(true);
      expect(Number.isFinite(points[1].azimuthRateDegHr)).toBe(true);
    });
  });

  describe('6. Topocentric Ephemeris Service Integration', () => {
    it('successfully queries and validates topocentric trajectory schema for extreme boundaries', async () => {
      const mockClient = new HorizonsClient({
        offlineFixtureProvider: (opts) => `
Center geodetic : ${opts.longitudeDeg.toFixed(6)}, ${opts.latitudeDeg.toFixed(6)}, ${(((opts.elevationMeters ?? 0) + (opts.mastHeightMeters ?? 2)) / 1000).toFixed(6)}
Date__(UT)__HR:MN, Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot
$$SOE
${opts.startTimeUtc}, 180.0, 0.5, 10.0, 0.0, 1900.0, 150000000.0, 0.0
$$EOE`,
      });

      const service = new TopocentricEphemerisService(mockClient);
      const traj = await service.getTopocentricTrajectory({
        target: 'Sun',
        latitudeDeg: -90.0,
        longitudeDeg: 0.0,
        elevationMeters: -4000,
        mastHeightMeters: 100,
        startTime: new Date('2026-06-21T12:00:00Z'),
        stopTime: new Date('2026-06-21T12:10:00Z'),
      });

      const parsed = topocentricTrajectorySchema.safeParse(traj);
      expect(parsed.success).toBe(true);
      expect(traj.observerCoordinates.horizonsAltKm).toBe(-3.9);
      expect(traj.observerCoordinates.mastHeightMeters).toBe(100);
    });
  });
});

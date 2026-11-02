import { describe, it, expect } from 'bun:test';
import {
  getJulianDate,
  getEphemerisJulianDate,
  ephemerisJulianDateToDate,
  formatHorizonsDateUtc,
  TT_MINUS_UTC_SECONDS,
  TT_MINUS_UTC_DAYS,
} from '../../src/services/utils/timeUtils';
import {
  TopocentricEphemerisService,
  computeObserverRadiusMeters,
  computeLocalEnuAngles,
  LUNAR_SPHERE_RADIUS_METERS,
} from '../../src/services/celestial/ephemerisService';
import { HorizonsClient } from '../../src/services/celestial/horizonsClient';

const SAMPLE_HORIZONS_RESPONSE = `
 Center geodetic : 222.690000, -89.450000, 3.822000 {E-lon(deg),Lat(deg),Alt(km)}
Date__(UT)__HR:MN, , ,Azi_(a-app), Elev_(a-app),  dAZ*cosE, d(ELV)/dt,  Ang-diam,             delta,     deldot,
$$SOE
 2026-May-15 12:00,*,i, 331.804830,    -0.995826,    -30.59,     -0.15,  1902.131,  1.5088231856E+08,  0.0915009,
$$EOE
`;

describe('Relativistic TT-UTC Offset Engine (timeUtils)', () => {
  it('defines exact relativistic delta T offset constants', () => {
    expect(TT_MINUS_UTC_SECONDS).toBe(69.184);
    expect(TT_MINUS_UTC_DAYS).toBeCloseTo(69.184 / 86400.0, 10);
  });

  it('correctly shifts UTC Julian Date to Ephemeris Julian Date (TT)', () => {
    const testDate = new Date('2026-05-15T12:00:00.000Z');
    const jdUtc = getJulianDate(testDate);
    const jdEphem = getEphemerisJulianDate(testDate);

    // Ephemeris time should lead UTC by exactly 69.184 seconds = 69.184 / 86400 days
    const deltaDays = jdEphem - jdUtc;
    expect(deltaDays).toBeCloseTo(69.184 / 86400.0, 9);

    // Convert back from Ephemeris Julian Date to Date
    const roundTripDate = ephemerisJulianDateToDate(jdEphem);
    expect(Math.abs(roundTripDate.getTime() - testDate.getTime())).toBeLessThan(1);
  });

  it('formats dates for JPL Horizons UTC queries in YYYY-MMM-DD HH:mm format', () => {
    const date1 = new Date('2026-05-15T12:30:00.000Z');
    expect(formatHorizonsDateUtc(date1)).toBe('2026-May-15 12:30');

    const date2 = new Date('2026-01-05T08:05:00.000Z');
    expect(formatHorizonsDateUtc(date2)).toBe('2026-Jan-05 08:05');

    const date3 = new Date('2026-11-20T23:59:00.000Z');
    expect(formatHorizonsDateUtc(date3)).toBe('2026-Nov-20 23:59');
  });

  it('computes angular displacement corresponding to 69.184s of lunar rotation', () => {
    const degPerSec = 360.0 / (27.321661 * 86400.0);
    const angularDisplacementArcsec = degPerSec * 3600.0 * TT_MINUS_UTC_SECONDS;
    const angularDisplacementDeg = degPerSec * TT_MINUS_UTC_SECONDS;

    expect(angularDisplacementArcsec).toBeGreaterThan(35);
    expect(angularDisplacementArcsec).toBeLessThan(40);
    expect(angularDisplacementDeg).toBeGreaterThan(0.009);
    expect(angularDisplacementDeg).toBeLessThan(0.012);
  });
});

describe('Topocentric Celestial Ephemeris Service (ephemerisService)', () => {
  it('reconciles observer radial distance from lunar datum sphere: r0 = 1737400 + z0 + h_obs', () => {
    const z0 = 3820; // meters (Peak SP-1)
    const hObs = 2.0; // meters mast
    const r0 = computeObserverRadiusMeters(z0, hObs);
    expect(LUNAR_SPHERE_RADIUS_METERS).toBe(1737400.0);
    expect(r0).toBe(1737400.0 + 3820.0 + 2.0);
  });

  it('computes local topocentric ENU elevation and azimuth angles accurately', () => {
    // Observer at -89.45 deg lat, 222.69 deg lon, r0 = 1741222m
    const rObsMeters = 1737400.0 + 3820 + 2.0;
    const latDeg = -89.45;
    const lonDeg = 222.69;

    // Target directly overhead (along local Up vector)
    const latRad = latDeg * (Math.PI / 180.0);
    const lonRad = lonDeg * (Math.PI / 180.0);
    const upX = Math.cos(latRad) * Math.cos(lonRad);
    const upY = Math.cos(latRad) * Math.sin(lonRad);
    const upZ = Math.sin(latRad);

    const distKm = 384400.0;
    const targetVectorKm = [
      (rObsMeters / 1000.0 + distKm) * upX,
      (rObsMeters / 1000.0 + distKm) * upY,
      (rObsMeters / 1000.0 + distKm) * upZ,
    ] as [number, number, number];

    const angles = computeLocalEnuAngles(targetVectorKm, latDeg, lonDeg, rObsMeters);
    expect(angles.elevationDeg).toBeCloseTo(90.0, 4);
    expect(angles.rangeKm).toBeCloseTo(distKm, 2);
  });

  it('orchestrates topocentric trajectory retrieval and verifies observer elevation parameters', async () => {
    const mockClient = new HorizonsClient({
      offlineFixtureProvider: () => SAMPLE_HORIZONS_RESPONSE,
    });

    const service = new TopocentricEphemerisService(mockClient);

    const trajectory = await service.getTopocentricTrajectory({
      target: 'Sun',
      latitudeDeg: -89.45,
      longitudeDeg: 222.69,
      elevationMeters: 3820,
      mastHeightMeters: 2.0,
      startTime: new Date('2026-05-15T12:00:00Z'),
      stopTime: new Date('2026-05-15T12:30:00Z'),
      stepSize: '10m',
      siteId: 'connecting-ridge',
    });

    expect(trajectory.target).toBe('Sun');
    expect(trajectory.siteId).toBe('connecting-ridge');
    expect(trajectory.observerCoordinates.horizonsAltKm).toBeCloseTo(3.822, 5);
    expect(trajectory.points).toHaveLength(1);
    expect(trajectory.points[0].azimuthDeg).toBeCloseTo(331.80483, 4);
    expect(trajectory.points[0].elevationDeg).toBeCloseTo(-0.995826, 4);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseHorizonsCsvResponse,
  verifyEchoedHeader,
  computeHorizonsCacheHash,
  HorizonsClient,
  type HorizonsQueryOptions,
} from '../../src/services/celestial/horizonsClient';

const SAMPLE_HORIZONS_RESPONSE = `
*******************************************************************************
 Revised: Jan 20, 2026             Sun / Moon                              10
 Center geodetic : 222.690000, -89.450000, 3.822000 {E-lon(deg),Lat(deg),Alt(km)}
 Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}
*******************************************************************************
Date__(UT)__HR:MN, , ,Azi_(a-app), Elev_(a-app),  dAZ*cosE, d(ELV)/dt,  Ang-diam,             delta,     deldot,
$$SOE
 2026-May-15 12:00,*,i, 331.804830,    -0.995826,    -30.59,     -0.15,  1902.131,  1.5088231856E+08,  0.0915009,
 2026-May-15 12:10,*,i, 331.719834,    -0.996224,    -30.59,     -0.15,  1902.130,  1.5088237390E+08,  0.0929397,
$$EOE
*******************************************************************************
`;

const SCRAMBLED_COLUMNS_RESPONSE = `
 Center geodetic : 222.690000, -89.450000, 3.822000 {E-lon(deg),Lat(deg),Alt(km)}
delta, Ang-diam, Elev_(a-app), Azi_(a-app), d(ELV)/dt, dAZ*cosE, deldot, Date__(UT)__HR:MN,
$$SOE
 1.5088231856E+08, 1902.131, -0.995826, 331.804830, -0.15, -30.59, 0.0915009, 2026-May-15 12:00,
$$EOE
`;

describe('Dynamic Header-Driven JPL Horizons Client', () => {
  const testCacheDir = join(process.cwd(), '.cache', 'test_ephemeris');

  beforeEach(() => {
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true, force: true });
    }
    mkdirSync(testCacheDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  describe('Dynamic Header Parsing', () => {
    it('parses standard Horizons CSV response without hardcoded column indices', () => {
      const points = parseHorizonsCsvResponse(SAMPLE_HORIZONS_RESPONSE);
      expect(points).toHaveLength(2);

      const p0 = points[0];
      expect(p0.timestampUtc).toBe('2026-May-15 12:00');
      expect(p0.azimuthDeg).toBeCloseTo(331.80483, 5);
      expect(p0.elevationDeg).toBeCloseTo(-0.995826, 5);
      expect(p0.rangeKm).toBeCloseTo(150882318.56, 1);
      expect(p0.rangeRateKmS).toBeCloseTo(0.0915009, 6);
    });

    it('correctly parses scrambled/permuted column order', () => {
      const points = parseHorizonsCsvResponse(SCRAMBLED_COLUMNS_RESPONSE);
      expect(points).toHaveLength(1);

      const p0 = points[0];
      expect(p0.azimuthDeg).toBeCloseTo(331.80483, 5);
      expect(p0.elevationDeg).toBeCloseTo(-0.995826, 5);
      expect(p0.rangeKm).toBeCloseTo(150882318.56, 1);
      expect(p0.rangeRateKmS).toBeCloseTo(0.0915009, 6);
    });

    it('throws when required columns are missing in header', () => {
      const brokenHeader = `
Center geodetic : 0.0, -89.9, 1.0
Date__(UT)__HR:MN, Elev_(a-app)
$$SOE
2026-May-15 12:00, -0.99
$$EOE`;
      expect(() => parseHorizonsCsvResponse(brokenHeader)).toThrow(/Missing required column/i);
    });

    it('throws when $$SOE or $$EOE delimiters are missing', () => {
      const missingDelimiters = `No SOE markers here`;
      expect(() => parseHorizonsCsvResponse(missingDelimiters)).toThrow(/Missing \$\$SOE or \$\$EOE/i);
    });
  });

  describe('Scientific Unit Conversions', () => {
    it('accurately converts rates from arcsec/min to deg/hr and diameter to radius deg', () => {
      const points = parseHorizonsCsvResponse(SAMPLE_HORIZONS_RESPONSE);
      const p0 = points[0];

      // Elevation rate: -0.15 arcsec/min / 60 = -0.0025 deg/hr
      expect(p0.elevationRateDegHr).toBeCloseTo(-0.15 / 60.0, 7);

      // Azimuth rate: dAZ*cosE / (60 * cos(El))
      const elRad = p0.elevationDeg * (Math.PI / 180.0);
      const expectedAzRate = -30.59 / (60.0 * Math.cos(elRad));
      expect(p0.azimuthRateDegHr).toBeCloseTo(expectedAzRate, 6);

      // Angular radius: Ang-diam (1902.131 arcsec) / 7200.0 = 0.26418486 deg
      expect(p0.angularRadiusDeg).toBeCloseTo(1902.131 / 7200.0, 7);
    });

    it('prevents division by zero near zenith (+90 deg or -90 deg)', () => {
      const zenithResponse = `
Center geodetic : 0.0, -90.0, 0.0
Date__(UT)__HR:MN, Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot
$$SOE
2026-May-15 12:00, 0.0, 90.0, 10.0, 0.0, 1900.0, 150000000.0, 0.0
$$EOE`;
      const points = parseHorizonsCsvResponse(zenithResponse);
      expect(Number.isFinite(points[0].azimuthRateDegHr)).toBe(true);
    });
  });

  describe('Echoed Header Verification', () => {
    it('accepts matching geodetic center within tolerance', () => {
      const isValid = verifyEchoedHeader(SAMPLE_HORIZONS_RESPONSE, 222.69, -89.45, 3.822);
      expect(isValid).toBe(true);
    });

    it('rejects mismatched geodetic coordinates', () => {
      const isValid = verifyEchoedHeader(SAMPLE_HORIZONS_RESPONSE, 100.0, -85.0, 0.5);
      expect(isValid).toBe(false);
    });
  });

  describe('SHA-256 CAS Disk Caching', () => {
    it('computes deterministic, collision-resistant hash from query parameters', () => {
      const queryA: HorizonsQueryOptions = {
        targetCommand: '10',
        latitudeDeg: -89.45,
        longitudeDeg: 222.69,
        elevationMeters: 3820,
        mastHeightMeters: 2.0,
        startTimeUtc: '2026-May-15 12:00',
        stopTimeUtc: '2026-May-15 12:30',
        stepSize: '10m',
      };

      const queryB = { ...queryA, targetCommand: '399' as const };
      const hashA = computeHorizonsCacheHash(queryA);
      const hashB = computeHorizonsCacheHash(queryB);

      expect(hashA).toHaveLength(64);
      expect(hashB).toHaveLength(64);
      expect(hashA).not.toBe(hashB);
    });

    it('fetches and caches trajectory points via HorizonsClient', async () => {
      const client = new HorizonsClient({
        cacheDir: testCacheDir,
        offlineFixtureProvider: () => SAMPLE_HORIZONS_RESPONSE,
      });

      const trajectory = await client.queryTrajectory({
        targetCommand: '10',
        latitudeDeg: -89.45,
        longitudeDeg: 222.69,
        elevationMeters: 3820,
        mastHeightMeters: 2.0,
        startTimeUtc: '2026-May-15 12:00',
        stopTimeUtc: '2026-May-15 12:30',
        stepSize: '10m',
      });

      expect(trajectory.points).toHaveLength(2);
      expect(trajectory.cached).toBe(false);

      // Second query should hit disk cache
      const cachedTrajectory = await client.queryTrajectory({
        targetCommand: '10',
        latitudeDeg: -89.45,
        longitudeDeg: 222.69,
        elevationMeters: 3820,
        mastHeightMeters: 2.0,
        startTimeUtc: '2026-May-15 12:00',
        stopTimeUtc: '2026-May-15 12:30',
        stepSize: '10m',
      });

      expect(cachedTrajectory.cached).toBe(true);
      expect(cachedTrajectory.points).toHaveLength(2);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseHorizonsCsvResponse,
  verifyEchoedHeader,
  computeHorizonsCacheHash,
  HorizonsClient,
  type HorizonsQueryOptions,
} from '../../src/services/celestial/horizonsClient';

const ADVERSARIAL_CACHE_DIR = join(process.cwd(), '.cache', 'adversarial_ephemeris_test');

describe('Adversarial Stress Test Harness: horizonsClient', () => {
  beforeEach(() => {
    if (existsSync(ADVERSARIAL_CACHE_DIR)) {
      rmSync(ADVERSARIAL_CACHE_DIR, { recursive: true, force: true });
    }
    mkdirSync(ADVERSARIAL_CACHE_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(ADVERSARIAL_CACHE_DIR)) {
      rmSync(ADVERSARIAL_CACHE_DIR, { recursive: true, force: true });
    }
  });

  describe('1. Arbitrary Column Permutations & Extra Column Injection', () => {
    it('handles completely reversed column order', () => {
      const reversedCsv = `
Center geodetic : 222.690000, -89.450000, 3.822000 {E-lon(deg),Lat(deg),Alt(km)}
*******************************************************************************
deldot, delta, Ang-diam, d(ELV)/dt, dAZ*cosE, Elev_(a-app), Azi_(a-app), Date__(UT)__HR:MN
$$SOE
0.0915009, 1.5088231856E+08, 1902.131, -0.15, -30.59, -0.995826, 331.804830, 2026-May-15 12:00
$$EOE
`;
      const points = parseHorizonsCsvResponse(reversedCsv);
      expect(points).toHaveLength(1);
      const p = points[0];
      expect(p.timestampUtc).toBe('2026-May-15 12:00');
      expect(p.azimuthDeg).toBeCloseTo(331.80483, 5);
      expect(p.elevationDeg).toBeCloseTo(-0.995826, 5);
      expect(p.rangeKm).toBeCloseTo(150882318.56, 1);
      expect(p.rangeRateKmS).toBeCloseTo(0.0915009, 6);
      expect(p.elevationRateDegHr).toBeCloseTo(-0.15 / 60.0, 7);
      expect(p.angularRadiusDeg).toBeCloseTo(1902.131 / 7200.0, 7);
    });

    it('handles interleaved extra unrequested columns and flags', () => {
      const interleavedCsv = `
Center geodetic : 222.690000, -89.450000, 3.822000 {E-lon(deg),Lat(deg),Alt(km)}
TargetBody, Date__(UT)__HR:MN, SolarFlag, Azi_(a-app), AppMag, Elev_(a-app), LunarPhase, dAZ*cosE, IllumFrac, d(ELV)/dt, Ang-diam, SubSolLat, delta, SubSolLon, deldot, QualityFlag
$$SOE
Moon, 2026-May-15 12:00, *, 331.804830, -12.5, -0.995826, 0.45, -30.59, 0.99, -0.15, 1902.131, -1.2, 1.5088231856E+08, 15.4, 0.0915009, GOOD
$$EOE
`;
      const points = parseHorizonsCsvResponse(interleavedCsv);
      expect(points).toHaveLength(1);
      const p = points[0];
      expect(p.timestampUtc).toBe('2026-May-15 12:00');
      expect(p.azimuthDeg).toBeCloseTo(331.80483, 5);
      expect(p.elevationDeg).toBeCloseTo(-0.995826, 5);
      expect(p.rangeKm).toBeCloseTo(150882318.56, 1);
      expect(p.rangeRateKmS).toBeCloseTo(0.0915009, 6);
    });

    it('correctly parses across multiple randomized column orderings', () => {
      const baseFields = [
        { name: 'Date__(UT)__HR:MN', val: '2026-May-15 12:00' },
        { name: 'Azi_(a-app)', val: '123.456789' },
        { name: 'Elev_(a-app)', val: '12.345678' },
        { name: 'dAZ*cosE', val: '45.67' },
        { name: 'd(ELV)/dt', val: '0.89' },
        { name: 'Ang-diam', val: '1800.5' },
        { name: 'delta', val: '384400.12' },
        { name: 'deldot', val: '-1.2345' },
      ];

      // Test 4 deterministic permutations
      const permutationOffsets = [1, 3, 5, 7];
      for (const offset of permutationOffsets) {
        const permuted = baseFields.slice(offset).concat(baseFields.slice(0, offset));
        const header = permuted.map((f) => f.name).join(', ');
        const row = permuted.map((f) => f.val).join(', ');
        const csv = `
Center geodetic : 0.0, 0.0, 0.0
${header}
$$SOE
${row}
$$EOE`;
        const points = parseHorizonsCsvResponse(csv);
        expect(points).toHaveLength(1);
        expect(points[0].azimuthDeg).toBeCloseTo(123.456789, 5);
        expect(points[0].elevationDeg).toBeCloseTo(12.345678, 5);
        expect(points[0].rangeKm).toBeCloseTo(384400.12, 2);
        expect(points[0].rangeRateKmS).toBeCloseTo(-1.2345, 4);
      }
    });
  });

  describe('2. Windows CRLF Line Endings, Variable Whitespace & Floating Point Variants', () => {
    it('handles Windows CRLF (\\r\\n) line endings throughout', () => {
      const crlfResponse =
        '*******************************************************************************\r\n' +
        ' Center geodetic : 222.690000, -89.450000, 3.822000 {E-lon(deg),Lat(deg),Alt(km)}\r\n' +
        '*******************************************************************************\r\n' +
        'Date__(UT)__HR:MN, Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot\r\n' +
        '$$SOE\r\n' +
        ' 2026-May-15 12:00, 331.804830, -0.995826, -30.59, -0.15, 1902.131, 1.5088231856E+08, 0.0915009\r\n' +
        ' 2026-May-15 12:10, 331.719834, -0.996224, -30.59, -0.15, 1902.130, 1.5088237390E+08, 0.0929397\r\n' +
        '$$EOE\r\n';

      const points = parseHorizonsCsvResponse(crlfResponse);
      expect(points).toHaveLength(2);
      expect(points[0].azimuthDeg).toBeCloseTo(331.80483, 5);
      expect(points[1].azimuthDeg).toBeCloseTo(331.719834, 5);
    });

    it('handles heavy whitespace, tabs, and trailing commas', () => {
      const messyResponse = `
\tCenter geodetic :  222.690000 ,  -89.450000 ,  3.822000  {E-lon(deg),Lat(deg),Alt(km)}
\t  Date__(UT)__HR:MN  ,\t Azi_(a-app) ,\t Elev_(a-app) ,\t dAZ*cosE ,\t d(ELV)/dt ,\t Ang-diam ,\t delta ,\t deldot , 
$$SOE
\t 2026-May-15 12:00 \t,\t  331.804830 \t,\t  -0.995826 \t,\t  -30.59 \t,\t  -0.15 \t,\t  1902.131 \t,\t  1.5088231856E+08 \t,\t  0.0915009 , 
$$EOE
`;
      const points = parseHorizonsCsvResponse(messyResponse);
      expect(points).toHaveLength(1);
      expect(points[0].timestampUtc).toBe('2026-May-15 12:00');
      expect(points[0].azimuthDeg).toBeCloseTo(331.80483, 5);
      expect(points[0].elevationDeg).toBeCloseTo(-0.995826, 5);
      expect(points[0].rangeKm).toBeCloseTo(150882318.56, 1);
    });

    it('handles signed numbers and alternate exponent formats', () => {
      const exponentResponse = `
Center geodetic : 0.0, 0.0, 0.0
Date__(UT)__HR:MN, Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot
$$SOE
2026-May-15 12:00, +045.500000, -00.500000, +1.234e+01, -5.678e-01, 1.9e+03, 3.84400e+05, +0.0000e+00
$$EOE
`;
      const points = parseHorizonsCsvResponse(exponentResponse);
      expect(points).toHaveLength(1);
      expect(points[0].azimuthDeg).toBeCloseTo(45.5, 5);
      expect(points[0].elevationDeg).toBeCloseTo(-0.5, 5);
      expect(points[0].rangeKm).toBeCloseTo(384400, 0);
      expect(points[0].rangeRateKmS).toBe(0);
    });
  });

  describe('3. Decorative Lines, Multiple Asterisks, and Comments', () => {
    it('handles multiple consecutive asterisk separator blocks before $$SOE', () => {
      const decorativeResponse = `
*******************************************************************************
 Revised: Jan 20, 2026             Sun / Moon                              10
 Center geodetic : 222.690000, -89.450000, 3.822000 {E-lon(deg),Lat(deg),Alt(km)}
 Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}
*******************************************************************************
*******************************************************************************
Date__(UT)__HR:MN, , ,Azi_(a-app), Elev_(a-app),  dAZ*cosE, d(ELV)/dt,  Ang-diam,             delta,     deldot,
*******************************************************************************
*******************************************************************************


$$SOE
 2026-May-15 12:00,*,i, 331.804830,    -0.995826,    -30.59,     -0.15,  1902.131,  1.5088231856E+08,  0.0915009,
$$EOE
*******************************************************************************
`;
      const points = parseHorizonsCsvResponse(decorativeResponse);
      expect(points).toHaveLength(1);
      expect(points[0].azimuthDeg).toBeCloseTo(331.80483, 5);
    });

    it('rejects response missing $$SOE or $$EOE gracefully', () => {
      expect(() => parseHorizonsCsvResponse('Invalid text with no markers')).toThrow(
        /Missing \$\$SOE or \$\$EOE delimiters/i,
      );
      expect(() => parseHorizonsCsvResponse('$$EOE before $$SOE $$SOE')).toThrow(
        /Missing \$\$SOE or \$\$EOE delimiters/i,
      );
    });

    it('rejects response with no detectable header preceding $$SOE', () => {
      const noHeader = `
*******************************************************************************
*******************************************************************************
$$SOE
2026-May-15 12:00, 331.8, -0.99
$$EOE`;
      expect(() => parseHorizonsCsvResponse(noHeader)).toThrow(/Missing column header line/i);
    });
  });

  describe('4. Rate Singularity Protections (Zenith & Nadir Limits)', () => {
    const testSingularityAngles = [
      { name: 'exact zenith (+90°)', el: 90.0 },
      { name: 'near zenith (+89.999999°)', el: 89.999999 },
      { name: 'trans-zenith (+90.000001°)', el: 90.000001 },
      { name: 'exact nadir (-90°)', el: -90.0 },
      { name: 'near nadir (-89.999999°)', el: -89.999999 },
      { name: 'trans-nadir (-90.000001°)', el: -90.000001 },
      { name: 'horizon grazing (0.0°)', el: 0.0 },
    ];

    for (const testCase of testSingularityAngles) {
      it(`evaluates finite rates without NaN or Infinity at ${testCase.name}`, () => {
        const csv = `
Center geodetic : 0.0, 0.0, 0.0
Date__(UT)__HR:MN, Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot
$$SOE
2026-May-15 12:00, 180.0, ${testCase.el.toFixed(6)}, 15.0, -0.5, 1900.0, 384400.0, 0.1
$$EOE`;
        const points = parseHorizonsCsvResponse(csv);
        expect(points).toHaveLength(1);
        const p = points[0];
        expect(Number.isFinite(p.azimuthRateDegHr)).toBe(true);
        expect(Number.isFinite(p.elevationRateDegHr)).toBe(true);
        expect(Number.isNaN(p.azimuthRateDegHr)).toBe(false);
        expect(Number.isNaN(p.elevationRateDegHr)).toBe(false);
      });
    }

    it('skips corrupted non-numeric data rows cleanly', () => {
      const corruptedRowCsv = `
Center geodetic : 0.0, 0.0, 0.0
Date__(UT)__HR:MN, Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot
$$SOE
2026-May-15 12:00, INVALID_AZ, -0.99, 0.0, 0.0, 1900.0, 384400.0, 0.0
2026-May-15 12:10, 180.0, -0.99, 0.0, 0.0, 1900.0, 384400.0, 0.0
$$EOE`;
      const points = parseHorizonsCsvResponse(corruptedRowCsv);
      expect(points).toHaveLength(1);
      expect(points[0].timestampUtc).toBe('2026-May-15 12:10');
      expect(points[0].azimuthDeg).toBe(180.0);
    });
  });

  describe('5. Cache Concurrency, Corruption Recovery & Disk Resilience', () => {
    const fixtureCsv = `
Center geodetic : 222.690000, -89.450000, 3.822000 {E-lon(deg),Lat(deg),Alt(km)}
Date__(UT)__HR:MN, Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot
$$SOE
2026-May-15 12:00, 331.804830, -0.995826, -30.59, -0.15, 1902.131, 1.5088231856E+08, 0.0915009
$$EOE
`;
    const defaultQuery: HorizonsQueryOptions = {
      targetCommand: '10',
      latitudeDeg: -89.45,
      longitudeDeg: 222.69,
      elevationMeters: 3820,
      mastHeightMeters: 2.0,
      startTimeUtc: '2026-May-15 12:00',
      stopTimeUtc: '2026-May-15 12:10',
      stepSize: '10m',
    };

    it('survives rapid concurrent queries (cold cache stampede) without error', async () => {
      const client = new HorizonsClient({
        cacheDir: ADVERSARIAL_CACHE_DIR,
        offlineFixtureProvider: () => fixtureCsv,
      });

      // Launch 30 concurrent queries simultaneously against cold cache
      const promises = Array.from({ length: 30 }, () => client.queryTrajectory(defaultQuery));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(30);
      for (const res of results) {
        expect(res.points).toHaveLength(1);
        expect(res.points[0].azimuthDeg).toBeCloseTo(331.80483, 5);
      }

      // Verify that cache file exists and contains valid JSON
      const hash = computeHorizonsCacheHash(defaultQuery);
      const cachePath = join(ADVERSARIAL_CACHE_DIR, `${hash}.json`);
      expect(existsSync(cachePath)).toBe(true);

      const parsedOnDisk = JSON.parse(readFileSync(cachePath, 'utf-8'));
      expect(parsedOnDisk.target).toBe('Sun');
      expect(parsedOnDisk.points).toHaveLength(1);
    });

    it('recovers from truncated / corrupted JSON cache files by refetching and overwriting', async () => {
      const client = new HorizonsClient({
        cacheDir: ADVERSARIAL_CACHE_DIR,
        offlineFixtureProvider: () => fixtureCsv,
      });

      const hash = computeHorizonsCacheHash(defaultQuery);
      const cachePath = join(ADVERSARIAL_CACHE_DIR, `${hash}.json`);

      // Intentionally plant corrupted JSON
      writeFileSync(cachePath, '{"corrupted": true, "truncated": [', 'utf-8');
      expect(existsSync(cachePath)).toBe(true);

      // Query should gracefully detect corruption, re-fetch, and overwrite
      const result = await client.queryTrajectory(defaultQuery);
      expect(result.cached).toBe(false);
      expect(result.points).toHaveLength(1);
      expect(result.points[0].azimuthDeg).toBeCloseTo(331.80483, 5);

      // Verify on-disk file is now valid JSON
      const repairedJson = JSON.parse(readFileSync(cachePath, 'utf-8'));
      expect(repairedJson.target).toBe('Sun');

      // Subsequent query hits the repaired cache
      const secondResult = await client.queryTrajectory(defaultQuery);
      expect(secondResult.cached).toBe(true);
    });

    it('recovers from 0-byte empty cache files', async () => {
      const client = new HorizonsClient({
        cacheDir: ADVERSARIAL_CACHE_DIR,
        offlineFixtureProvider: () => fixtureCsv,
      });

      const hash = computeHorizonsCacheHash(defaultQuery);
      const cachePath = join(ADVERSARIAL_CACHE_DIR, `${hash}.json`);

      // Plant 0-byte file
      writeFileSync(cachePath, '', 'utf-8');

      const result = await client.queryTrajectory(defaultQuery);
      expect(result.cached).toBe(false);
      expect(result.points).toHaveLength(1);

      // Verify repaired
      const secondResult = await client.queryTrajectory(defaultQuery);
      expect(secondResult.cached).toBe(true);
    });

    it('executes concurrent heterogeneous queries into fresh directory', async () => {
      const client = new HorizonsClient({
        cacheDir: ADVERSARIAL_CACHE_DIR,
        offlineFixtureProvider: () => fixtureCsv,
      });

      const queries: HorizonsQueryOptions[] = Array.from({ length: 8 }, (_, i) => ({
        targetCommand: i % 2 === 0 ? '10' : '399',
        latitudeDeg: -89.0 - i * 0.1,
        longitudeDeg: (220.0 + i * 5) % 360,
        elevationMeters: 3000 + i * 100,
        mastHeightMeters: 2.0,
        startTimeUtc: '2026-May-15 12:00',
        stopTimeUtc: '2026-May-15 12:10',
        stepSize: '10m',
      }));

      const results = await Promise.all(queries.map((q) => client.queryTrajectory(q)));
      expect(results).toHaveLength(8);

      for (let i = 0; i < queries.length; i++) {
        const hash = computeHorizonsCacheHash(queries[i]);
        const cachePath = join(ADVERSARIAL_CACHE_DIR, `${hash}.json`);
        expect(existsSync(cachePath)).toBe(true);
      }
    });
  });
});

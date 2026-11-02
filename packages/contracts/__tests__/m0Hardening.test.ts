import { describe, expect, test } from 'bun:test';
import {
  windowQuerySchema,
  WindowOptimizationSchema,
  paretoWindowRequestSchema,
} from '../src/windows';

describe('Milestone M0: windows.ts schema hardening', () => {
  const baseQuery = {
    siteId: 'connecting-ridge',
    startEpochMs: 1774872000000,
    endEpochMs: 1777464000000, // +30 days
  };

  test('accepts valid start and end epoch within 365 days', () => {
    const parsed = windowQuerySchema.parse(baseQuery);
    expect(parsed.siteId).toBe('connecting-ridge');
    expect(parsed.startEpochMs).toBe(1774872000000);
    expect(parsed.endEpochMs).toBe(1777464000000);
  });

  test('accepts startEpochMs === endEpochMs (0 day span)', () => {
    const sameDayQuery = {
      ...baseQuery,
      endEpochMs: baseQuery.startEpochMs,
    };
    const parsed = windowQuerySchema.parse(sameDayQuery);
    expect(parsed.endEpochMs).toBe(parsed.startEpochMs);
  });

  test('accepts maximum allowed search span of exactly 365 days', () => {
    const maxSpanMs = 365 * 86400 * 1000;
    const maxQuery = {
      ...baseQuery,
      endEpochMs: baseQuery.startEpochMs + maxSpanMs,
    };
    const parsed = windowQuerySchema.parse(maxQuery);
    expect(parsed.endEpochMs - parsed.startEpochMs).toBe(maxSpanMs);
  });

  test('rejects inverted dates with specific error message', () => {
    const invertedQuery = {
      ...baseQuery,
      startEpochMs: 1777464000000,
      endEpochMs: 1774872000000,
    };
    const res = windowQuerySchema.safeParse(invertedQuery);
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) =>
        i.message.includes('endEpochMs must be greater than or equal to startEpochMs')
      );
      expect(issue).toBeDefined();
    }
  });

  test('rejects search span greater than 365 days to prevent event-loop DoS starvation', () => {
    const excessSpanMs = 365 * 86400 * 1000 + 1000;
    const tooLongQuery = {
      ...baseQuery,
      endEpochMs: baseQuery.startEpochMs + excessSpanMs,
    };
    const res = windowQuerySchema.safeParse(tooLongQuery);
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) =>
        i.message.toLowerCase().includes('365')
      );
      expect(issue).toBeDefined();
    }
  });

  test('ParetoWindowRequestSchema and WindowOptimizationSchema inherit refinements', () => {
    const invertedQuery = {
      ...baseQuery,
      startEpochMs: 1777464000000,
      endEpochMs: 1774872000000,
    };
    expect(WindowOptimizationSchema.safeParse(invertedQuery).success).toBe(false);
    expect(paretoWindowRequestSchema.safeParse(invertedQuery).success).toBe(false);
  });
});

describe('Milestone M0: common.ts canonical lunarCoordinateSchema', () => {
  // @ts-ignore - import from common once defined
  test('validates south polar coordinates within [-90.0, -80.0] and [0.0, 360.0)', async () => {
    const { lunarCoordinateSchema } = await import('../src/common');
    
    // Valid cases
    expect(lunarCoordinateSchema.parse({ latitudeDeg: -89.9, longitudeDeg: 0.0 })).toBeDefined();
    expect(lunarCoordinateSchema.parse({ latitudeDeg: -90.0, longitudeDeg: 180.0, elevationMeters: 2500 })).toBeDefined();
    expect(lunarCoordinateSchema.parse({ latitudeDeg: -80.0, longitudeDeg: 359.999 })).toBeDefined();

    // Rejection cases
    // Latitude < -90.0
    expect(lunarCoordinateSchema.safeParse({ latitudeDeg: -90.1, longitudeDeg: 100.0 }).success).toBe(false);
    // Latitude > -80.0 (outside south pole operational envelope)
    expect(lunarCoordinateSchema.safeParse({ latitudeDeg: -79.9, longitudeDeg: 100.0 }).success).toBe(false);
    expect(lunarCoordinateSchema.safeParse({ latitudeDeg: 0.0, longitudeDeg: 100.0 }).success).toBe(false);
    // Longitude < 0.0
    expect(lunarCoordinateSchema.safeParse({ latitudeDeg: -85.0, longitudeDeg: -0.1 }).success).toBe(false);
    // Longitude >= 360.0
    expect(lunarCoordinateSchema.safeParse({ latitudeDeg: -85.0, longitudeDeg: 360.0 }).success).toBe(false);
    expect(lunarCoordinateSchema.safeParse({ latitudeDeg: -85.0, longitudeDeg: 361.0 }).success).toBe(false);
  });
});

describe('Milestone M0: terrain.ts horizonAssetSchema', () => {
  // @ts-ignore - import from terrain once defined
  test('validates genuine 360-bin horizon asset and applies defaults', async () => {
    const { horizonAssetSchema } = await import('../src/terrain');

    const mock360Array = Array.from({ length: 360 }, (_, i) => i * 0.01);
    const mockBlockerDist = Array.from({ length: 360 }, () => 15.5);
    const mockBlockerElev = Array.from({ length: 360 }, () => 2050.0);
    const mockStatuses = Array.from({ length: 360 }, () => 'valid' as const);

    const assetData = {
      siteId: 'shackleton-connecting-ridge',
      azimuthBinsCount: 360 as const,
      stepDeg: 1.0 as const,
      profiles: {
        '2.0': {
          elevationNominalDeg: mock360Array,
          thetaLowDeg: mock360Array.map((v) => v - 0.2),
          thetaHighDeg: mock360Array.map((v) => v + 0.2),
          blockerDistanceKm: mockBlockerDist,
          blockerElevationMeters: mockBlockerElev,
          binStatus: mockStatuses,
        },
      },
      provenance: {
        demSource: 'NASA LOLA PGDA 5m / Product 78',
        generatedAt: '2026-11-04T12:00:00Z',
      },
    };

    const parsed = horizonAssetSchema.parse(assetData);
    expect(parsed.siteId).toBe('shackleton-connecting-ridge');
    expect(parsed.azimuthBinsCount).toBe(360);
    expect(parsed.stepDeg).toBe(1.0);
    // Verified default for mastHeightsMeters
    expect(parsed.mastHeightsMeters).toEqual([1.0, 2.0, 5.0, 10.0]);
    expect(parsed.profiles['2.0'].elevationNominalDeg.length).toBe(360);
    expect(parsed.profiles['2.0'].binStatus[0]).toBe('valid');
    expect(parsed.provenance?.demSource).toBe('NASA LOLA PGDA 5m / Product 78');

    // Rejection on invalid azimuthBinsCount
    expect(
      horizonAssetSchema.safeParse({
        ...assetData,
        azimuthBinsCount: 180,
      }).success
    ).toBe(false);

    // Rejection on invalid stepDeg
    expect(
      horizonAssetSchema.safeParse({
        ...assetData,
        stepDeg: 0.5,
      }).success
    ).toBe(false);

    // Rejection on invalid binStatus
    expect(
      horizonAssetSchema.safeParse({
        ...assetData,
        profiles: {
          '2.0': {
            ...assetData.profiles['2.0'],
            binStatus: ['invalid_status'],
          },
        },
      }).success
    ).toBe(false);
  });
});

describe('Milestone M0: packages/contracts index exports', () => {
  test('exports all M0 schemas and types from index.ts', async () => {
    const contracts = await import('../src/index');

    // Windows exports
    expect(contracts.MAX_WINDOW_SEARCH_SPAN_MS).toBe(365 * 86400 * 1000);
    expect(contracts.windowQuerySchema).toBeDefined();

    // Coordinates exports
    expect(contracts.lunarCoordinateSchema).toBeDefined();
    expect(contracts.LunarCoordinateSchema).toBeDefined();

    // Terrain exports
    expect(contracts.horizonAssetSchema).toBeDefined();
    expect(contracts.HorizonAssetSchema).toBeDefined();
    expect(contracts.horizonProfileSchema).toBeDefined();
    expect(contracts.horizonBinStatusEnum).toBeDefined();

    // Safety exports
    expect(contracts.landingSafetyCompareRequestSchema).toBeDefined();
    expect(contracts.LandingSafetyCompareRequestSchema).toBeDefined();
  });
});


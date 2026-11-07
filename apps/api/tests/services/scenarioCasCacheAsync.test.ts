import { describe, it, expect } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ScenarioCasCache } from '../../src/services/scenarios/scenarioCasCache';
import type { ScenarioCompareResponse, ScenarioEvaluateResponse } from '@luna/contracts';

describe('ScenarioCasCache Asynchronous Disk & Memory Cache', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'cas-cache-test-'));

  const mockEvalResponse = {
    calculationId: 'test-eval-hash-1234567890abcdef',
    siteInfo: {
      siteId: 'shackleton-rim',
      displayName: 'Shackleton Rim',
      coordinates: { latitudeDeg: -89.9, longitudeDeg: 0.0, elevationM: 1286 },
      dipAngleDeg: -1.2,
      referenceBody: 'Moon',
    },
    status: 'valid',
    intervals: [],
    events: [],
    metrics: {
      totalSolarIlluminationSec: 3600,
      continuousSolarIlluminationMaxSec: 3600,
      totalEarthVisibilitySec: 7200,
      continuousEarthVisibilityMaxSec: 7200,
      solarAvailabilityFraction: 0.5,
      earthAvailabilityFraction: 1.0,
      combinedAccessSec: 3600,
      combinedAccessFraction: 0.5,
    },
    uncertaintyEnvelopes: {
      solarElevationNominalDeg: [],
      earthElevationNominalDeg: [],
    },
    provenance: {
      demSource: 'LDEM_85S_20M',
      ephemerisSource: 'NASA/JPL Horizons',
      calculationTimestampUtc: '2026-11-01T00:00:00.000Z',
    },
  } as unknown as ScenarioEvaluateResponse;

  const mockCompareResponse = {
    calculationId: 'test-compare-calc-123',
    status: 'valid',
    sites: [],
    decisionTrace: {
      version: '1.0.0',
      evaluations: {},
    },
    provenance: {
      calculationTimestampUtc: '2026-11-01T00:00:00.000Z',
    },
  } as unknown as ScenarioCompareResponse;

  it('returns null on cache miss', async () => {
    const cache = new ScenarioCasCache({ cacheDir: tempDir });
    const result = await cache.getScenarioEvaluation('nonexistent-hash');
    expect(result).toBeNull();
  });

  it('saves evaluation asynchronously and reads back from memory cache', async () => {
    const cache = new ScenarioCasCache({ cacheDir: tempDir });
    const hash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    await cache.saveScenarioEvaluation(hash, mockEvalResponse);
    const result = await cache.getScenarioEvaluation(hash);

    expect(result).not.toBeNull();
    expect(result?.cacheSource).toBe('HIT-MEMORY');
    expect(result?.data.calculationId).toBe(mockEvalResponse.calculationId);
  });

  it('promotes cached result from disk to memory after memory clear', async () => {
    const cache = new ScenarioCasCache({ cacheDir: tempDir });
    const hash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Clear memory cache so it must read from disk
    cache.clear();

    const diskResult = await cache.getScenarioEvaluation(hash);
    expect(diskResult).not.toBeNull();
    expect(diskResult?.cacheSource).toBe('HIT-DISK');
    expect(diskResult?.data.calculationId).toBe(mockEvalResponse.calculationId);

    // Subsequent read should hit memory
    const memoryResult = await cache.getScenarioEvaluation(hash);
    expect(memoryResult?.cacheSource).toBe('HIT-MEMORY');
  });

  it('saves and reads scenario comparison asynchronously', async () => {
    const cache = new ScenarioCasCache({ cacheDir: tempDir });
    const compareHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

    await cache.saveScenarioComparison(compareHash, mockCompareResponse);
    const memResult = await cache.getScenarioComparison(compareHash);
    expect(memResult?.cacheSource).toBe('HIT-MEMORY');
    expect(memResult?.data.calculationId).toBe(mockCompareResponse.calculationId);

    cache.clear();
    const diskResult = await cache.getScenarioComparison(compareHash);
    expect(diskResult?.cacheSource).toBe('HIT-DISK');
    expect(diskResult?.data.calculationId).toBe(mockCompareResponse.calculationId);

    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });
});

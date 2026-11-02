import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchLiveJplHorizonsStatus,
  getAnalyticalFallbackVectors,
  type JplEphemerisStatus,
} from '@/domain/services/nasaJplHorizonsService';

test('NASA JPL Horizons Service: generates analytical fallback vectors reliably', () => {
  const testEpochMs = new Date('2026-10-25T12:00:00Z').getTime();
  const fallback = getAnalyticalFallbackVectors(testEpochMs);

  assert.equal(fallback.status, 'offline-analytical');
  assert.ok(fallback.earthMoonDistanceKm > 350000);
  assert.ok(fallback.earthMoonDistanceKm < 410000);
  assert.ok(fallback.lightTimeSeconds > 1.1);
  assert.ok(fallback.lightTimeSeconds < 1.4);
  assert.ok(Number.isFinite(fallback.subSolarLatDeg));
  assert.ok(Number.isFinite(fallback.subEarthLatDeg));
});

test('NASA JPL Horizons Service: handles fetch gracefully with timeout and fallback', async () => {
  const testEpochMs = Date.now();
  const result: JplEphemerisStatus = await fetchLiveJplHorizonsStatus(testEpochMs, 2000);

  assert.ok(result);
  assert.ok(['online-verified', 'offline-analytical'].includes(result.status));
  assert.ok(result.earthMoonDistanceKm > 350000);
  assert.ok(result.source.includes('NASA'));
});

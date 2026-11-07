import { describe, it, expect } from 'bun:test';
import { DsnIngestionService } from '../../src/services/dsnIngestionService';
import { HorizonsProxyService } from '../../src/services/horizonsProxyService';

describe('DsnIngestionService In-Flight Deduplication', () => {
  it('deduplicates simultaneous fetchDsnTelemetry calls into a single in-flight resolution', async () => {
    const service = new DsnIngestionService();

    // Fire 3 simultaneous calls without prior cache
    const [res1, res2, res3] = await Promise.all([
      service.fetchDsnTelemetry(100),
      service.fetchDsnTelemetry(100),
      service.fetchDsnTelemetry(100),
    ]);

    expect(res1.status).toBeDefined();
    expect(res2.status).toBeDefined();
    expect(res3.status).toBeDefined();
    // They should share the exact same feedTimestampMs and stations count
    expect(res1.feedTimestampMs).toBe(res2.feedTimestampMs);
    expect(res2.feedTimestampMs).toBe(res3.feedTimestampMs);
    expect(res1.stations.length).toBe(res2.stations.length);
  });
});

describe('HorizonsProxyService In-Flight Deduplication', () => {
  it('deduplicates simultaneous getHorizonsEphemeris queries for the same epoch', async () => {
    const service = new HorizonsProxyService();
    const epochMs = Date.UTC(2026, 10, 1, 12, 0, 0);

    const [ephem1, ephem2, ephem3] = await Promise.all([
      service.getHorizonsEphemeris(epochMs, 100),
      service.getHorizonsEphemeris(epochMs, 100),
      service.getHorizonsEphemeris(epochMs, 100),
    ]);

    expect(ephem1.status).toBeDefined();
    expect(ephem2.status).toBeDefined();
    expect(ephem3.status).toBeDefined();
    expect(ephem1.subSolarLatDeg).toBe(ephem2.subSolarLatDeg);
    expect(ephem2.subSolarLatDeg).toBe(ephem3.subSolarLatDeg);
    expect(ephem1.earthMoonDistanceKm).toBe(ephem2.earthMoonDistanceKm);

    // After resolution, subsequent call hits cache
    const cached = await service.getHorizonsEphemeris(epochMs, 100);
    expect(cached.cached).toBe(true);
  });
});

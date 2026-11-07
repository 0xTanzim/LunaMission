import { describe, it, expect } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AsyncSemaphore } from '../../src/services/utils/asyncSemaphore';
import { HorizonsClient, type HorizonsQueryOptions } from '../../src/services/celestial/horizonsClient';

describe('AsyncSemaphore', () => {
  it('bounds concurrent executions to maxConcurrency', async () => {
    const semaphore = new AsyncSemaphore(3);
    let currentlyRunning = 0;
    let maxObserved = 0;
    const completed: number[] = [];

    const tasks = Array.from({ length: 10 }, (_, i) => async () => {
      const release = await semaphore.acquire();
      currentlyRunning++;
      if (currentlyRunning > maxObserved) {
        maxObserved = currentlyRunning;
      }
      await new Promise((r) => setTimeout(r, 20));
      currentlyRunning--;
      completed.push(i);
      release();
    });

    await Promise.all(tasks.map((t) => t()));

    expect(maxObserved).toBe(3);
    expect(completed.length).toBe(10);
    expect(semaphore.activeCount).toBe(0);
    expect(semaphore.queueLength).toBe(0);
  });

  it('rejects non-positive concurrency limits', () => {
    expect(() => new AsyncSemaphore(0)).toThrow();
    expect(() => new AsyncSemaphore(-2)).toThrow();
  });
});

describe('HorizonsClient In-Flight Deduplication & Semaphore', () => {
  it('deduplicates simultaneous identical queryTrajectory calls into a single execution', async () => {
    let fixtureCallCount = 0;
    const mockFixture = `
*******************************************************************************
Center geodetic : 0.000000,-89.900000,1.288000 {East-longitude, HP-latitude, Alt}
*******************************************************************************
Date__(UT)__HR:MN, , ,Azi_(a-app), Elev_(a-app), dAZ*cosE, d(ELV)/dt, Ang-diam, delta, deldot,
$$SOE
 2026-Nov-01 00:00,*,i, 180.000000, 1.500000, 30.00, 0.50, 1920.000, 384400.0, 0.0,
$$EOE
*******************************************************************************
`;

    const tempCacheDir = mkdtempSync(join(tmpdir(), 'horizons-conc-test-'));
    const client = new HorizonsClient({
      cacheDir: tempCacheDir,
      offlineFixtureProvider: () => {
        fixtureCallCount++;
        return mockFixture;
      },
    });

    const options: HorizonsQueryOptions = {
      targetCommand: '10',
      latitudeDeg: -89.9,
      longitudeDeg: 0.0,
      elevationMeters: 1286,
      mastHeightMeters: 2.0,
      startTimeUtc: '2026-Nov-01 00:00',
      stopTimeUtc: '2026-Nov-01 00:10',
      siteId: 'shackleton-rim',
    };

    const [t1, t2, t3] = await Promise.all([
      client.queryTrajectory(options),
      client.queryTrajectory(options),
      client.queryTrajectory(options),
    ]);

    expect(fixtureCallCount).toBe(1);
    expect(t1.points.length).toBe(1);
    expect(t2.points.length).toBe(1);
    expect(t3.points.length).toBe(1);

    try {
      rmSync(tempCacheDir, { recursive: true, force: true });
    } catch {}
  });
});

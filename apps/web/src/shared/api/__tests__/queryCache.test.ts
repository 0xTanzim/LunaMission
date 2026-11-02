import { describe, it, expect } from 'bun:test';
import { ScenarioQueryCache } from '../queryCache';

describe('ScenarioQueryCache Serialization & Key Determinism', () => {
  it('generates distinct keys for nested objects with different property values (prevents vehicle preset lockup)', () => {
    const cache = new ScenarioQueryCache<string>();

    const clpsPayload = {
      siteIds: ['connecting-ridge', 'shackleton-rim'],
      vehicleConstraints: {
        minContinuousSunlightHours: 40.0,
        maxContinuousDarknessHours: 60.0,
        minDteHours: 0.0,
        maxLandingSlopeDeg: 10.0,
      },
    };

    const artemisPayload = {
      siteIds: ['connecting-ridge', 'shackleton-rim'],
      vehicleConstraints: {
        minContinuousSunlightHours: 100.0,
        maxContinuousDarknessHours: 40.0,
        minDteHours: 0.0,
        maxLandingSlopeDeg: 15.0,
      },
    };

    const key1 = cache.computeKey(clpsPayload);
    const key2 = cache.computeKey(artemisPayload);

    expect(key1).not.toBe(key2);
    expect(key1).toContain('10');
    expect(key2).toContain('15');
    expect(key1).toContain('minContinuousSunlightHours');
  });

  it('guarantees key determinism regardless of property insertion order in nested objects', () => {
    const cache = new ScenarioQueryCache<string>();

    const payloadA = {
      b: 2,
      a: 1,
      nested: {
        z: 26,
        y: 25,
      },
    };

    const payloadB = {
      nested: {
        y: 25,
        z: 26,
      },
      a: 1,
      b: 2,
    };

    const keyA = cache.computeKey(payloadA);
    const keyB = cache.computeKey(payloadB);

    expect(keyA).toBe(keyB);
  });

  it('correctly handles arrays, nulls, and primitive values inside objects', () => {
    const cache = new ScenarioQueryCache<string>();

    const payload = {
      list: [3, 1, 2],
      empty: null,
      flag: true,
      label: 'test',
    };

    const key = cache.computeKey(payload);
    expect(key).toBe(JSON.stringify({ empty: null, flag: true, label: 'test', list: [3, 1, 2] }));
  });

  it('respects maxEntries capacity and evicts oldest accessed item in LRU order', () => {
    const cache = new ScenarioQueryCache<number>(2);

    cache.set('key1', 100);
    cache.set('key2', 200);

    // Access key1 to make key2 the least-recently used
    expect(cache.get('key1')).toBe(100);

    // Insert key3 -> should evict key2
    cache.set('key3', 300);

    expect(cache.get('key1')).toBe(100);
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key3')).toBe(300);
    expect(cache.size()).toBe(2);
  });

  it('clears all entries upon clear()', () => {
    const cache = new ScenarioQueryCache<number>(10);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeNull();
  });
});

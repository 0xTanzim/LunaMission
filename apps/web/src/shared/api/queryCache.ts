/**
 * In-Memory Content-Addressable Storage (CAS) LRU Cache
 * Governed by docs/phase-3/FRONTEND_ARCHITECTURE.md § 3.
 * Eliminates redundant network round-trips for recurring scenario parameters.
 */

export class ScenarioQueryCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private maxEntries: number;

  constructor(maxEntries = 128) {
    this.maxEntries = maxEntries;
  }

  public computeKey(payload: unknown): string {
    const deepSort = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(deepSort);
      const record = obj as Record<string, unknown>;
      return Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = deepSort(record[key]);
          return acc;
        }, {});
    };
    return JSON.stringify(deepSort(payload));
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    // Refresh LRU position
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  public set(key: string, data: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const scenarioEvaluationCache = new ScenarioQueryCache<unknown>(128);
export const scenarioComparisonCache = new ScenarioQueryCache<unknown>(64);

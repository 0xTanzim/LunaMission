/**
 * Two-Tier Content-Addressable Storage (CAS) Disk & Memory Cache
 * Milestone M5: Spatiotemporal Scenario Caching Engine
 * Governed by docs/phase-3/API_CONTRACT.md § 5.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  ScenarioCompareRequest,
  ScenarioCompareResponse,
  ScenarioEvaluateRequest,
  ScenarioEvaluateResponse,
} from '@luna/contracts';
import { DECISION_TRACE_VERSION, ENGINE_FINGERPRINT } from './engineIdentity';

export type CasCacheSource = 'HIT-MEMORY' | 'HIT-DISK' | 'MISS';

export interface CachedResult<T> {
  data: T;
  cacheSource: CasCacheSource;
}

export class ScenarioCasCache {
  private readonly memoryCache = new Map<string, unknown>();
  private readonly maxMemoryEntries: number;
  private readonly baseCacheDir: string;

  constructor(options: { maxMemoryEntries?: number; cacheDir?: string } = {}) {
    this.maxMemoryEntries = options.maxMemoryEntries ?? 512;
    this.baseCacheDir = options.cacheDir ?? join(process.cwd(), '.cache', 'scenarios');
  }

  /**
   * Cache key over the canonicalized request *and* the engine identity, so changing the
   * solver, terrain product or limb criterion can never be served from a stale entry.
   */
  computeScenarioHash(params: ScenarioEvaluateRequest): string {
    const canonical = {
      earthVisibilityCriterion: params.earthVisibilityCriterion,
      engine: ENGINE_FINGERPRINT,
      launchSlipOffsetDays: Number((params.launchSlipOffsetDays ?? 0).toFixed(3)),
      observerMastHeightM: Number((params.observerMastHeightM ?? 2.0).toFixed(1)),
      sampleIntervalSec: params.sampleIntervalSec ?? 600,
      siteId: params.siteId.trim().toLowerCase(),
      startUtc: new Date(params.startUtc).toISOString(),
      stopUtc: new Date(params.stopUtc).toISOString(),
      sunVisibilityCriterion: params.sunVisibilityCriterion,
    };
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  computeScenarioCompareHash(params: ScenarioCompareRequest): string {
    const sortedSiteIds = [...params.siteIds].map((s) => s.trim().toLowerCase()).sort();
    const canonical = {
      decisionTraceVersion: DECISION_TRACE_VERSION,
      earthVisibilityCriterion: params.earthVisibilityCriterion,
      engine: ENGINE_FINGERPRINT,
      launchSlipOffsetDays: Number((params.launchSlipOffsetDays ?? 0).toFixed(3)),
      observerMastHeightM: Number((params.observerMastHeightM ?? 2.0).toFixed(1)),
      pairwiseSelection: params.pairwiseSelection
        ? {
            siteIdA: params.pairwiseSelection.siteIdA?.trim().toLowerCase(),
            siteIdB: params.pairwiseSelection.siteIdB?.trim().toLowerCase(),
          }
        : undefined,
      rankingPreferences: params.rankingPreferences,
      siteIds: sortedSiteIds,
      startUtc: new Date(params.startUtc).toISOString(),
      stopUtc: new Date(params.stopUtc).toISOString(),
      sunVisibilityCriterion: params.sunVisibilityCriterion,
      vehicleConstraints: params.vehicleConstraints,
    };
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  private getDiskPath(hash: string): string {
    const shard1 = hash.slice(0, 2);
    const shard2 = hash.slice(2, 4);
    return join(this.baseCacheDir, shard1, shard2, `${hash}.json`);
  }

  private async writeToDiskAtomically(filePath: string, content: string): Promise<void> {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true }).catch(() => {});
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      await writeFile(tmpPath, content, 'utf-8');
      await rename(tmpPath, filePath);
    } catch {
      await unlink(tmpPath).catch(() => {});
    }
  }

  private addToMemory(hash: string, data: unknown): void {
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }
    this.memoryCache.set(hash, data);
  }

  async getScenarioEvaluation(hash: string): Promise<CachedResult<ScenarioEvaluateResponse> | null> {
    if (this.memoryCache.has(hash)) {
      const data = this.memoryCache.get(hash) as ScenarioEvaluateResponse;
      return { data, cacheSource: 'HIT-MEMORY' };
    }
    const diskPath = this.getDiskPath(hash);
    try {
      const raw = await readFile(diskPath, 'utf-8');
      const data = JSON.parse(raw) as ScenarioEvaluateResponse;
      this.addToMemory(hash, data);
      return { data, cacheSource: 'HIT-DISK' };
    } catch {
      return null;
    }
  }

  async saveScenarioEvaluation(hash: string, data: ScenarioEvaluateResponse): Promise<void> {
    this.addToMemory(hash, data);
    const diskPath = this.getDiskPath(hash);
    try {
      await this.writeToDiskAtomically(diskPath, JSON.stringify(data, null, 2));
    } catch {
      // Non-fatal disk write error
    }
  }

  async getScenarioComparison(hash: string): Promise<CachedResult<ScenarioCompareResponse> | null> {
    if (this.memoryCache.has(hash)) {
      const data = this.memoryCache.get(hash) as ScenarioCompareResponse;
      return { data, cacheSource: 'HIT-MEMORY' };
    }
    const diskPath = this.getDiskPath(hash);
    try {
      const raw = await readFile(diskPath, 'utf-8');
      const data = JSON.parse(raw) as ScenarioCompareResponse;
      this.addToMemory(hash, data);
      return { data, cacheSource: 'HIT-DISK' };
    } catch {
      return null;
    }
  }

  async saveScenarioComparison(hash: string, data: ScenarioCompareResponse): Promise<void> {
    this.addToMemory(hash, data);
    const diskPath = this.getDiskPath(hash);
    try {
      await this.writeToDiskAtomically(diskPath, JSON.stringify(data, null, 2));
    } catch {
      // Non-fatal disk write error
    }
  }

  clear(): void {
    this.memoryCache.clear();
  }
}

export const scenarioCasCache = new ScenarioCasCache();

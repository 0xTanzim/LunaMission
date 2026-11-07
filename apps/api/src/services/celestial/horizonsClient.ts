import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TopocentricEphemerisPoint, TopocentricTrajectory } from '@luna/contracts';
import { fetchHorizonsWithRetry, generateAnalyticalTrajectory } from './horizonsFallback';
import { AsyncSemaphore } from '../utils/asyncSemaphore';
import {
  parseHorizonsCsvResponse,
  verifyEchoedHeader,
  type ColumnIndexMap,
} from './horizonsParser';

export { parseHorizonsCsvResponse, verifyEchoedHeader, type ColumnIndexMap };

export interface HorizonsQueryOptions {
  targetCommand: '10' | '399'; // 10 = Sun, 399 = Earth
  latitudeDeg: number;
  longitudeDeg: number;
  elevationMeters: number;
  mastHeightMeters?: number;
  startTimeUtc: string; // 'YYYY-MMM-DD HH:mm'
  stopTimeUtc: string;  // 'YYYY-MMM-DD HH:mm'
  stepSize?: string;    // e.g., '10m', '1d'
  siteId?: string;
}

export function computeHorizonsCacheHash(options: HorizonsQueryOptions): string {
  const lonEastDeg = ((options.longitudeDeg % 360) + 360) % 360;
  const mastHeight = options.mastHeightMeters ?? 2.0;
  const horizonsAltKm = (options.elevationMeters + mastHeight) / 1000.0;

  const canonical = JSON.stringify({
    targetCommand: options.targetCommand,
    latDeg: Number(options.latitudeDeg.toFixed(6)),
    lonEastDeg: Number(lonEastDeg.toFixed(6)),
    altKm: Number(horizonsAltKm.toFixed(6)),
    startTimeUtc: options.startTimeUtc,
    stopTimeUtc: options.stopTimeUtc,
    stepSize: options.stepSize ?? '10m',
    quantities: '4,5,13,20',
    apparent: 'AIRLESS',
  });

  return createHash('sha256').update(canonical).digest('hex');
}

export interface HorizonsClientConfig {
  cacheDir?: string;
  offlineFixtureProvider?: (options: HorizonsQueryOptions) => string | null;
  maxConcurrency?: number;
}

export class HorizonsClient {
  private cacheDir: string;
  private offlineFixtureProvider?: (options: HorizonsQueryOptions) => string | null;
  private inFlightMap = new Map<string, Promise<TopocentricTrajectory>>();
  private semaphore: AsyncSemaphore;

  constructor(config: HorizonsClientConfig = {}) {
    this.cacheDir = config.cacheDir ?? join(process.cwd(), '.cache', 'ephemeris');
    this.offlineFixtureProvider = config.offlineFixtureProvider;
    this.semaphore = new AsyncSemaphore(config.maxConcurrency ?? 5);
  }

  getSemaphore(): AsyncSemaphore {
    return this.semaphore;
  }

  clearInFlight(): void {
    this.inFlightMap.clear();
  }

  async queryTrajectory(options: HorizonsQueryOptions): Promise<TopocentricTrajectory> {
    const lonEastDeg = ((options.longitudeDeg % 360) + 360) % 360;
    const mastHeight = options.mastHeightMeters ?? 2.0;
    const horizonsAltKm = (options.elevationMeters + mastHeight) / 1000.0;
    const stepSize = options.stepSize ?? '10m';
    const target = options.targetCommand === '10' ? 'Sun' : 'Earth';

    const hash = computeHorizonsCacheHash(options);
    const cacheFilePath = join(this.cacheDir, `${hash}.json`);

    // 1. Check Content-Addressable Disk Cache
    if (existsSync(cacheFilePath)) {
      try {
        const rawJson = readFileSync(cacheFilePath, 'utf-8');
        const cachedTrajectory = JSON.parse(rawJson) as TopocentricTrajectory;
        return { ...cachedTrajectory, cached: true };
      } catch {
        // Corrupted cache file; re-fetch
      }
    }

    // 2. Check In-Flight Pending Promise (Single-Flight Deduplication)
    if (this.inFlightMap.has(hash)) {
      return this.inFlightMap.get(hash)!;
    }

    const promise = (async (): Promise<TopocentricTrajectory> => {
      // 3. Fetch or obtain Horizons response
      let rawText = '';
      if (this.offlineFixtureProvider) {
        rawText = this.offlineFixtureProvider(options) ?? '';
      }

      if (!rawText) {
        const url = new URL('https://ssd.jpl.nasa.gov/api/horizons.api');
        url.searchParams.set('format', 'text');
        url.searchParams.set('COMMAND', `'${options.targetCommand}'`);
        url.searchParams.set('EPHEM_TYPE', 'OBSERVER');
        url.searchParams.set('CENTER', 'coord@301');
        url.searchParams.set('COORD_TYPE', 'GEODETIC');
        url.searchParams.set('SITE_COORD', `'${lonEastDeg.toFixed(6)},${options.latitudeDeg.toFixed(6)},${horizonsAltKm.toFixed(6)}'`);
        url.searchParams.set('START_TIME', `'${options.startTimeUtc}'`);
        url.searchParams.set('STOP_TIME', `'${options.stopTimeUtc}'`);
        url.searchParams.set('STEP_SIZE', `'${stepSize}'`);
        url.searchParams.set('QUANTITIES', "'4,5,13,20'");
        url.searchParams.set('ANG_FORMAT', "'DEG'");
        url.searchParams.set('RANGE_UNITS', "'KM'");
        url.searchParams.set('APPARENT', "'AIRLESS'");
        url.searchParams.set('CSV_FORMAT', "'YES'");

        const release = await this.semaphore.acquire();
        try {
          rawText = await fetchHorizonsWithRetry(url.toString(), 3, 15000);
        } catch (err) {
          console.warn(
            `[HorizonsClient] NASA JPL Horizons unavailable: ${(err as Error).message}. Engaging analytical Meeus/DE421 fallback engine.`,
          );
          return generateAnalyticalTrajectory(options);
        } finally {
          release();
        }
      }

      // 4. Dynamic Header-Driven Parse
      const points = parseHorizonsCsvResponse(rawText);

      // 5. Verify Echoed Header
      verifyEchoedHeader(rawText, lonEastDeg, options.latitudeDeg, horizonsAltKm);

      const trajectory: TopocentricTrajectory = {
        target,
        targetCommand: options.targetCommand,
        siteId: options.siteId,
        observerCoordinates: {
          latitudeDeg: options.latitudeDeg,
          longitudeDeg: lonEastDeg,
          elevationMeters: options.elevationMeters,
          mastHeightMeters: mastHeight,
          horizonsAltKm,
        },
        stepSize,
        points,
        source: 'NASA JPL Horizons (coord@301, MOON_ME_DE421)',
        cached: false,
      };

      // 6. Persist to Disk Cache
      try {
        if (!existsSync(this.cacheDir)) {
          mkdirSync(this.cacheDir, { recursive: true });
        }
        writeFileSync(cacheFilePath, JSON.stringify(trajectory, null, 2), 'utf-8');
      } catch {
        // Non-fatal write error
      }

      return trajectory;
    })().finally(() => {
      this.inFlightMap.delete(hash);
    });

    this.inFlightMap.set(hash, promise);
    return promise;
  }
}

export const horizonsClient = new HorizonsClient();

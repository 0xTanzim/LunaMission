import type { TopocentricEphemerisPoint, TopocentricTrajectory } from '@luna/contracts';
import type { HorizonsQueryOptions } from './horizonsClient';
import { calculateLunarEphemeris } from './ephemeris';
import { computeLocalEnuAngles, computeObserverRadiusMeters } from './enuGeometry';

/**
 * Fetches Horizons endpoint with exponential backoff retry for transient 503 / 429 / network errors.
 */
export async function fetchHorizonsWithRetry(
  url: string,
  maxRetries = 3,
  timeoutMs = 15000,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) {
        return await res.text();
      }

      // Transient server/rate-limiting errors eligible for retry
      if (res.status === 503 || res.status === 502 || res.status === 504 || res.status === 429) {
        lastError = new Error(`Horizons HTTP ${res.status}: ${res.statusText}`);
      } else {
        // Non-transient client error (400, 404, etc.)
        throw new Error(`Horizons HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      lastError = err as Error;
    }

    if (attempt < maxRetries) {
      const backoffMs = Math.min(3000, 500 * Math.pow(2, attempt - 1)) + Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError ?? new Error('Horizons fetch failed after retries');
}

function parseHorizonsEpochMs(timeStr: string): number {
  const parsed = Date.parse(timeStr.includes('Z') ? timeStr : `${timeStr} UTC`);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

/**
 * Synthesizes an authentic analytical topocentric ephemeris trajectory
 * using the Meeus/DE421 orbital mechanics engine when NASA Horizons is offline.
 */
export function generateAnalyticalTrajectory(
  options: HorizonsQueryOptions,
): TopocentricTrajectory {
  const lonEastDeg = ((options.longitudeDeg % 360) + 360) % 360;
  const mastHeight = options.mastHeightMeters ?? 2.0;
  const horizonsAltKm = (options.elevationMeters + mastHeight) / 1000.0;
  const stepSize = options.stepSize ?? '10m';
  const target = options.targetCommand === '10' ? 'Sun' : 'Earth';
  const isSun = options.targetCommand === '10';

  const startMs = parseHorizonsEpochMs(options.startTimeUtc);
  const stopMs = parseHorizonsEpochMs(options.stopTimeUtc);
  const stepMinutes = stepSize.endsWith('m') ? parseInt(stepSize, 10) || 10 : 10;
  const stepMs = Math.max(60000, stepMinutes * 60 * 1000);
  const obsRadius = computeObserverRadiusMeters(options.elevationMeters, mastHeight);

  const rawAngles: { epochMs: number; azDeg: number; elDeg: number; rangeKm: number }[] = [];
  for (let t = startMs; t <= stopMs; t += stepMs) {
    const jd = t / 86400000.0 + 2440587.5;
    const ephem = calculateLunarEphemeris(jd);

    let vec: [number, number, number];
    if (isSun) {
      const AU_KM = 149597870.7;
      const lat = ephem.subSolarLatDeg * (Math.PI / 180);
      const lon = ephem.subSolarLonDeg * (Math.PI / 180);
      vec = [AU_KM * Math.cos(lat) * Math.cos(lon), AU_KM * Math.cos(lat) * Math.sin(lon), AU_KM * Math.sin(lat)];
    } else {
      const dist = ephem.earthMoonDistanceKm;
      const lat = ephem.subEarthLatDeg * (Math.PI / 180);
      const lon = ephem.subEarthLonDeg * (Math.PI / 180);
      vec = [dist * Math.cos(lat) * Math.cos(lon), dist * Math.cos(lat) * Math.sin(lon), dist * Math.sin(lat)];
    }

    const enu = computeLocalEnuAngles(vec, options.latitudeDeg, lonEastDeg, obsRadius);
    rawAngles.push({ epochMs: t, azDeg: enu.azimuthDeg, elDeg: enu.elevationDeg, rangeKm: enu.rangeKm });
  }

  const dtHr = stepMs / 3600000.0;
  const points: TopocentricEphemerisPoint[] = rawAngles.map((p, i) => {
    let dElDt = 0;
    let dAzDt = 0;

    if (i > 0 && i < rawAngles.length - 1) {
      dElDt = (rawAngles[i + 1].elDeg - rawAngles[i - 1].elDeg) / (2 * dtHr);
      let dAz = rawAngles[i + 1].azDeg - rawAngles[i - 1].azDeg;
      if (dAz > 180) dAz -= 360;
      if (dAz < -180) dAz += 360;
      dAzDt = dAz / (2 * dtHr);
    } else if (i === 0 && rawAngles.length > 1) {
      dElDt = (rawAngles[1].elDeg - rawAngles[0].elDeg) / dtHr;
      let dAz = rawAngles[1].azDeg - rawAngles[0].azDeg;
      if (dAz > 180) dAz -= 360;
      if (dAz < -180) dAz += 360;
      dAzDt = dAz / dtHr;
    } else if (i === rawAngles.length - 1 && rawAngles.length > 1) {
      dElDt = (rawAngles[i].elDeg - rawAngles[i - 1].elDeg) / dtHr;
      let dAz = rawAngles[i].azDeg - rawAngles[i - 1].azDeg;
      if (dAz > 180) dAz -= 360;
      if (dAz < -180) dAz += 360;
      dAzDt = dAz / dtHr;
    }

    const angRad = isSun ? 0.2666 : Math.asin(Math.min(1.0, 6378.137 / p.rangeKm)) * (180.0 / Math.PI);

    return {
      timestampUtc: new Date(p.epochMs).toISOString(),
      epochMs: p.epochMs,
      azimuthDeg: p.azDeg,
      elevationDeg: p.elDeg,
      azimuthRateDegHr: dAzDt,
      elevationRateDegHr: dElDt,
      angularRadiusDeg: angRad,
      rangeKm: p.rangeKm,
      rangeRateKmS: 0,
    };
  });

  return {
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
    source: 'Analytical Meeus/DE421 Ephemeris Engine (Horizons Offline Fallback)',
    cached: false,
  };
}

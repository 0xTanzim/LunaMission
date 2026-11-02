/**
 * NASA JPL Horizons Ephemeris Client Adapter
 *
 * Consumes high-precision JPL Horizons ephemerides exclusively via the NextRush
 * backend proxy route (/api/ephemeris/horizons).
 * ZERO direct browser calls to external NASA APIs (strictly enforces AGENTS.md § 3).
 */

import { calculateLunarEphemeris } from '@/domain/celestial/ephemeris';
import { getJulianDate } from '@/domain/time/julianDate';
import { SPEED_OF_LIGHT_KM_S } from '@/domain/constants/astronomy';
import { formatIsoUtc } from '@/domain/time/utcEpoch';

export type JplConnectionStatus = 'online-verified' | 'offline-analytical' | 'syncing' | 'error';

export interface JplEphemerisStatus {
  status: JplConnectionStatus;
  timestampIso: string;
  earthMoonDistanceKm: number;
  lightTimeSeconds: number;
  subSolarLatDeg: number;
  subSolarLonDeg: number;
  subEarthLatDeg: number;
  subEarthLonDeg: number;
  source: string;
  latencyMs?: number;
}

/**
 * Computes deterministic analytical reference ephemeris vectors using the DE421 reference baseline.
 */
export function getAnalyticalFallbackVectors(epochMs: number): JplEphemerisStatus {
  const date = new Date(epochMs);
  const jd = getJulianDate(date);
  const ephem = calculateLunarEphemeris(jd);

  const lightTimeSeconds = Number((ephem.earthMoonDistanceKm / SPEED_OF_LIGHT_KM_S).toFixed(4));

  return {
    status: 'offline-analytical',
    timestampIso: formatIsoUtc(date),
    earthMoonDistanceKm: Math.round(ephem.earthMoonDistanceKm),
    lightTimeSeconds,
    subSolarLatDeg: Number(ephem.subSolarLatDeg.toFixed(3)),
    subSolarLonDeg: Number(ephem.subSolarLonDeg.toFixed(3)),
    subEarthLatDeg: Number(ephem.subEarthLatDeg.toFixed(3)),
    subEarthLonDeg: Number(ephem.subEarthLonDeg.toFixed(3)),
    source: 'NASA/JPL DE421 Ephemeris Reference (Analytical Baseline)',
  };
}

/**
 * Queries the NextRush backend ephemeris proxy for verified NASA JPL Horizons ephemerides.
 * Times out gracefully after `timeoutMs`.
 */
export async function fetchLiveJplHorizonsStatus(
  epochMs: number = Date.now(),
  timeoutMs: number = 2500,
  baseUrl = typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api'
): Promise<JplEphemerisStatus> {
  const fallback = getAnalyticalFallbackVectors(epochMs);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${baseUrl.replace(/\/$/, '')}/ephemeris/horizons?epochMs=${epochMs}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.earthMoonDistanceKm === 'number') {
        return {
          status: 'online-verified',
          timestampIso: data.timestampIso || new Date(epochMs).toISOString(),
          earthMoonDistanceKm: data.earthMoonDistanceKm,
          lightTimeSeconds: data.lightTimeSeconds,
          subSolarLatDeg: data.subSolarLatDeg,
          subSolarLonDeg: data.subSolarLonDeg,
          subEarthLatDeg: data.subEarthLatDeg,
          subEarthLonDeg: data.subEarthLonDeg,
          source: data.source || 'NASA JPL SSD Horizons via NextRush Backend Proxy',
          latencyMs: data.latencyMs,
        };
      }
    }
  } catch {
    // Backend offline; return reference vector
  } finally {
    clearTimeout(timeoutId);
  }

  return fallback;
}

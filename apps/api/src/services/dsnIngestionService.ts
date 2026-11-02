/**
 * NASA Deep Space Network (DSN) Live Ingestion & Telemetry Service
 *
 * Ingests live XML telemetry from NASA Eyes on the DSN (https://eyes.nasa.gov/dsn/data/dsn.xml)
 * Features AbortController timeout, 15s LRU cache, realistic fallback,
 * topocentric lunar Az/El (10° mask), and lunar asset filtering.
 */

import {
  type DsnDish,
  type DsnSignal,
  type DsnStation,
  type DsnTarget,
  type DsnTelemetryResponse,
  type DsnTopocentricCoords,
  type LunarTrackingSummary,
} from '../schemas/telemetrySchemas';
import { parseDsnXml, type DsnParsedStation } from './dsnXmlParser';

const DSN_COORDINATES = {
  gdscc: { lat: 35.4266, lon: -116.89, name: 'Goldstone' },
  mdscc: { lat: 40.4273, lon: -4.2497, name: 'Madrid' },
  cdscc: { lat: -35.4014, lon: 148.9817, name: 'Canberra' },
};

export function computeStationLunarTopocentric(
  stationId: 'gdscc' | 'mdscc' | 'cdscc',
  epochMs: number,
  horizonMaskDeg = 10.0,
): DsnTopocentricCoords {
  const coords = DSN_COORDINATES[stationId] || DSN_COORDINATES.gdscc;
  const phiRad = (coords.lat * Math.PI) / 180;
  const d = epochMs / 86400000 + 2440587.5 - 2451545.0;

  const gmstDeg = ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360;
  const lstDeg = ((gmstDeg + coords.lon) % 360 + 360) % 360;

  const L_prime = ((218.316 + 13.176396 * d) % 360 + 360) % 360;
  const M = ((134.963 + 13.064993 * d) % 360 + 360) % 360;
  const F = ((93.272 + 13.229350 * d) % 360 + 360) % 360;

  const lambdaRad = ((L_prime + 6.289 * Math.sin((M * Math.PI) / 180)) * Math.PI) / 180;
  const betaRad = ((5.128 * Math.sin((F * Math.PI) / 180)) * Math.PI) / 180;
  const epsRad = ((23.439 - 0.00000036 * d) * Math.PI) / 180;

  const sinDelta = Math.sin(betaRad) * Math.cos(epsRad) + Math.cos(betaRad) * Math.sin(epsRad) * Math.sin(lambdaRad);
  const deltaRad = Math.asin(Math.max(-1, Math.min(1, sinDelta)));

  const yAlpha = Math.cos(betaRad) * Math.cos(epsRad) * Math.sin(lambdaRad) - Math.sin(betaRad) * Math.sin(epsRad);
  const xAlpha = Math.cos(betaRad) * Math.cos(lambdaRad);
  let alphaDeg = (Math.atan2(yAlpha, xAlpha) * 180) / Math.PI;
  if (alphaDeg < 0) alphaDeg += 360;

  const hRad = ((((lstDeg - alphaDeg) % 360 + 360) % 360) * Math.PI) / 180;
  const sinEl = Math.sin(phiRad) * Math.sin(deltaRad) + Math.cos(phiRad) * Math.cos(deltaRad) * Math.cos(hRad);
  const elDeg = (Math.asin(Math.max(-1, Math.min(1, sinEl))) * 180) / Math.PI;

  const yAz = -Math.sin(hRad);
  const xAz = Math.tan(deltaRad) * Math.cos(phiRad) - Math.sin(phiRad) * Math.cos(hRad);
  let azDeg = (Math.atan2(yAz, xAz) * 180) / Math.PI;
  if (azDeg < 0) azDeg += 360;

  return {
    elevationDeg: Number(elDeg.toFixed(2)),
    azimuthDeg: Number(azDeg.toFixed(2)),
    isVisible: elDeg >= horizonMaskDeg,
    horizonMaskDeg,
  };
}

function resolveActiveStation(stations: DsnStation[]): 'gdscc' | 'mdscc' | 'cdscc' | null {
  let activeId: 'gdscc' | 'mdscc' | 'cdscc' | null = null;
  let maxEl = -999;
  for (const s of stations) {
    if (s.topocentric.isVisible && s.topocentric.elevationDeg > maxEl) {
      maxEl = s.topocentric.elevationDeg;
      activeId = s.id;
    }
  }
  return activeId;
}

function makeDish(name: string, az: number, el: number, wind: number | null, act = 'Spacecraft Telemetry, Tracking, and Command', up: DsnSignal[] = [], down: DsnSignal[] = [], tgt: DsnTarget[] = []): DsnDish {
  return { dishName: name, azimuthDeg: az, elevationDeg: el, windSpeedKmh: wind, isMspa: false, isArray: false, isDdor: false, activity: act, upSignals: up, downSignals: down, targets: tgt };
}

export class DsnIngestionService {
  private cache: { data: DsnTelemetryResponse; expiresAt: number } | null = null;
  private readonly ttlMs = 15_000;
  private readonly feedUrl = 'https://eyes.nasa.gov/dsn/data/dsn.xml';

  clearCache(): void { this.cache = null; }

  cacheTelemetry(telemetry: DsnTelemetryResponse): void {
    this.cache = { data: telemetry, expiresAt: Date.now() + this.ttlMs };
  }

  getCachedTelemetry(): (DsnTelemetryResponse & { cached: boolean }) | null {
    if (!this.cache) return null;
    if (Date.now() > this.cache.expiresAt) {
      this.cache = null;
      return null;
    }
    return { ...this.cache.data, status: 'cached_valid', cached: true, provenance: { ...this.cache.data.provenance, cached: true } };
  }

  buildLunarTrackingSummary(stations: DsnParsedStation[]): LunarTrackingSummary {
    const lunarTargets = new Set<string>();
    let activeLunarDishes = 0;
    let primaryTrackingDish: string | null = null;
    let downlinkBand = 'S';
    let bestDownlinkPowerDbm = -150;
    let bestSignalFound = false;
    const LUNAR = ['KPLO', 'LRO', 'ARTEMIS', 'ART', 'ORION', 'SLS', 'CLPS', 'IM-1', 'IM-2', 'VIPER'];

    for (const station of stations) {
      for (const dish of station.dishes) {
        let isLunar = false;
        for (const t of dish.targets) {
          if (LUNAR.some((n) => t.name.toUpperCase().includes(n)) || (t.downlegRangeKm >= 200000 && t.downlegRangeKm <= 600000)) {
            lunarTargets.add(t.name);
            isLunar = true;
          }
        }
        for (const s of [...dish.upSignals, ...dish.downSignals]) {
          if (LUNAR.some((n) => s.spacecraft.toUpperCase().includes(n))) {
            lunarTargets.add(s.spacecraft);
            isLunar = true;
          }
        }
        if (isLunar) {
          activeLunarDishes++;
          if (!primaryTrackingDish) primaryTrackingDish = dish.dishName;
          for (const s of dish.downSignals) {
            if (s.powerDbmOrKw > bestDownlinkPowerDbm) {
              bestDownlinkPowerDbm = s.powerDbmOrKw;
              bestSignalFound = true;
              primaryTrackingDish = dish.dishName;
              if (s.band) downlinkBand = s.band;
            } else if (!bestSignalFound && s.band) {
              downlinkBand = s.band;
            }
          }
        }
      }
    }

    const linkMarginDb = bestSignalFound ? Number((bestDownlinkPowerDbm - -130.0).toFixed(1)) : 10.0;
    const linkState = linkMarginDb >= 3.0 ? 'locked' : linkMarginDb >= 0.0 ? 'marginal' : 'loss_of_signal';

    return { activeLunarDishes, trackedSpacecraft: Array.from(lunarTargets), primaryTrackingDish, downlinkBand, linkMarginDb, linkState };
  }

  getOfflineFallbackFixture(epochMs: number = Date.now()): DsnTelemetryResponse {
    const kploTarget: DsnTarget = { name: 'KPLO', id: '155', uplegRangeKm: 358000, downlegRangeKm: 358000, roundTripLightTimeSec: 2.38 };
    const kploUp: DsnSignal = { active: true, signalType: 'data', dataRateBps: 0, frequencyHz: 2110000000, band: 'S', powerDbmOrKw: 0.2, spacecraft: 'KPLO', spacecraftId: '-155' };
    const kploDown: DsnSignal = { active: true, signalType: 'data', dataRateBps: 8192, frequencyHz: 2290000000, band: 'S', powerDbmOrKw: -120, spacecraft: 'KPLO', spacecraftId: '-155' };

    const stations: DsnStation[] = [
      {
        id: 'gdscc',
        friendlyName: 'Goldstone',
        timeUtcMs: epochMs,
        timeZoneOffsetMs: -25200000,
        dishes: [
          makeDish('DSS14', 28.4, 62.1, 12.0, 'Spacecraft Telemetry, Tracking, and Command', [], [], [{ name: 'VGR1', id: '31', uplegRangeKm: 25800000000, downlegRangeKm: 25800000000, roundTripLightTimeSec: -1 }]),
          makeDish('DSS24', 0, 90, null, 'Standby / Scheduled Track'),
        ],
        topocentric: computeStationLunarTopocentric('gdscc', epochMs),
      },
      {
        id: 'mdscc',
        friendlyName: 'Madrid',
        timeUtcMs: epochMs,
        timeZoneOffsetMs: 3600000,
        dishes: [
          makeDish('DSS53', 225.5, 70.1, 4.2, 'Spacecraft Telemetry, Tracking, and Command', [kploUp], [kploDown], [kploTarget]),
          makeDish('DSS63', 180.0, 45.0, 8.5, 'Scheduled Deep Space Track'),
        ],
        topocentric: computeStationLunarTopocentric('mdscc', epochMs),
      },
      {
        id: 'cdscc',
        friendlyName: 'Canberra',
        timeUtcMs: epochMs,
        timeZoneOffsetMs: 39600000,
        dishes: [
          makeDish('DSS43', 92.0, 33.4, 6.0, 'Spacecraft Telemetry, Tracking, and Command', [], [], [{ name: 'NHPC', id: '98', uplegRangeKm: 9900000000, downlegRangeKm: 9900000000, roundTripLightTimeSec: 66000 }]),
        ],
        topocentric: computeStationLunarTopocentric('cdscc', epochMs),
      },
    ];

    return {
      status: 'offline_fallback',
      timestampIso: new Date(epochMs).toISOString(),
      feedTimestampMs: epochMs,
      latencyMs: 1,
      stations,
      activeStationId: resolveActiveStation(stations),
      lunarTrackingSummary: {
        activeLunarDishes: 1,
        trackedSpacecraft: ['KPLO'],
        primaryTrackingDish: 'DSS53',
        downlinkBand: 'S',
        linkMarginDb: 10.0,
        linkState: 'locked',
      },
      provenance: { source: 'NASA Eyes on the DSN Curated Offline Fallback Fixture', endpoint: this.feedUrl, cached: false, cacheTtlSeconds: 15 },
    };
  }

  async fetchDsnTelemetry(timeoutMs = 2500): Promise<DsnTelemetryResponse> {
    const cached = this.getCachedTelemetry();
    if (cached) return cached;

    const startTime = Date.now();
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      const response = await fetch(this.feedUrl, { signal: controller?.signal, headers: { Accept: 'application/xml, text/xml' } });
      if (timeoutId) clearTimeout(timeoutId);

      if (response.ok) {
        const xml = await response.text();
        const latencyMs = Date.now() - startTime;
        const snapshot = parseDsnXml(xml);

        if (snapshot.stations.length > 0) {
          const stations: DsnStation[] = snapshot.stations.map((st) => ({
            id: st.id,
            friendlyName: st.friendlyName,
            timeUtcMs: st.timeUtcMs,
            timeZoneOffsetMs: st.timeZoneOffsetMs,
            dishes: st.dishes,
            topocentric: computeStationLunarTopocentric(st.id, snapshot.timestampMs),
          }));

          const result: DsnTelemetryResponse = {
            status: 'live_feed',
            timestampIso: new Date(snapshot.timestampMs).toISOString(),
            feedTimestampMs: snapshot.timestampMs,
            latencyMs,
            stations,
            activeStationId: resolveActiveStation(stations),
            lunarTrackingSummary: this.buildLunarTrackingSummary(snapshot.stations),
            provenance: { source: 'NASA Eyes on the DSN XML Live Feed', endpoint: this.feedUrl, cached: false, cacheTtlSeconds: 15 },
          };

          this.cacheTelemetry(result);
          return result;
        }
      }
    } catch {
      // Outbound network restricted, timed out, or offline
    }

    const fallback = this.getOfflineFallbackFixture(Date.now());
    this.cacheTelemetry(fallback);
    return fallback;
  }
}

export const dsnIngestionService = new DsnIngestionService();

import type {
  DsnSignal,
  DsnTarget,
  DsnDish,
  DsnTopocentricCoords,
  DsnStation,
  LunarTrackingSummary,
  DsnTelemetryResponse,
} from '@luna/contracts';

export type {
  DsnSignal,
  DsnTarget,
  DsnDish,
  DsnTopocentricCoords,
  DsnStation,
  LunarTrackingSummary,
  DsnTelemetryResponse,
};

const DEFAULT_TIMEOUT_MS = 2500;

export class DsnTelemetryClient {
  private readonly baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  withBaseUrl(newBaseUrl: string): DsnTelemetryClient {
    return new DsnTelemetryClient(newBaseUrl);
  }

  createOfflineResponse(epochMs: number = Date.now()): DsnTelemetryResponse {
    return {
      status: 'offline_fallback',
      timestampIso: new Date(epochMs).toISOString(),
      feedTimestampMs: epochMs,
      latencyMs: 0,
      stations: [],
      activeStationId: null,
      lunarTrackingSummary: {
        activeLunarDishes: 0,
        trackedSpacecraft: [],
        primaryTrackingDish: 'None (Telemetry Offline)',
        downlinkBand: 'N/A',
        linkMarginDb: 0,
        linkState: 'loss_of_signal',
      },
      provenance: {
        source: 'nextrush_server',
        endpoint: `${this.baseUrl}/telemetry/dsn`,
        cached: false,
        cacheTtlSeconds: 0,
      },
    };
  }

  async fetchLiveDsnTelemetry(_siteId?: string, epochMs: number = Date.now()): Promise<DsnTelemetryResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const url = `${this.baseUrl}/telemetry/dsn`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        return this.createOfflineResponse(epochMs);
      }

      const json = (await res.json()) as DsnTelemetryResponse;
      if (json && Array.isArray(json.stations) && json.lunarTrackingSummary) {
        return {
          ...json,
          provenance: {
            ...json.provenance,
            source: 'nextrush_server',
          },
        };
      }

      return this.createOfflineResponse(epochMs);
    } catch {
      return this.createOfflineResponse(epochMs);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const dsnTelemetryClient = new DsnTelemetryClient();

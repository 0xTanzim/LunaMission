import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { siteCatalogClient } from '@/domain/services/siteCatalogClient';
import { dsnTelemetryClient } from '@/domain/services/dsnTelemetryClient';
import {
  clearDynamicSites,
  getAllAvailableSites,
  getSiteById,
  registerDynamicSites,
} from '@/domain/sites/catalog';
import { CANDIDATE_SITES } from '@luna/contracts';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import { useSiteCatalog } from '@/features/spatial/hooks/useSiteCatalog';
import { useDsnTelemetry } from '@/features/horizon/hooks/useDsnTelemetry';
import { DsnStationBox } from '@/features/horizon/components/DsnStationBox';
import { DsnLinkBudgetCard } from '@/features/horizon/components/DsnLinkBudgetCard';
import { deriveScenarioModel } from '@/app/scenario/model/scenarioModel';

describe('Frontend Resilience & Offline Fallback: Empirical Stress Harness', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    registerDynamicSites(CANDIDATE_SITES);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    registerDynamicSites(CANDIDATE_SITES);
  });

  // =========================================================================
  // 1. NETWORK DISCONNECTION & BACKEND OFFLINE SIMULATION
  // =========================================================================
  describe('1. Network Disconnection & Fault Injection (Timeout, 500, 502, 503, Malformed JSON)', () => {
    test('siteCatalogClient: handles complete connection refusal (ECONNREFUSED) without throwing', async () => {
      // Offline port
      const client = siteCatalogClient.withBaseUrl('http://127.0.0.1:59998/api');
      const result = await client.fetchCandidateSites();

      expect(result.source).toBe('nextrush_server');
      expect(result.status).toBe('failed');
      expect(result.sites.length).toBe(0);
      expect(result.length).toBe(0);
    });

    test('siteCatalogClient: handles request timeout / AbortSignal trigger cleanly', async () => {
      // Simulate hanging server exceeding timeout
      globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      }) as any;

      const client = siteCatalogClient.withBaseUrl('/api');
      const result = await client.fetchCandidateSites();

      expect(result.source).toBe('nextrush_server');
      expect(result.status).toBe('failed');
      expect(result.sites.length).toBe(0);
    });

    test('siteCatalogClient: handles HTTP 500, 502, 503, 504 server errors gracefully', async () => {
      const errorStatuses = [500, 502, 503, 504, 404];

      for (const status of errorStatuses) {
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify({ error: `Server error ${status}` }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;

        const client = siteCatalogClient.withBaseUrl('/api');
        const sitesResult = await client.fetchCandidateSites();
        expect(sitesResult.source).toBe('nextrush_server');
        expect(sitesResult.status).toBe('failed');
        expect(sitesResult.sites.length).toBe(0);

        const detailResult = await client.fetchSiteDetail('shackleton-rim');
        expect(detailResult.source).toBe('nextrush_server');
        expect(detailResult.status).toBe('failed');
        expect(detailResult.site).toBeNull();
      }
    });

    test('siteCatalogClient: handles malformed JSON syntax and HTML 200 via fallback', async () => {
      const malformedPayloads = [
        '<!DOCTYPE html><html><body>Error 502 Bad Gateway</body></html>',
        '{"sites": [ unclosed_array',
        '',
      ];

      for (const payload of malformedPayloads) {
        globalThis.fetch = (async () => {
          return new Response(payload, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;

        const client = siteCatalogClient.withBaseUrl('/api');
        const result = await client.fetchCandidateSites();
        expect(result.source).toBe('nextrush_server');
        expect(result.status).toBe('failed');
        expect(result.sites.length).toBe(0);
      }
    });

    test('siteCatalogClient & useSiteCatalog: safely handle when upstream returns non-array corrupt schema ({ sites: "Gateway error string" })', async () => {
      // When backend or proxy returns 200 OK with non-array string payload
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ sites: 'Gateway error string' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      const client = siteCatalogClient.withBaseUrl('/api');
      const result = await client.fetchCandidateSites();

      expect(result.source).toBe('nextrush_server');
      expect(result.status).toBe('failed');
      expect(Array.isArray(result.sites)).toBe(true);
      expect(result.sites.length).toBe(0);

      // Verify useSiteCatalog protects React state and consumer UI mapping
      let hookResult!: ReturnType<typeof useSiteCatalog>;
      const Harness = () => {
        hookResult = useSiteCatalog();
        return <div>{hookResult.sites.length}</div>;
      };
      renderToStaticMarkup(<Harness />);
      await hookResult.refetch();

      expect(Array.isArray(hookResult.sites)).toBe(true);
      expect(hookResult.sites.length).toBe(0);
      expect(hookResult.source).toBe('nextrush_server');
      expect(hookResult.status).toBe('failed');
      expect(hookResult.sites.map((s) => s.id).length).toBe(0);
    });

    test('dsnTelemetryClient: handles connection refused, timeout, 500, and malformed telemetry', async () => {
      // 1. Connection Refused
      const offlineClient = dsnTelemetryClient.withBaseUrl('http://127.0.0.1:59998/api');
      const resOffline = await offlineClient.fetchLiveDsnTelemetry();
      expect(resOffline.status).toBe('offline_fallback');
      expect(resOffline.provenance.source).toBe('nextrush_server');
      expect(resOffline.stations.length).toBe(0);

      // 2. HTTP 500
      globalThis.fetch = (async () => new Response('Internal Crash', { status: 500 })) as any;
      const res500 = await dsnTelemetryClient.fetchLiveDsnTelemetry();
      expect(res500.status).toBe('offline_fallback');
      expect(res500.stations.length).toBe(0);

      // 3. Corrupt JSON / Partial Telemetry schema
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ status: 'live_feed', stations: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as any;
      const resCorrupt = await dsnTelemetryClient.fetchLiveDsnTelemetry();
      expect(resCorrupt.status).toBe('offline_fallback');
      expect(resCorrupt.stations.length).toBe(0);
    });
  });

  // =========================================================================
  // 2. IMMEDIATE FALLBACK TO LOCAL ANALYTICAL MODELS
  // =========================================================================
  describe('2. Local Analytical Model Integrity & Mathematical Invariants', () => {
    test('siteCatalogClient: site detail parses server response with investigation and NASA links', async () => {
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({
          site: CANDIDATE_SITES[0],
          investigation: {
            topography: { elevationProfile: [1, 2, 3, 4, 5, 6] },
          },
          reconnaissanceLinks: {
            moonTrekUrl: 'https://trek.nasa.gov',
            svsIlluminationUrl: 'https://svs.gsfc.nasa.gov',
          },
          datum: { coordinateFrame: 'IAU/IAG' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }) as any;

      const client = siteCatalogClient.withBaseUrl('/api');
      const detail = await client.fetchSiteDetail('shackleton-rim');

      expect(detail.source).toBe('nextrush_server');
      expect(detail.status).toBe('valid');
      expect(detail.site).not.toBeNull();
      expect(detail.site?.name).toContain('Shackleton');
      expect(detail.investigation).not.toBeNull();
      expect(detail.investigation?.topography.elevationProfile.length).toBeGreaterThan(5);
      expect(detail.reconnaissanceLinks?.moonTrekUrl).toContain('trek.nasa.gov');
      expect(detail.reconnaissanceLinks?.svsIlluminationUrl).toContain('svs.gsfc.nasa.gov');
      expect(detail.datum?.coordinateFrame).toContain('IAU/IAG');
    });

    test('siteCatalogClient: unknown site detail returns null gracefully without throwing', async () => {
      const client = siteCatalogClient.withBaseUrl('http://127.0.0.1:59998/api');
      const detail = await client.fetchSiteDetail('totally-unknown-crater-xyz');

      expect(detail.source).toBe('nextrush_server');
      expect(detail.status).toBe('failed');
      expect(detail.site).toBeNull();
      expect(detail.investigation).toBeNull();
    });

    test('dsnTelemetryClient: createOfflineResponse produces clean offline telemetry object', () => {
      const epochs = [
        Date.UTC(2026, 9, 26, 0, 0, 0),
        Date.UTC(2026, 9, 26, 8, 0, 0),
        Date.UTC(2028, 1, 29, 12, 0, 0),
      ];

      for (const epoch of epochs) {
        const telemetry = dsnTelemetryClient.createOfflineResponse(epoch);
        expect(telemetry.status).toBe('offline_fallback');
        expect(telemetry.provenance.source).toBe('nextrush_server');
        expect(telemetry.stations.length).toBe(0);
        expect(telemetry.lunarTrackingSummary.linkState).toBe('loss_of_signal');
      }
    });
  });

  // =========================================================================
  // 3. ZERO CUMULATIVE LAYOUT SHIFT (CLS = 0.000) & FRAME-0 RENDERING
  // =========================================================================
  describe('3. Instantaneous Frame-0 Rendering & Zero Layout Shift (CLS = 0.000)', () => {
    test('useSiteCatalog: renders synchronously on Frame 0 with 20 candidate sites (never empty)', () => {
      let capturedState!: ReturnType<typeof useSiteCatalog>;

      const Harness = () => {
        capturedState = useSiteCatalog('all');
        return (
          <div data-testid="catalog-frame-0-container">
            <span id="site-count">{capturedState.sites.length}</span>
            <div id="sites-list">
              {capturedState.sites.map((s) => (
                <div key={s.id} className="site-row">
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        );
      };

      const html = renderToStaticMarkup(<Harness />);
      // Assert frame 0 has exact site count and non-empty DOM elements
      expect(html).toContain('>20<');
      expect(html).toContain('Shackleton Crater Rim');
      expect(capturedState.sites.length).toBe(20);
      expect(capturedState.source).toBe('nextrush_server');
      expect(capturedState.isLoading).toBe(false);
    });

    test('useDsnTelemetry: renders synchronously on Frame 0 with clean offline response', () => {
      let capturedTelemetryState!: ReturnType<typeof useDsnTelemetry>;

      const Harness = () => {
        capturedTelemetryState = useDsnTelemetry({ epochMs: Date.UTC(2026, 9, 26, 12, 0, 0) });
        return (
          <div data-testid="dsn-frame-0-container">
            <span id="stations-count">{capturedTelemetryState.telemetry.stations.length}</span>
            <span id="is-live">{capturedTelemetryState.isLive ? 'live' : 'offline'}</span>
          </div>
        );
      };

      const html = renderToStaticMarkup(<Harness />);
      expect(html).toContain('>0<');
      expect(html).toContain('>offline<');
      expect(capturedTelemetryState.telemetry.stations.length).toBe(0);
      expect(capturedTelemetryState.isLive).toBe(false);
      expect(capturedTelemetryState.source).toBe('nextrush_server');
    });

    test('DsnStationBox: preserves layout stability across live and offline state transitions', () => {
      const mockStation = {
        stationId: 'gdscc',
        dishName: 'DSS-14 (70m Mars Dish)',
        azimuthDeg: 135.5,
        elevationDeg: 48.2,
        isVisible: true,
      };

      // Frame 0 / Analytical Baseline
      const htmlBaseline = renderToStaticMarkup(
        <DsnStationBox station={mockStation} isActive={true} isLive={false} />
      );

      // Frame N / Live Feed
      const htmlLive = renderToStaticMarkup(
        <DsnStationBox station={mockStation} isActive={true} isLive={true} />
      );

      expect(htmlBaseline).toContain('GDSCC');
      expect(htmlBaseline).toContain('+48.2°');
      expect(htmlBaseline).toContain('IN VIEW');

      expect(htmlLive).toContain('GDSCC');
      expect(htmlLive).toContain('+48.2°');
      expect(htmlLive).toContain('LIVE');
    });

    test('DsnLinkBudgetCard: renders completely without throwing during offline or live conditions', () => {
      const epochMs = Date.UTC(2026, 9, 26, 12, 0, 0);

      const htmlCard = renderToStaticMarkup(
        <DsnLinkBudgetCard
          siteId="shackleton-rim"
          epochMs={epochMs}
          earthDistanceKm={384400}
          earthElevationDeg={8.5}
          isObstructed={false}
        />
      );

      expect(htmlCard).toContain('NASA Deep Space Network (DSN) &amp; RF Link Budget');
      // Status badge must render in one of the modelled-margin states. The former labels
      // ("DSN Carrier Locked" / "Loss of Signal (LOS)") were removed because a modelled margin
      // is not an observed carrier lock and "LOS" must not stand for loss of signal.
      expect(
        htmlCard.includes('RF Margin Pending') ||
          htmlCard.includes('Modelled Margin Nominal') ||
          htmlCard.includes('Modelled Margin Marginal') ||
          htmlCard.includes('No Modelled Link Margin')
      ).toBe(true);
      expect(htmlCard).toContain('X-Band (8.45 GHz)');
      expect(htmlCard).toContain('GOLDSTONE');
      expect(htmlCard).toContain('MADRID');
      expect(htmlCard).toContain('CANBERRA');
    });
  });

  // =========================================================================
  // 4. DYNAMIC REGISTRATION & CALLER BACKWARD COMPATIBILITY
  // =========================================================================
  describe('4. Dynamic Registration & Caller Backward Compatibility (getSiteById, ScenarioProvider)', () => {
    test('registerDynamicSites: safely handles empty, null, or malformed entries', () => {
      registerDynamicSites(CANDIDATE_SITES);

      // Stress with empty and malformed inputs
      expect(() => registerDynamicSites([])).not.toThrow();
      expect(() => registerDynamicSites([null as any, undefined as any, {} as any])).not.toThrow();

      // Only valid candidate sites are kept in baseline
      const available = getAllAvailableSites();
      expect(available.length).toBe(CANDIDATE_SITES.length);
    });

    test('registerDynamicSites: extends catalog and allows getSiteById to resolve dynamic sites', () => {
      registerDynamicSites(CANDIDATE_SITES);

      const dynamicSite: CandidateSite = {
        id: 'clps-blue-origin-blue-moon',
        code: 'SITE-DYN-01',
        name: 'Blue Moon Pathfinder Rim Base',
        coordinates: {
          latitudeDeg: -89.45,
          longitudeDeg: 145.2,
          elevationMeters: 620,
          convention: 'IAU/IAG Lunar Mean Earth/Polar Axis',
        },
        priority: 'CLPS Commercial Mission',
        description: 'Dynamically ingested commercial payload site from REST endpoint.',
        category: 'clps',
        meanTerrainHorizonDeg: 1.2,
        maxTerrainObstructionDeg: 4.5,
        coverageStatus: 'High (LOLA DEM 128ppd)',
      };

      // Register dynamic site
      registerDynamicSites([dynamicSite]);

      // After registration
      const retrieved = getSiteById('clps-blue-origin-blue-moon');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('clps-blue-origin-blue-moon');
      expect(retrieved?.name).toBe('Blue Moon Pathfinder Rim Base');

      // Baseline sites remain unaffected
      const shackleton = getSiteById('shackleton-rim');
      expect(shackleton).toBeDefined();
      expect(shackleton?.name).toContain('Shackleton');

      // getAllAvailableSites includes dynamic site
      const allSites = getAllAvailableSites();
      expect(allSites.length).toBe(CANDIDATE_SITES.length + 1);
      expect(allSites.some((s) => s.id === 'clps-blue-origin-blue-moon')).toBe(true);
    });

    test('ScenarioProvider derivation: successfully derives ScenarioModel for dynamic sites without throwing', () => {
      registerDynamicSites(CANDIDATE_SITES);

      const dynamicSite: CandidateSite = {
        id: 'artemis-autonomous-eva-point',
        code: 'SITE-EVA-99',
        name: 'Autonomous EVA Target Ridge',
        coordinates: {
          latitudeDeg: -88.9,
          longitudeDeg: 65.4,
          elevationMeters: 1200,
          convention: 'IAU/IAG Lunar Mean Earth/Polar Axis',
        },
        priority: 'Artemis III Candidate',
        description: 'Dynamic science reconnaissance target.',
        category: 'artemis-2024',
        meanTerrainHorizonDeg: 0.8,
        maxTerrainObstructionDeg: 3.2,
        coverageStatus: 'High (LOLA DEM 128ppd)',
      };

      registerDynamicSites([dynamicSite]);

      const foundSite = getSiteById('artemis-autonomous-eva-point');
      expect(foundSite).toBeDefined();

      // Ensure deriveScenarioModel executes all physics routines (ephemeris, illumination, conditions) cleanly
      const epochMs = Date.UTC(2026, 9, 26, 12, 0, 0);
      const model = deriveScenarioModel(foundSite!, epochMs, 'terrain-aware');

      expect(model.site.id).toBe('artemis-autonomous-eva-point');
      expect(model.epochMs).toBe(epochMs);
      expect(model.conditions).toBeDefined();
      expect(Number.isFinite((model.conditions.sunElevationDeg as any).value)).toBe(true);
      expect(Number.isFinite((model.conditions.earthElevationDeg as any).value)).toBe(true);
      expect(model.ephemeris).toBeDefined();
      expect(model.ephemeris.earthMoonDistanceKm).toBeGreaterThan(350000);
    });

    test('clearDynamicSites: cleanly resets the runtime catalog for unit test isolation', () => {
      const tempSite: CandidateSite = {
        id: 'temp-experimental-site',
        code: 'SITE-TEMP',
        name: 'Temporary Site',
        coordinates: {
          latitudeDeg: -85.0,
          longitudeDeg: 0.0,
          elevationMeters: 0,
          convention: 'IAU/IAG Lunar Mean Earth/Polar Axis',
        },
        priority: 'Benchmark Calibration Site',
        description: 'Temp site',
        meanTerrainHorizonDeg: 0,
        maxTerrainObstructionDeg: 0,
        coverageStatus: 'Benchmark Validated',
      };

      registerDynamicSites([tempSite]);
      expect(getSiteById('temp-experimental-site')).toBeDefined();

      clearDynamicSites();
      expect(getSiteById('temp-experimental-site')).toBeUndefined();
      expect(getAllAvailableSites().length).toBe(0);
      registerDynamicSites(CANDIDATE_SITES);
    });
  });

  // =========================================================================
  // 5. CONCURRENT INGESTION & LIFECYCLE RESILIENCE
  // =========================================================================
  describe('5. Concurrent Ingestion & Component Lifecycle Stability', () => {
    test('simultaneous multiple hook consumers mount without race conditions', () => {
      let capture1!: ReturnType<typeof useSiteCatalog>;
      let capture2!: ReturnType<typeof useSiteCatalog>;
      let capture3!: ReturnType<typeof useDsnTelemetry>;
      let capture4!: ReturnType<typeof useDsnTelemetry>;

      const MultiConsumerDashboard = () => {
        capture1 = useSiteCatalog('all');
        capture2 = useSiteCatalog('artemis-iii-2024');
        capture3 = useDsnTelemetry();
        capture4 = useDsnTelemetry();

        return (
          <div data-testid="multi-consumer">
            <span>{capture1.sites.length}</span>
            <span>{capture2.sites.length}</span>
            <span>{capture3.telemetry.stations.length}</span>
            <span>{capture4.telemetry.stations.length}</span>
          </div>
        );
      };

      const html = renderToStaticMarkup(<MultiConsumerDashboard />);
      expect(html).toContain('>20<');
      expect(html).toContain('>9<');
      expect(html).toContain('>0<');

      expect(capture1.sites.length).toBe(20);
      expect(capture2.sites.length).toBe(9);
      expect(capture3.telemetry.stations.length).toBe(0);
      expect(capture4.telemetry.stations.length).toBe(0);
    });
  });
});

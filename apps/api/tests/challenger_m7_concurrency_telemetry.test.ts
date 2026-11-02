/**
 * Milestone M7 Adversarial Challenger: CAS Concurrency, Telemetry Integrity & Markdown Sanitization
 * Governed by AGENTS.md § 4, § 5, and M7 Dispatch instructions.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import { sanitizeMarkdownText } from '../src/services/dossier/dossierMarkdownFormatter';

function createDispatcher() {
  const app = createServerApp();
  const rawHandler = createHandler(app);
  return async (path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) => {
    const url = `http://localhost:3001${path}`;
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined && method !== 'GET') {
      init.body = JSON.stringify(body);
    }
    const req = new Request(url, init);
    const res = await (rawHandler as any)(req, {} as any);
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
  };
}

const dispatch = createDispatcher();

const CURATED_HORIZONS_PATH = join(process.cwd(), 'data/curated-horizons.json');
const curatedHorizons = JSON.parse(readFileSync(CURATED_HORIZONS_PATH, 'utf-8'));

describe('Milestone M7 Challenger 2: Concurrency, Telemetry Integrity & Sanitization', () => {
  // --------------------------------------------------------------------------
  // 1. CAS Cache Concurrency Stress
  // --------------------------------------------------------------------------
  describe('1. CAS Cache Concurrency & Determinism', () => {
    it('executes 30 simultaneous concurrent requests without race condition corruption', async () => {
      const payload = {
        targetName: 'Amundsen Rim Beta',
        siteId: 'amundsen-rim',
        latitudeDeg: -89.7,
        longitudeDeg: 82.0,
        elevationKm: 0.5,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-11-05T00:00:00.000Z',
        observerMastHeightM: 2.0,
        launchSlipOffsetDays: 0,
      };

      // Bombard endpoint with 30 simultaneous requests
      const promises = Array.from({ length: 30 }, () =>
        dispatch('/api/dossier/generate', 'POST', payload),
      );

      const responses = await Promise.all(promises);

      // All 30 requests must succeed with HTTP 200
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        if (res.status !== 200) {
          console.error(`Request ${i} failed with ${res.status}:`, JSON.stringify(res.data));
        }
        expect(res.status).toBe(200);
        expect(res.data).toBeDefined();
        expect(res.data.dossier).toBeDefined();
        expect(res.data.dossier.scenario).toBeDefined();
      }

      // Check deterministic calculationId across all responses
      const baselineCalculationId = responses[0].data.dossier.scenario.calculationId;
      expect(typeof baselineCalculationId).toBe('string');
      expect(baselineCalculationId.length).toBe(64); // SHA-256 hex length

      for (const res of responses) {
        expect(res.data.dossier.scenario.calculationId).toBe(baselineCalculationId);
        expect(res.data.dossier.site.name).toBe('Amundsen Rim Beta');
        expect(res.data.dossier.scenario.lolaHorizonProfile.bins).toBe(360);
      }

      // Immediate follow-up batch must ALL return cache hits
      const followUpBatch = await Promise.all(
        Array.from({ length: 10 }, () => dispatch('/api/dossier/generate', 'POST', payload)),
      );

      for (const res of followUpBatch) {
        expect(res.status).toBe(200);
        expect(res.data.dossier.scenario.casCacheHit).toBe(true);
        expect(res.data.dossier.scenario.provenance.cacheStatus).toBe('HIT');
        expect(res.headers.get('X-Cache')).toBe('HIT-MEMORY');
        expect(res.data.dossier.scenario.calculationId).toBe(baselineCalculationId);
      }
    });

    it('returns byte-for-byte deterministic dossiers when queried by calculationId', async () => {
      const initialPayload = {
        targetName: 'Malapert Mountain Peak',
        siteId: 'malapert-massif',
        latitudeDeg: -85.99,
        longitudeDeg: 357.5,
        elevationKm: 5.0,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-11-04T00:00:00.000Z',
        observerMastHeightM: 2.0,
      };

      const res1 = await dispatch('/api/dossier/generate', 'POST', initialPayload);
      expect(res1.status).toBe(200);
      const calcId = res1.data.dossier.scenario.calculationId;

      // Query by calculationId concurrently 15 times
      const calcPayload = {
        targetName: 'Malapert Mountain Peak',
        calculationId: calcId,
        latitudeDeg: -85.99,
        longitudeDeg: 357.5,
      };

      const concurrentByCalcId = await Promise.all(
        Array.from({ length: 15 }, () => dispatch('/api/dossier/export', 'POST', calcPayload)),
      );

      for (const res of concurrentByCalcId) {
        expect(res.status).toBe(200);
        expect(res.data.dossier.scenario.calculationId).toBe(calcId);
        expect(res.data.dossier.scenario.casCacheHit).toBe(true);
        expect(res.data.dossier.scenario.provenance.cacheStatus).toBe('HIT');
        expect(res.data.dossier.scenario.lolaHorizonProfile).toEqual(
          res1.data.dossier.scenario.lolaHorizonProfile,
        );
        expect(res.data.dossier.scenario.illuminationWindows).toEqual(
          res1.data.dossier.scenario.illuminationWindows,
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Telemetry Integrity: LOLA Profile vs curated-horizons.json
  // --------------------------------------------------------------------------
  describe('2. Telemetry Integrity: LOLA Horizon Profile Verification', () => {
    const testSites = [
      { siteId: 'connecting-ridge', targetName: 'Connecting Ridge', lat: -89.44, lon: 124.5 },
      { siteId: 'de-gerlache-rim-2', targetName: 'De Gerlache Rim 2', lat: -88.71, lon: 291.0 },
      { siteId: 'haworth-rim', targetName: 'Haworth Rim', lat: -87.4, lon: 354.0 },
    ];

    for (const site of testSites) {
      it(`verifies LOLA horizon metrics for site '${site.siteId}' match curated-horizons.json ground truth`, async () => {
        const payload = {
          targetName: site.targetName,
          siteId: site.siteId,
          latitudeDeg: site.lat,
          longitudeDeg: site.lon,
          observerMastHeightM: 2.0,
          startUtc: '2026-11-01T00:00:00.000Z',
          stopUtc: '2026-11-03T00:00:00.000Z',
        };

        const res = await dispatch('/api/dossier/generate', 'POST', payload);
        expect(res.status).toBe(200);
        const lola = res.data.dossier.scenario.lolaHorizonProfile;
        expect(lola.bins).toBe(360);
        expect(lola.binStatus).toBe('valid');

        // Extract raw profile from curated-horizons.json
        const rawProfile = curatedHorizons[site.siteId]?.profiles?.['2.0'];
        expect(rawProfile).toBeDefined();
        const rawNominal = rawProfile.elevationNominalDeg;
        expect(rawNominal.length).toBe(360);

        const expectedMin = Math.min(...rawNominal);
        const expectedMax = Math.max(...rawNominal);
        const expectedMean = rawNominal.reduce((a: number, b: number) => a + b, 0) / rawNominal.length;

        // Verify min, max, mean match within 0.01 precision (dossier rounds to 2 decimal places)
        expect(Math.abs(lola.minElevationDeg - expectedMin)).toBeLessThanOrEqual(0.01);
        expect(Math.abs(lola.maxElevationDeg - expectedMax)).toBeLessThanOrEqual(0.01);
        expect(Math.abs(lola.meanElevationDeg - expectedMean)).toBeLessThanOrEqual(0.01);
      });
    }
  });

  // --------------------------------------------------------------------------
  // 3. Telemetry Integrity: DEM Whiskers & Continuous Daylight
  // --------------------------------------------------------------------------
  describe('3. Telemetry Integrity: DEM Whiskers & Continuous Daylight Metrics', () => {
    it('verifies chronological monotonicity tLow <= tNominal <= tHigh for all event whiskers', async () => {
      const payload = {
        targetName: 'Shackleton Connecting Ridge',
        siteId: 'shackleton-connecting-ridge',
        latitudeDeg: -89.44,
        longitudeDeg: 124.5,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-11-15T00:00:00.000Z',
        observerMastHeightM: 2.0,
      };

      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      const whiskers = res.data.dossier.scenario.eventWhiskers;
      expect(Array.isArray(whiskers)).toBe(true);

      for (const w of whiskers) {
        const tLow = new Date(w.tLowUtc).getTime();
        const tNom = new Date(w.nominalUtc).getTime();
        const tHigh = new Date(w.tHighUtc).getTime();

        // Monotonic physical condition
        expect(tLow).toBeLessThanOrEqual(tNom);
        expect(tNom).toBeLessThanOrEqual(tHigh);

        // Whisker span hours must be positive and match interval span
        expect(w.whiskerSpanHours).toBeGreaterThan(0);
        const actualSpanHours = (tHigh - tLow) / 3600000;
        expect(Math.abs(w.whiskerSpanHours - actualSpanHours)).toBeLessThanOrEqual(0.05);

        // Sensitivity rating classification check
        if (w.whiskerSpanHours < 2.0) {
          expect(w.sensitivityRating).toBe('LOW');
        } else if (w.whiskerSpanHours < 6.0) {
          expect(w.sensitivityRating).toBe('MODERATE');
        } else {
          expect(w.sensitivityRating).toBe('HIGH');
        }
      }
    });

    it('verifies continuous daylight hours derive strictly from M4 event-splitting solver', async () => {
      const payload = {
        targetName: 'Shackleton Connecting Ridge',
        siteId: 'shackleton-connecting-ridge',
        latitudeDeg: -89.44,
        longitudeDeg: 124.5,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-11-10T00:00:00.000Z',
        observerMastHeightM: 2.0,
      };

      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      const dossier = res.data.dossier;

      // 1. dossier.illumination.continuousSunlightHours must equal scenario illumination maxContinuousSunlightHours
      expect(dossier.illumination.continuousSunlightHours).toBe(
        Number(dossier.scenario.illuminationWindows.maxContinuousSunlightHours.toFixed(1)),
      );

      // 2. Must equal metrics.longestContinuousSunlitWindowHours
      expect(dossier.illumination.continuousSunlightHours).toBe(
        Number(dossier.scenario.metrics.longestContinuousSunlitWindowHours.toFixed(1)),
      );

      // 3. Must be <= total evaluated hours
      expect(dossier.illumination.continuousSunlightHours).toBeLessThanOrEqual(
        dossier.scenario.totalEvaluationHours,
      );

      // 4. Cumulative sunlight must be >= continuous sunlight window
      expect(dossier.scenario.illuminationWindows.totalIlluminatedHours).toBeGreaterThanOrEqual(
        dossier.scenario.illuminationWindows.maxContinuousSunlightHours,
      );
    });
  });

  // --------------------------------------------------------------------------
  // 4. Markdown Injection & XSS Sanitization Stress
  // --------------------------------------------------------------------------
  describe('4. Markdown Injection & XSS Sanitization Stress', () => {
    it('sanitizes HTML injection vectors in targetName and nested destination names', async () => {
      const payload = {
        targetName: '<script>alert("XSS")</script><img src=x onerror=alert(1)><svg onload="alert(1)">Peak</svg>',
        latitudeDeg: -89.44,
        longitudeDeg: 124.5,
      };

      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      const md = res.data.markdown;

      // Script/tag injection must be neutralized into HTML entities
      expect(md.includes('<script>')).toBe(false);
      expect(md.includes('</script>')).toBe(false);
      expect(md.includes('<img')).toBe(false);
      expect(md.includes('<svg')).toBe(false);
      expect(md.includes('</svg>')).toBe(false);
      expect(md.includes('&lt;script&gt;')).toBe(true);
      expect(md.includes('&lt;img')).toBe(true);
      expect(md.includes('&lt;svg')).toBe(true);
    });

    it('sanitizes markdown table pipe breaks to prevent table structure injection', async () => {
      const payload = {
        targetName: 'Ridge | INJECTED CELL | ATTACK |',
        latitudeDeg: -89.44,
        longitudeDeg: 124.5,
      };

      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      const md = res.data.markdown;

      // Pipe characters must be escaped into &#124; to prevent table column desynchronization
      expect(md.includes('Ridge &#124; INJECTED CELL &#124; ATTACK &#124;')).toBe(true);
    });

    it('neutralizes markdown links, backticks, and newlines in user-supplied text (resolves VULN-M7-01)', async () => {
      const payload = {
        targetName: '[Emergency Warning](javascript:alert(1))\n\n## INJECTED',
        latitudeDeg: -89.44,
        longitudeDeg: 124.5,
      };

      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      // Raw markdown link structure must NOT be preserved
      expect(res.data.markdown.includes('[Emergency Warning](')).toBe(false);
      expect(res.data.markdown.includes('&#91;Emergency Warning&#93;(javascript:alert(1))')).toBe(true);
      // Newlines must be replaced with spaces to prevent structural header breakout
      expect(res.data.markdown.includes('\n\n## INJECTED')).toBe(false);
    });
  });
});

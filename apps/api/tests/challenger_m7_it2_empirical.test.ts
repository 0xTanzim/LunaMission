/**
 * Empirical Adversarial Challenger: M7 Iteration 2
 * Markdown Injection Sanitization, CAS Concurrency, and Telemetry Ground-Truth Verification
 * Governed by AGENTS.md § 4, § 5, and M7 Dispatch instructions.
 */

import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';

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

describe('Milestone M7 Iteration 2: Empirical Challenger Deep Stress Suite', () => {
  // ==========================================================================
  // 1. Deep Markdown Injection & XSS Sanitization Stress
  // ==========================================================================
  describe('1. Adversarial Markdown Injection Sanitization', () => {
    it('neutralizes all markdown link variations without parsing as hyperlinks', async () => {
      const maliciousPayloads = [
        '[Malicious](https://attacker.example.com)',
        '[XSS](javascript:alert(document.cookie))',
        '[Data URI](data:text/html,<script>alert(1)</script>)',
        '![Exfiltrate](https://attacker.example.com/token.png)',
        'Reference Link [Click][1]\n\n[1]: https://attacker.example.com',
        '[![Nested](https://img.png)](https://evil.com)',
      ];

      for (const payload of maliciousPayloads) {
        const res = await dispatch('/api/dossier/generate', 'POST', {
          targetName: payload,
          latitudeDeg: -89.44,
          longitudeDeg: 124.5,
        });

        expect(res.status).toBe(200);
        const md = res.data.markdown;

        // No unescaped brackets that allow markdown link or image syntax
        expect(md.includes('[Malicious](')).toBe(false);
        expect(md.includes('[XSS](')).toBe(false);
        expect(md.includes('[Data URI](')).toBe(false);
        expect(md.includes('![Exfiltrate](')).toBe(false);
        expect(md.includes('![Nested](')).toBe(false);

        // Brackets must be transformed to HTML numeric entities
        expect(md.includes('&#91;')).toBe(true);
        expect(md.includes('&#93;')).toBe(true);
      }
    });

    it('neutralizes backticks to prevent inline and block code breakout', async () => {
      const payloads = [
        '`rm -rf /`',
        '``inline double backtick``',
        '```bash\necho "INJECTED_SHELL"\n```',
        '````markdown\n# FORGED\n````',
      ];

      for (const payload of payloads) {
        const res = await dispatch('/api/dossier/generate', 'POST', {
          targetName: `Target with ${payload}`,
          latitudeDeg: -89.44,
          longitudeDeg: 124.5,
        });

        expect(res.status).toBe(200);
        const md = res.data.markdown;

        // The raw backtick character must not appear in the sanitized user input
        expect(md.includes('`rm -rf')).toBe(false);
        expect(md.includes('```bash')).toBe(false);
        expect(md.includes('````markdown')).toBe(false);
        // HTML entity &#96; must be present instead
        expect(md.includes('&#96;')).toBe(true);
      }
    });

    it('neutralizes newline characters to prevent header and table structure forging', async () => {
      const forgedHeaderPayload = 'Ridge Base\r\n# FORGED TOP LEVEL HEADER\n## SUBHEADER\n\n| Attack | Table |';
      const res = await dispatch('/api/dossier/generate', 'POST', {
        targetName: forgedHeaderPayload,
        latitudeDeg: -89.44,
        longitudeDeg: 124.5,
      });

      expect(res.status).toBe(200);
      const md = res.data.markdown;

      // Newlines must be collapsed into spaces; no standalone injected header lines allowed
      expect(md.includes('\n# FORGED TOP LEVEL HEADER')).toBe(false);
      expect(md.includes('\r\n# FORGED TOP LEVEL HEADER')).toBe(false);
      expect(md.includes('\n## SUBHEADER')).toBe(false);

      // Pipes must be escaped to prevent corrupting markdown tables
      expect(md.includes('&#124; Attack &#124; Table &#124;')).toBe(true);
    });

    it('neutralizes HTML and script tags with entity escaping', async () => {
      const htmlPayload = '<script>evil()</script><iframe src="https://evil.com"></iframe><svg/onload=alert(1)>';
      const res = await dispatch('/api/dossier/generate', 'POST', {
        targetName: htmlPayload,
        latitudeDeg: -89.44,
        longitudeDeg: 124.5,
      });

      expect(res.status).toBe(200);
      const md = res.data.markdown;

      expect(md.includes('<script>')).toBe(false);
      expect(md.includes('<iframe>')).toBe(false);
      expect(md.includes('<svg')).toBe(false);
      expect(md.includes('&lt;script&gt;')).toBe(true);
      expect(md.includes('&lt;iframe')).toBe(true);
      expect(md.includes('&lt;svg')).toBe(true);
    });
  });

  // ==========================================================================
  // 2. CAS Cache Concurrency & Cross-Site Contamination Stress
  // ==========================================================================
  describe('2. Multi-Site CAS Cache Concurrency Stress', () => {
    it('executes 50 concurrent requests across 5 distinct sites without race conditions or cross-contamination', async () => {
      const siteConfigs = [
        { siteId: 'shackleton-rim', name: 'Shackleton Crater Rim', lat: -89.9, lon: 0.0 },
        { siteId: 'connecting-ridge', name: 'Connecting Ridge', lat: -89.44, lon: 222.5 },
        { siteId: 'amundsen-rim', name: 'Amundsen Rim', lat: -89.7, lon: 82.0 },
        { siteId: 'haworth-rim', name: 'Haworth Rim', lat: -87.4, lon: 354.0 },
        { siteId: undefined, name: 'Custom Polar Target', lat: -85.5, lon: 45.0 },
      ];

      // Warm up cache for each site first to ensure ephemeris is local
      for (const config of siteConfigs) {
        const warmupBody: Record<string, any> = {
          targetName: `${config.name} Warmup`,
          latitudeDeg: config.lat,
          longitudeDeg: config.lon,
          observerMastHeightM: 2.0,
          startUtc: '2026-11-01T00:00:00.000Z',
          stopUtc: '2026-11-04T00:00:00.000Z',
        };
        if (config.siteId) {
          warmupBody.siteId = config.siteId;
        }
        await dispatch('/api/dossier/generate', 'POST', warmupBody);
      }

      // Build 50 requests (10 per site configuration)
      const tasks: Array<{ siteConfig: typeof siteConfigs[0]; index: number; promise: Promise<any> }> = [];

      for (let i = 0; i < 50; i++) {
        const config = siteConfigs[i % siteConfigs.length];
        const body: Record<string, any> = {
          targetName: `${config.name} Run ${i}`,
          latitudeDeg: config.lat,
          longitudeDeg: config.lon,
          observerMastHeightM: 2.0,
          startUtc: '2026-11-01T00:00:00.000Z',
          stopUtc: '2026-11-04T00:00:00.000Z',
        };
        if (config.siteId) {
          body.siteId = config.siteId;
        }
        const promise = dispatch('/api/dossier/generate', 'POST', body);
        tasks.push({ siteConfig: config, index: i, promise });
      }

      const results = await Promise.all(tasks.map((t) => t.promise));

      // Map results back to configurations and verify integrity
      const calcIdsBySite = new Map<string, Set<string>>();

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        const config = tasks[i].siteConfig;

        if (res.status !== 200) {
          console.error(`Request ${i} for site ${config.siteId ?? 'custom'} failed with status ${res.status}:`, JSON.stringify(res.data));
        }
        expect(res.status).toBe(200);
        expect(res.data.dossier).toBeDefined();

        const dossier = res.data.dossier;
        expect(dossier.site.latitudeDeg).toBe(config.lat);
        expect(dossier.site.longitudeDeg).toBe(config.lon);

        if (config.siteId) {
          expect(dossier.scenario).toBeDefined();
          const calcId = dossier.scenario.calculationId;
          expect(calcId).toBeDefined();
          expect(calcId.length).toBe(64);

          if (!calcIdsBySite.has(config.siteId)) {
            calcIdsBySite.set(config.siteId, new Set());
          }
          calcIdsBySite.get(config.siteId)!.add(calcId);
        }
      }

      // Each registered site must have EXACTLY 1 unique calculationId across all 10 concurrent calls
      for (const [siteId, idSet] of calcIdsBySite.entries()) {
        expect(idSet.size).toBe(1);
      }

      // The calculationIds between different sites must be completely distinct
      const allRegisteredCalcIds = Array.from(calcIdsBySite.values()).map((set) => Array.from(set)[0]);
      const uniqueCalcIds = new Set(allRegisteredCalcIds);
      expect(uniqueCalcIds.size).toBe(allRegisteredCalcIds.length);
    });
  });

  // ==========================================================================
  // 3. Telemetry Ground-Truth & Monotonicity Verification
  // ==========================================================================
  describe('3. Telemetry Ground Truth & Solver Integrity', () => {
    const candidateSites = [
      'shackleton-rim',
      'connecting-ridge',
      'de-gerlache-rim-2',
      'haworth-rim',
      'malapert-massif',
      'amundsen-rim',
    ];

    for (const siteId of candidateSites) {
      it(`verifies telemetry metrics for '${siteId}' match curated-horizons ground truth`, async () => {
        const rawProfile = curatedHorizons[siteId]?.profiles?.['2.0'];
        expect(rawProfile).toBeDefined();

        const res = await dispatch('/api/dossier/generate', 'POST', {
          targetName: `Verification for ${siteId}`,
          siteId,
          latitudeDeg: -89.0,
          longitudeDeg: 0.0,
          observerMastHeightM: 2.0,
          startUtc: '2026-11-01T00:00:00.000Z',
          stopUtc: '2026-11-05T00:00:00.000Z',
        });

        expect(res.status).toBe(200);
        const lola = res.data.dossier.scenario.lolaHorizonProfile;
        expect(lola.bins).toBe(360);
        expect(lola.binStatus).toBe('valid');

        const rawNominal: number[] = rawProfile.elevationNominalDeg;
        const expectedMin = Math.min(...rawNominal);
        const expectedMax = Math.max(...rawNominal);
        const expectedMean = rawNominal.reduce((a, b) => a + b, 0) / rawNominal.length;

        expect(Math.abs(lola.minElevationDeg - expectedMin)).toBeLessThanOrEqual(0.01);
        expect(Math.abs(lola.maxElevationDeg - expectedMax)).toBeLessThanOrEqual(0.01);
        expect(Math.abs(lola.meanElevationDeg - expectedMean)).toBeLessThanOrEqual(0.01);
      });
    }

    it('verifies strict chronological order of DEM whiskers and positive spans', async () => {
      const res = await dispatch('/api/dossier/generate', 'POST', {
        targetName: 'Malapert Massif Peak',
        siteId: 'malapert-massif',
        latitudeDeg: -85.99,
        longitudeDeg: 357.5,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-11-10T00:00:00.000Z',
        observerMastHeightM: 2.0,
      });

      expect(res.status).toBe(200);
      const whiskers = res.data.dossier.scenario.eventWhiskers;
      expect(Array.isArray(whiskers)).toBe(true);

      for (const w of whiskers) {
        const tLow = new Date(w.tLowUtc).getTime();
        const tNom = new Date(w.nominalUtc).getTime();
        const tHigh = new Date(w.tHighUtc).getTime();

        expect(tLow).toBeLessThanOrEqual(tNom);
        expect(tNom).toBeLessThanOrEqual(tHigh);
        expect(w.whiskerSpanHours).toBeGreaterThan(0);
      }
    });
  });
});

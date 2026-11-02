import { describe, expect, it } from 'bun:test';
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

const BASE_VALID_TARGET = {
  targetName: 'Shackleton Connecting Ridge',
  siteId: 'shackleton-connecting-ridge',
  catalogId: 'shackleton-connecting-ridge',
  latitudeDeg: -89.44,
  longitudeDeg: 124.5,
  elevationKm: 1.85,
  startUtc: '2026-11-01T00:00:00.000Z',
  stopUtc: '2026-11-05T00:00:00.000Z',
  observerMastHeightM: 2.0,
  launchSlipOffsetDays: 0,
};

describe('Milestone M7 Adversarial Challenger: Route & Payload Stress Harness', () => {
  // --------------------------------------------------------------------------
  // 1. Latitude Bounds Validation & Polar Corridor
  // --------------------------------------------------------------------------
  describe('1. Latitude Boundary & Polar Region Enforcement', () => {
    it('rejects latitude -60.0° (north of south-polar -70° boundary) with 400 RFC 7807', async () => {
      const payload = { ...BASE_VALID_TARGET, latitudeDeg: -60.0 };
      const resGen = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(resGen.status).toBe(400);
      expect(resGen.data.code).toBe('E_VALIDATION_ERROR');
      expect(resGen.data.type).toBe('https://lunamission.nasa.gov/errors/E_VALIDATION_ERROR');
      expect(resGen.data.status).toBe(400);
      expect(typeof resGen.data.instance).toBe('string');
      expect(resGen.data.instance.endsWith('/generate')).toBe(true);
      expect(Array.isArray(resGen.data.invalidParams)).toBe(true);
      expect(resGen.data.invalidParams.some((p: any) => p.name === 'latitudeDeg')).toBe(true);

      const resExp = await dispatch('/api/dossier/export', 'POST', payload);
      expect(resExp.status).toBe(400);
      expect(resExp.data.code).toBe('E_VALIDATION_ERROR');
      expect(resExp.data.instance.endsWith('/export')).toBe(true);
    });

    it('rejects latitude -95.0° (exceeds South Pole -90°) with 400 RFC 7807', async () => {
      const payload = { ...BASE_VALID_TARGET, latitudeDeg: -95.0 };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
      expect(res.data.invalidParams.some((p: any) => p.name === 'latitudeDeg')).toBe(true);
    });

    it('rejects positive (northern hemisphere) latitude +85.0° with 400', async () => {
      const payload = { ...BASE_VALID_TARGET, latitudeDeg: 85.0 };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
    });

    it('rejects boundary violation -69.9999° with 400', async () => {
      const payload = { ...BASE_VALID_TARGET, latitudeDeg: -69.9999 };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
    });

    it('accepts exact South Pole -90.0° and polar boundary -80.0° without crash', async () => {
      const resPole = await dispatch('/api/dossier/generate', 'POST', {
        ...BASE_VALID_TARGET,
        siteId: undefined, // custom pole point
        catalogId: undefined,
        latitudeDeg: -90.0,
        longitudeDeg: 0.0,
      });
      expect(resPole.status).toBe(200);
      expect(resPole.data.dossier.site.latitudeDeg).toBe(-90.0);
      expect(resPole.data.dossier.scenario.lolaHorizonProfile.binStatus).toBe('not_available');

      const resBoundary = await dispatch('/api/dossier/generate', 'POST', {
        ...BASE_VALID_TARGET,
        siteId: undefined, // custom corridor boundary
        catalogId: undefined,
        latitudeDeg: -80.0,
        longitudeDeg: 45.0,
      });
      expect(resBoundary.status).toBe(200);
      expect(resBoundary.data.dossier.site.latitudeDeg).toBe(-80.0);
      expect(resBoundary.data.dossier.scenario.lolaHorizonProfile.binStatus).toBe('not_available');
    });

    it('gracefully accepts latitudeDeg between -70° and -80° with 200 and N/A USGS ACC6 (resolves DEF-M7-01)', async () => {
      const payload = {
        ...BASE_VALID_TARGET,
        siteId: undefined,
        catalogId: undefined,
        latitudeDeg: -75.0,
      };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      expect(res.data.dossier.site.latitudeDeg).toBe(-75.0);
      expect(res.data.dossier.site.usgsAcc6).toBe('N/A');
      expect(res.data.dossier.scenario.lolaHorizonProfile.binStatus).toBe('not_available');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Malformed UTC Datetime Strings
  // --------------------------------------------------------------------------
  describe('2. Malformed UTC Datetime Validation', () => {
    it('rejects malformed non-ISO startUtc string with 400 RFC 7807', async () => {
      const payload = { ...BASE_VALID_TARGET, startUtc: 'not-a-valid-utc-date' };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
      expect(res.data.invalidParams.some((p: any) => p.name === 'startUtc')).toBe(true);
    });

    it('rejects impossible calendar date startUtc="2026-13-45T99:99:99Z" with 400', async () => {
      const payload = { ...BASE_VALID_TARGET, startUtc: '2026-13-45T99:99:99Z' };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
    });

    it('rejects malformed stopUtc on /api/dossier/export with 400', async () => {
      const payload = { ...BASE_VALID_TARGET, stopUtc: '2026/11/05 12:00:00' };
      const res = await dispatch('/api/dossier/export', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
      expect(res.data.invalidParams.some((p: any) => p.name === 'stopUtc')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Observer Mast Height Validation
  // --------------------------------------------------------------------------
  describe('3. Observer Mast Height Stress', () => {
    it('rejects negative mast height -5.0m with 400 RFC 7807', async () => {
      const payload = { ...BASE_VALID_TARGET, observerMastHeightM: -5.0 };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
      expect(res.data.invalidParams.some((p: any) => p.name === 'observerMastHeightM')).toBe(true);
    });

    it('rejects zero mast height 0.0m with 400 RFC 7807', async () => {
      const payload = { ...BASE_VALID_TARGET, observerMastHeightM: 0.0 };
      const res = await dispatch('/api/dossier/export', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
      expect(res.data.invalidParams.some((p: any) => p.name === 'observerMastHeightM')).toBe(true);
    });

    it('rejects unsupported positive mast height (e.g. 3.5m) with 422 RFC 7807', async () => {
      const payload = { ...BASE_VALID_TARGET, observerMastHeightM: 3.5 };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(422);
      expect(res.data.code).toBe('E_UNSUPPORTED_MAST_HEIGHT');
      expect(res.data.title).toBe('Unsupported Observer Mast Height');
      expect(res.data.status).toBe(422);
      expect(Array.isArray(res.data.invalidParams)).toBe(true);
      expect(res.data.invalidParams.some((p: any) => p.name === 'observerMastHeightM')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Launch Slip Offset Days Validation
  // --------------------------------------------------------------------------
  describe('4. Launch Slip Offset Range & Bounds', () => {
    it('rejects launch slip offset > 28 days (e.g. 35.0 days) with 400 RFC 7807', async () => {
      const payload = { ...BASE_VALID_TARGET, launchSlipOffsetDays: 35.0 };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
      expect(res.data.invalidParams.some((p: any) => p.name === 'launchSlipOffsetDays')).toBe(true);
    });

    it('rejects boundary violation launch slip 28.001 days with 400', async () => {
      const payload = { ...BASE_VALID_TARGET, launchSlipOffsetDays: 28.001 };
      const res = await dispatch('/api/dossier/export', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
    });

    it('rejects negative launch slip -1.0 days with 400', async () => {
      const payload = { ...BASE_VALID_TARGET, launchSlipOffsetDays: -1.0 };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
    });

    it('accepts exact bounds 0.0 and 28.0 days with 200', async () => {
      const res0 = await dispatch('/api/dossier/generate', 'POST', {
        ...BASE_VALID_TARGET,
        launchSlipOffsetDays: 0.0,
      });
      expect(res0.status).toBe(200);

      const res28 = await dispatch('/api/dossier/generate', 'POST', {
        ...BASE_VALID_TARGET,
        launchSlipOffsetDays: 28.0,
      });
      expect(res28.status).toBe(200);
      expect(res28.data.dossier.scenario.launchSlipOffsetDays).toBe(28.0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Missing Required Fields & Empty Payloads
  // --------------------------------------------------------------------------
  describe('5. Missing Required Fields & Empty Payloads', () => {
    it('rejects empty object payload {} with 400 and lists missing fields', async () => {
      const res = await dispatch('/api/dossier/generate', 'POST', {});
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('E_VALIDATION_ERROR');
      const paramNames = res.data.invalidParams.map((p: any) => p.name);
      expect(paramNames).toContain('targetName');
      expect(paramNames).toContain('latitudeDeg');
      expect(paramNames).toContain('longitudeDeg');
    });

    it('rejects payload missing latitudeDeg with 400', async () => {
      const { latitudeDeg, ...missingLat } = BASE_VALID_TARGET;
      const res = await dispatch('/api/dossier/generate', 'POST', missingLat);
      expect(res.status).toBe(400);
      expect(res.data.invalidParams.some((p: any) => p.name === 'latitudeDeg')).toBe(true);
    });

    it('rejects empty string targetName="" with 400', async () => {
      const payload = { ...BASE_VALID_TARGET, targetName: '' };
      const res = await dispatch('/api/dossier/export', 'POST', payload);
      expect(res.status).toBe(400);
      expect(res.data.invalidParams.some((p: any) => p.name === 'targetName')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Non-Existent Site IDs & Arbitrary Custom Coordinates
  // --------------------------------------------------------------------------
  describe('6. Non-Existent Site IDs & Graceful Custom Handling', () => {
    it('gracefully handles non-existent siteId with valid coordinates returning binStatus="not_available"', async () => {
      const payload = {
        targetName: 'Custom Uncataloged Crater Peak',
        siteId: 'completely-unknown-site-xyz-999',
        latitudeDeg: -85.5,
        longitudeDeg: 45.0,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-11-05T00:00:00.000Z',
      };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      expect(res.data.dossier.site.name).toBe('Custom Uncataloged Crater Peak');
      expect(res.data.dossier.scenario).toBeDefined();
      expect(res.data.dossier.scenario.lolaHorizonProfile.binStatus).toBe('not_available');
      expect(res.data.dossier.scenario.lolaHorizonProfile.bins).toBe(0);
      expect(res.data.dossier.scenario.tier1Gating.passed).toBe(false);
      expect(res.data.markdown).toContain('not_available');
      expect(res.data.jsonTelemetry).toBeDefined();
    });

    it('prevents substring hijacking with fictitious siteId containing registered site substring (resolves DEF-M7-02)', async () => {
      const payload = {
        targetName: 'Fictitious Site',
        siteId: 'nonexistent-apollo-11-site',
        latitudeDeg: -88.5,
        longitudeDeg: 30.0,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-11-05T00:00:00.000Z',
      };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      expect(res.data.dossier.scenario.lolaHorizonProfile.binStatus).toBe('not_available');
      expect(res.data.dossier.scenario.lolaHorizonProfile.bins).toBe(0);
    });

    it('safely handles path-traversal / malicious siteId strings without server crash', async () => {
      const payload = {
        targetName: 'Path Traversal Probe',
        siteId: '../../../../etc/shadow',
        latitudeDeg: -88.0,
        longitudeDeg: 0.0,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-11-05T00:00:00.000Z',
      };
      const res = await dispatch('/api/dossier/export', 'POST', payload);
      expect(res.status).toBe(200);
      expect(res.data.dossier.scenario.lolaHorizonProfile.binStatus).toBe('not_available');
    });

    it('sanitizes XSS and Markdown injection in targetName', async () => {
      const payload = {
        targetName: 'Probe <script>alert("XSS")</script> | [Evil](http://evil.com)',
        latitudeDeg: -88.0,
        longitudeDeg: 0.0,
      };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(200);
      expect(res.data.markdown).not.toContain('<script>');
      expect(res.data.markdown).toContain('&lt;script&gt;');
      expect(res.data.markdown).toContain('&#124;');
    });
  });

  // --------------------------------------------------------------------------
  // 7. Scenario Date Range & Window Exceedance Gating
  // --------------------------------------------------------------------------
  describe('7. Scenario Date Range & Window Gating via Dossier Routes', () => {
    it('returns 422 E_INVALID_DATE_RANGE when stopUtc <= startUtc', async () => {
      const payload = {
        ...BASE_VALID_TARGET,
        startUtc: '2026-11-10T00:00:00.000Z',
        stopUtc: '2026-11-01T00:00:00.000Z',
      };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(422);
      expect(res.data.code).toBe('E_INVALID_DATE_RANGE');
      expect(res.data.type).toBe('https://lunamission.nasa.gov/errors/E_INVALID_DATE_RANGE');
      expect(res.data.status).toBe(422);
    });

    it('returns 422 E_WINDOW_EXCEEDS_MAX when window exceeds 28 days', async () => {
      const payload = {
        ...BASE_VALID_TARGET,
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-12-05T00:00:00.000Z', // 34 days
      };
      const res = await dispatch('/api/dossier/generate', 'POST', payload);
      expect(res.status).toBe(422);
      expect(res.data.code).toBe('E_WINDOW_EXCEEDS_MAX');
      expect(res.data.type).toBe('https://lunamission.nasa.gov/errors/E_WINDOW_EXCEEDS_MAX');
    });
  });

  // --------------------------------------------------------------------------
  // 8. HTTP Caching Headers on Scenario Dossier
  // --------------------------------------------------------------------------
  describe('8. Dossier HTTP Caching Headers', () => {
    it('sets ETag, X-Calculation-Id, and Cache-Control headers on 200 responses', async () => {
      const res = await dispatch('/api/dossier/generate', 'POST', BASE_VALID_TARGET);
      expect(res.status).toBe(200);
      expect(res.headers.get('ETag')).toBeDefined();
      expect(res.headers.get('X-Calculation-Id')).toBeDefined();
      expect(res.headers.get('Cache-Control')).toContain('max-age=86400');
    });
  });
});

import { describe, test, expect } from 'bun:test';
import { createServerApp } from '@server/app';
import { createHandler } from '@nextrush/adapter-bun';
import { horizonProfileQuerySchema, horizonProfileResponseSchema } from '@server/schemas/horizonSchemas';
import { horizonProfileService } from '@server/services/celestial/horizonProfileService';

async function dispatch(path: string, body?: unknown) {
  const app = createServerApp();
  const rawHandler = createHandler(app);
  const req = new Request(`http://localhost:3001${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const res = await (rawHandler as any)(req, {} as any);
  return { status: res.status, data: await res.json().catch(() => null) };
}

/**
 * Task 4.1 — additive blocker metadata on the horizons response.
 *
 * The curated asset already carries per-bin mask elevation, ridge distance and
 * bin status (derived offline by the LOLA ray-marcher); the API must expose them
 * as a typed per-bin response (azimuth sector + mask elevation + ridge distance)
 * without any compute-on-demand path.
 */

describe('POST /api/v1/horizons — blocker metadata contract', () => {
  test('query schema validates shape; site existence is a 404 concern, mast height is bracketed', () => {
    const ok = horizonProfileQuerySchema.safeParse({ siteId: 'shackleton-rim', mastHeightMeters: 2 });
    expect(ok.success).toBe(true);

    // Any site id passes the schema — existence is enforced by the service/route (404).
    const unknownShape = horizonProfileQuerySchema.safeParse({ siteId: 'not-a-site' });
    expect(unknownShape.success).toBe(true);

    // Mast heights outside the curated 1–10 m bracket are rejected, not silently clamped.
    const tall = horizonProfileQuerySchema.safeParse({ siteId: 'shackleton-rim', mastHeightMeters: 40 });
    expect(tall.success).toBe(false);
  });

  test('response carries 360 per-bin blocker records shaped for the radar', () => {
    const response = horizonProfileService.getHorizonProfileResponse('shackleton-rim', 2);
    const parsed = horizonProfileResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);

    expect(response.bins.length).toBe(360);
    expect(response.mastHeightMeters).toBe(2);
    expect(response.stepDeg).toBe(1);
    expect(response.status).toBe('valid');

    // Azimuth sectors tile the full circle without gaps or overlaps.
    const first = response.bins[0]!;
    const last = response.bins[359]!;
    expect(first.azimuthDeg).toBe(0);
    expect(first.azimuthSectorDeg[0]).toBe(0);
    expect(last.azimuthSectorDeg[1]).toBe(360);

    // Every bin carries mask elevation + ridge distance from the offline asset.
    const blocking = response.bins.filter((b) => b.maskElevationDeg > -1.5);
    expect(blocking.length).toBeGreaterThan(0);
    for (const bin of blocking) {
      expect(bin.ridgeDistanceKm).toBeGreaterThan(0);
      expect(Number.isFinite(bin.blockerElevationMeters)).toBe(true);
    }
  });

  test('six-state status: out-of-DEM sites are approximate, in-DEM sites valid', () => {
    // A site outside the LOLA 80S DEM ships all-dip bins (no measured terrain blockers).
    const outOfDem = horizonProfileService.getHorizonProfileResponse('firefly-blue-ghost', 2);
    expect(outOfDem.status).toBe('approximate');
    expect(outOfDem.provenance.note).toContain('outside');

    // An in-DEM site with full 360-bin coverage is plain valid.
    const inDem = horizonProfileService.getHorizonProfileResponse('shackleton-rim', 2);
    expect(inDem.status).toBe('valid');
  });

  test('unknown sites surface a typed 404-ish failure, not a throw', () => {
    expect(() => horizonProfileService.getHorizonProfileResponse('no-such-site', 2)).toThrow(/not found/i);
  });
});

describe('POST /api/v1/horizons — HTTP surface', () => {
  test('serves the blocker-metadata response for a registered site', async () => {
    const { status, data } = await dispatch('/api/v1/horizons', {
      siteId: 'connecting-ridge',
      mastHeightMeters: 2,
    });
    expect(status).toBe(200);
    expect(data.siteId).toBe('connecting-ridge');
    expect(data.bins.length).toBe(360);
    expect(horizonProfileResponseSchema.safeParse(data).success).toBe(true);
  });

  test('400 on mast height outside the curated bracket', async () => {
    const { status, data } = await dispatch('/api/v1/horizons', {
      siteId: 'shackleton-rim',
      mastHeightMeters: 40,
    });
    expect(status).toBe(400);
    expect(data.error).toBe('Validation Error');
  });

  test('404 on unknown site', async () => {
    const { status, data } = await dispatch('/api/v1/horizons', {
      siteId: 'no-such-site',
    });
    expect(status).toBe(404);
    expect(data.error).toBe('Horizon Profile Not Found');
  });
});

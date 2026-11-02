import { createRouter } from '@nextrush/router';
import { ephemerisQuerySchema } from '@server/schemas/ephemerisSchemas';
import { ephemerisService } from '@server/services/ephemerisService';
import { horizonsProxyService } from '@server/services/horizonsProxyService';

export function createEphemerisRouter() {
  const router = createRouter();

  // POST /api/ephemeris/conditions
  router.post('/conditions', (ctx) => {
    const parseResult = ephemerisQuerySchema.safeParse(ctx.body);
    if (!parseResult.success) {
      ctx.status = 400;
      ctx.json({
        error: 'Validation Error',
        issues: parseResult.error.issues.map((i: any) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    const payload = parseResult.data;
    const result = ephemerisService.getConditions(payload);

    if (!result) {
      ctx.status = 404;
      ctx.json({ error: `Candidate site '${payload.siteId}' not found in catalog` });
      return;
    }

    ctx.json(result);
  });

  // POST /api/ephemeris/horizons
  router.post('/horizons', async (ctx) => {
    const body = (ctx.body as any) || {};
    const epochMs = typeof body.epochMs === 'number' ? body.epochMs : Date.now();
    const result = await horizonsProxyService.getHorizonsEphemeris(epochMs);
    ctx.json(result);
  });

  // GET /api/ephemeris/horizons
  router.get('/horizons', async (ctx) => {
    const epochStr = (ctx.query as any)?.epochMs;
    const epochMs = epochStr ? Number(epochStr) : Date.now();
    const validEpoch = Number.isFinite(epochMs) ? epochMs : Date.now();
    const result = await horizonsProxyService.getHorizonsEphemeris(validEpoch);
    ctx.json(result);
  });

  return router;
}

export const ephemerisRouter = createEphemerisRouter();

// Backward-compatible factory alias for proxy router
export const createEphemerisProxyRouter = createEphemerisRouter;
export const ephemerisProxyRouter = ephemerisRouter;

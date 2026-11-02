import { createRouter } from '@nextrush/router';
import { horizonProfileQuerySchema } from '@server/schemas/horizonSchemas';
import { horizonProfileService } from '@server/services/celestial/horizonProfileService';

/**
 * POST /api/v1/horizons (task 4.1): serves the offline-derived curated horizon
 * asset with additive per-bin blocker metadata. The frontend horizon path
 * consumes this instead of computing terrain math in the browser.
 */
export function createHorizonRouter() {
  const router = createRouter();

  router.post('/', (ctx) => {
    const parseResult = horizonProfileQuerySchema.safeParse(ctx.body);
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

    try {
      const { siteId, mastHeightMeters } = parseResult.data;
      ctx.json(horizonProfileService.getHorizonProfileResponse(siteId, mastHeightMeters));
    } catch (error) {
      ctx.status = 404;
      ctx.json({
        error: 'Horizon Profile Not Found',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

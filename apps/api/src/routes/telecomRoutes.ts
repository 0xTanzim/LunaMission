import { createRouter } from '@nextrush/router';
import { telecomQuerySchema } from '@server/schemas/telecomSchemas';
import { telecomService } from '@server/services/telecomService';

export function createTelecomRouter() {
  const router = createRouter();

  router.post('/link-budget', (ctx) => {
    const parseResult = telecomQuerySchema.safeParse(ctx.body);
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
    const result = telecomService.computeLinkBudget(payload);

    if (!result) {
      ctx.status = 404;
      ctx.json({ error: `Candidate site '${payload.siteId}' not found in catalog` });
      return;
    }

    ctx.json(result);
  });

  return router;
}

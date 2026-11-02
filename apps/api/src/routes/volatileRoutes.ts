import { Router } from '@nextrush/router';
import { volatileProspectSchema } from '@server/schemas/volatileSchemas';
import { prospectVolatilesService } from '@server/services/volatileService';

export const volatileRouter = new Router();

volatileRouter.post('/prospect', async (ctx) => {
  const body = (ctx as any).body;
  const parsed = volatileProspectSchema.safeParse(body);

  if (!parsed.success) {
    ctx.status = 400;
    return ctx.json({
      error: 'Invalid volatile prospecting payload',
      issues: parsed.error.issues,
    });
  }

  try {
    const data = prospectVolatilesService(parsed.data);
    ctx.status = 200;
    return ctx.json({
      success: true,
      timestamp: Date.now(),
      data,
    });
  } catch (error) {
    ctx.status = 500;
    return ctx.json({
      error: 'Failed to prospect lunar volatiles',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

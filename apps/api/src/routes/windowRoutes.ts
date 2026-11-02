import { Router } from '@nextrush/router';
import { paretoWindowRequestSchema } from '@server/schemas/windowSchemas';
import { optimizeLandingWindowsService } from '@server/services/windowService';

export const windowRouter = new Router();

windowRouter.post('/optimize', async (ctx) => {
  const body = (ctx as any).body;
  const parsed = paretoWindowRequestSchema.safeParse(body);

  if (!parsed.success) {
    ctx.status = 400;
    return ctx.json({
      error: 'Invalid landing window optimization payload',
      issues: parsed.error.issues,
    });
  }

  try {
    const result = optimizeLandingWindowsService(parsed.data);
    ctx.status = 200;
    return ctx.json({
      success: true,
      timestamp: Date.now(),
      data: result,
    });
  } catch (error) {
    ctx.status = 500;
    return ctx.json({
      error: 'Failed to solve Pareto-optimal landing windows',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

import { createRouter } from '@nextrush/router';
import { dsnIngestionService } from '@server/services/dsnIngestionService';

export function createTelemetryRouter() {
  const router = createRouter();

  router.get('/dsn', async (ctx) => {
    try {
      const data = await dsnIngestionService.fetchDsnTelemetry();
      ctx.json(data);
    } catch (err: unknown) {
      ctx.status = 500;
      ctx.json({
        error: 'Failed to fetch DSN telemetry',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}

export const telemetryRouter = createTelemetryRouter();

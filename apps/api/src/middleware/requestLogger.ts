/**
 * Request Logger Middleware.
 * SRP: Emits structured operational timing metrics for API requests.
 */

export async function requestLogger(ctx: any, next: () => Promise<void>): Promise<void> {
  const start = performance.now();
  try {
    await next();
  } finally {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    try {
      ctx.header('X-Response-Time', `${durationMs}ms`);
    } catch {
      // Header setting may fail if response already dispatched or failed
    }
  }
}

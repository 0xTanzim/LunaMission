/**
 * Scenario Route Controller
 * Milestone M5: REST Endpoints (/api/v1/scenarios/evaluate, /api/v1/scenarios/compare)
 * Governed by docs/phase-3/API_CONTRACT.md § 3, § 4, § 6 and AGENTS.md § 5.1 (<120 lines).
 */

import { createRouter } from '@nextrush/router';
import {
  scenarioCompareRequestSchema,
  scenarioEvaluateRequestSchema,
} from '@luna/contracts';
import {
  createProblemDetails,
  ScenarioError,
  scenarioCompareService,
  scenarioService,
} from '../services/scenarios';

export function createScenarioRouter() {
  const router = createRouter();

  router.post('/evaluate', async (ctx) => {
    const rawBody = ctx.body || {};
    const parseResult = scenarioEvaluateRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const err = new ScenarioError({
        code: 'E_VALIDATION_ERROR',
        title: 'Validation Error',
        status: 400,
        detail: 'Request payload violated validation schemas.',
        remediation: 'Inspect invalidParams array and correct payload types.',
        invalidParams: parseResult.error.issues.map((i) => ({
          name: i.path.join('.'),
          reason: i.message,
        })),
      });
      ctx.status = err.status;
      ctx.json(createProblemDetails(err, ctx.path || '/api/v1/scenarios/evaluate'));
      return;
    }

    try {
      const result = await scenarioService.evaluateScenario(parseResult.data, ctx.path);

      if (ctx.headers?.['if-none-match'] === result.calculationId) {
        ctx.status = 304;
        return;
      }

      try {
        (ctx as any).set('ETag', result.calculationId);
        (ctx as any).set('X-Calculation-Id', result.calculationId);
        (ctx as any).set('X-Cache', result.provenance.casCacheHit ? 'HIT-MEMORY' : 'MISS');
        (ctx as any).set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      } catch {
        // Headers might be immutable if pre-committed
      }

      ctx.json(result);
    } catch (err) {
      const problem = createProblemDetails(err as Error, ctx.path || '/api/v1/scenarios/evaluate');
      ctx.status = problem.status;
      ctx.json(problem);
    }
  });

  router.post('/compare', async (ctx) => {
    const rawBody = ctx.body || {};
    const parseResult = scenarioCompareRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const err = new ScenarioError({
        code: 'E_VALIDATION_ERROR',
        title: 'Validation Error',
        status: 400,
        detail: 'Request payload violated validation schemas.',
        remediation: 'Inspect invalidParams array and correct payload types.',
        invalidParams: parseResult.error.issues.map((i) => ({
          name: i.path.join('.'),
          reason: i.message,
        })),
      });
      ctx.status = err.status;
      ctx.json(createProblemDetails(err, ctx.path || '/api/v1/scenarios/compare'));
      return;
    }

    try {
      const result = await scenarioCompareService.compareScenarios(parseResult.data, ctx.path);

      if (ctx.headers?.['if-none-match'] === result.calculationId) {
        ctx.status = 304;
        return;
      }

      try {
        (ctx as any).set('ETag', result.calculationId);
        (ctx as any).set('X-Calculation-Id', result.calculationId);
        (ctx as any).set('X-Cache', result.provenance.casCacheHit ? 'HIT-MEMORY' : 'MISS');
        (ctx as any).set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      } catch {
        // Headers might be immutable if pre-committed
      }

      ctx.json(result);
    } catch (err) {
      const problem = createProblemDetails(err as Error, ctx.path || '/api/v1/scenarios/compare');
      ctx.status = problem.status;
      ctx.json(problem);
    }
  });

  return router;
}

export const scenarioRouter = createScenarioRouter();

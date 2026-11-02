/**
 * Mission Dossier Route Controller
 * Milestone M7: Mission Dossier Backend & Scenario Export Engine
 * Governed by docs/phase-3/API_CONTRACT.md, PROJECT.md § M7, and AGENTS.md § 5.1.
 */

import { createRouter, type RouteHandler } from '@nextrush/router';
import { dossierGenerateSchema } from '../schemas/dossierSchema';
import { integrateScenarioDossier } from '../services/dossier/scenarioDossierIntegrator';
import { ScenarioError, createProblemDetails } from '../services/scenarios/scenarioErrors';

type RouterContext = Parameters<RouteHandler>[0];

function resolveInstancePath(path?: string, defaultEndpoint = '/api/dossier/generate'): string {
  if (!path) return defaultEndpoint;
  if (path.startsWith('/api')) return path;
  if (path.startsWith('/dossier')) return `/api${path}`;
  if (path.startsWith('/')) return `/api/dossier${path}`;
  return `/api/dossier/${path}`;
}

export function createDossierRouter() {
  const router = createRouter();

  const handleDossierRequest = async (ctx: RouterContext) => {
    const rawBody = ctx.body || {};
    const parseResult = dossierGenerateSchema.safeParse(rawBody);
    const instanceUri = resolveInstancePath(ctx.path, '/api/dossier/generate');

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
      const problem = createProblemDetails(err, instanceUri);
      ctx.json({
        ...problem,
        error: 'Validation Error',
        issues: parseResult.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    try {
      const result = await integrateScenarioDossier(parseResult.data, instanceUri);

      const calculationId = result.dossier.scenario?.calculationId || result.dossier.provenance?.calculationId;
      if (calculationId) {
        try {
          ctx.set('ETag', calculationId);
          ctx.set('X-Calculation-Id', calculationId);
          ctx.set('X-Cache', result.dossier.scenario?.provenance?.cacheStatus === 'HIT' ? 'HIT-MEMORY' : 'MISS');
          ctx.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        } catch {
          // Headers may be immutable in certain test adapters
        }
      }

      ctx.json(result);
    } catch (err: unknown) {
      if (err instanceof ScenarioError) {
        ctx.status = err.status;
        const problem = createProblemDetails(err, instanceUri);
        ctx.json({
          ...problem,
          error: problem.title,
          issues: problem.invalidParams?.map((p) => ({ path: p.name, message: p.reason })) || [],
        });
        return;
      }

      ctx.status = 500;
      const fallbackErr = err instanceof Error ? err : new Error(String(err));
      ctx.json(createProblemDetails(fallbackErr, instanceUri));
    }
  };

  router.post('/generate', handleDossierRequest);
  router.post('/export', handleDossierRequest);

  return router;
}

export const dossierRouter = createDossierRouter();

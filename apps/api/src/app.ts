import { createApp } from '@nextrush/core';
import { createRouter } from '@nextrush/router';
import { cors } from '@nextrush/cors';
import { json } from '@nextrush/body-parser';
import { SERVER_CONFIG } from '@server/config/serverConfig';
import { requestLogger } from '@server/middleware/requestLogger';
import { createHealthRouter } from '@server/routes/healthRoutes';
import { createEphemerisRouter } from '@server/routes/ephemerisRoutes';
import { createTelecomRouter } from '@server/routes/telecomRoutes';
import { volatileRouter } from '@server/routes/volatileRoutes';
import { windowRouter } from '@server/routes/windowRoutes';
import { dossierRouter } from '@server/routes/dossierRoutes';
import { createTerrainRouter } from '@server/routes/terrainRoutes';
import { createHorizonRouter } from '@server/routes/horizonRoutes';
import { createSafetyRouter } from '@server/routes/safetyRoutes';
import { createSiteRouter } from '@server/routes/siteRoutes';
import { createTelemetryRouter } from '@server/routes/telemetryRoutes';
import { createScenarioRouter } from '@server/routes/scenarioRoutes';

export function createServerApp() {
  const app = createApp();

  // Global Middleware
  app.use(
    cors({
      origin: SERVER_CONFIG.allowedOrigins,
    }),
  );
  app.use(json());
  app.use(requestLogger);

  // Unified API Router mounted at /api
  const apiRouter = createRouter();

  // Mount feature sub-routers using NextRush router.mount()
  const healthRouter = createHealthRouter();
  const ephemerisRouter = createEphemerisRouter();
  const telecomRouter = createTelecomRouter();
  const terrainRouter = createTerrainRouter();
  const horizonRouter = createHorizonRouter();
  const safetyRouter = createSafetyRouter();
  const siteRouter = createSiteRouter();
  const telemetryRouter = createTelemetryRouter();
  const scenarioRouter = createScenarioRouter();

  apiRouter.mount('', healthRouter);
  apiRouter.mount('/ephemeris', ephemerisRouter);
  apiRouter.mount('/telecom', telecomRouter);
  apiRouter.mount('/volatiles', volatileRouter);
  apiRouter.mount('/windows', windowRouter);
  apiRouter.mount('/dossier', dossierRouter);
  apiRouter.mount('/terrain', terrainRouter);
  apiRouter.mount('/v1/horizons', horizonRouter);
  apiRouter.mount('/landing-safety', safetyRouter);
  apiRouter.mount('/sites', siteRouter);
  apiRouter.mount('/telemetry', telemetryRouter);
  apiRouter.mount('/v1/scenarios', scenarioRouter);
  apiRouter.mount('/scenarios', scenarioRouter);

  app.route(['/api', '/'], apiRouter);

  return app;
}

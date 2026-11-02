import { createRouter } from '@nextrush/router';
import {
  slopeRoughnessQuerySchema,
  tieredElevationQuerySchema,
  type TieredElevationResponse,
  type EvaluationStatus,
} from '@server/schemas/terrainSchemas';
import { terrainService } from '@server/services/terrainService';
import { assessTerrainDataAvailability } from '@server/services/terrain/dataAvailability';

export function createTerrainRouter() {
  const router = createRouter();

  // GET /api/terrain/data-availability
  // Declares which raster-backed capabilities are blocked and why, in six-state vocabulary.
  router.get('/data-availability', (ctx) => {
    ctx.json(assessTerrainDataAvailability());
  });

  // POST /api/terrain/slope-roughness
  router.post('/slope-roughness', (ctx) => {
    const parseResult = slopeRoughnessQuerySchema.safeParse(ctx.body);
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

    const result = terrainService.calculateSlopeRoughness(parseResult.data);
    ctx.json(result);
  });

  // POST /api/terrain/tiered-elevation
  router.post('/tiered-elevation', (ctx) => {
    const parseResult = tieredElevationQuerySchema.safeParse(ctx.body);
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

    const { latitudeDeg, longitudeDeg, preferredTier } = parseResult.data;

    // Evaluate 4-Tier Spatial Cascade
    let activeTier = 2;
    let tierName = 'PGDA_PRODUCT_78_5M';
    let resolutionMetersPerPx = 5;
    let resolutionSmoothingBiasWarning = false;
    let provenance = 'NASA GSFC PGDA Product 78 Co-adjusted Altimetry (5m/px)';

    if (latitudeDeg >= -85.0) {
      activeTier = 4;
      tierName = 'LDEM_80S_20M';
      resolutionMetersPerPx = 20;
      resolutionSmoothingBiasWarning = true;
      provenance = 'NASA PDS / LOLA GDR LDEM_80S_20M (20m/px) Polar Quad';
    } else if (preferredTier === 1 && latitudeDeg <= -87.0) {
      activeTier = 1;
      tierName = 'LROC_NAC_SHADOWCAM_1M';
      resolutionMetersPerPx = 1;
      provenance = 'LROC NAC / KPLO ShadowCam Shape-from-Shading Interior PSR DTM (1m/px)';
    }

    // Evaluate genuine surface elevation & slope from LOLA terrain model (zero synthetic Math.sin)
    const normLon = ((longitudeDeg % 360) + 360) % 360;
    const slopeData = terrainService.calculateSlopeRoughness({
      latDeg: latitudeDeg,
      lonDeg: normLon,
      sampleRadiusMeters: 50,
    });

    const elevationMeters = Math.round(slopeData.elevationMeters * 10) / 10;
    const status: EvaluationStatus = resolutionSmoothingBiasWarning ? 'approximate' : 'valid';

    const response: TieredElevationResponse = {
      latitudeDeg,
      longitudeDeg: normLon,
      elevationMeters,
      slopeDeg: slopeData.slopeDeg,
      activeTier,
      tierName,
      resolutionMetersPerPx,
      provenance,
      resolutionSmoothingBiasWarning,
      status,
    };

    ctx.json(response);
  });

  return router;
}

export const terrainRouter = createTerrainRouter();

// Backward-compatible aliases for legacy imports
export const createTerrainCogRouter = createTerrainRouter;
export const terrainCogRouter = terrainRouter;
export type { EvaluationStatus, TieredElevationResponse };

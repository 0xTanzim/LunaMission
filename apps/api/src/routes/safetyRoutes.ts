import { createRouter } from '@nextrush/router';
import {
  landingSafetyRequestSchema,
  landingSafetyCompareRequestSchema,
  type DualEpochCatalogSite,
} from '@server/schemas/safetySchemas';
import { safetyService } from '@server/services/safetyService';
import { getSiteById } from '../data/catalog';

export function createSafetyRouter() {
  const router = createRouter();

  router.post('/evaluate', (ctx) => {
    const parseResult = landingSafetyRequestSchema.safeParse(ctx.body);
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

    const result = safetyService.evaluate(parseResult.data);
    ctx.json(result);
  });

  router.post('/compare', (ctx) => {
    const parseResult = landingSafetyCompareRequestSchema.safeParse(ctx.body);
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

    const {
      sites: rawSites,
      siteIds,
      weights = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
      epochMs = Date.now(),
      mode = 'terrain-aware',
    } = parseResult.data;

    let sitesToCompare: DualEpochCatalogSite[] = [];
    if (rawSites && rawSites.length > 0) {
      sitesToCompare = rawSites as unknown as DualEpochCatalogSite[];
    } else if (siteIds && siteIds.length > 0) {
      sitesToCompare = siteIds.map((id) => {
        const catalogSite = getSiteById(id);
        if (catalogSite) {
          return {
            id: catalogSite.id,
            name: catalogSite.name,
            epoch: '2024-confirmed' as const,
            coordinates: {
              latitudeDeg: catalogSite.coordinates.latitudeDeg,
              longitudeDeg: catalogSite.coordinates.longitudeDeg,
              convention: 'IAU/IAG Lunar Mean Earth/Polar Axis',
            },
            elevationMeters: catalogSite.coordinates.elevationMeters,
            description: catalogSite.description,
            officialReference: catalogSite.officialRegionReference || 'Artemis Candidate Site',
            siteDesignation: catalogSite.code,
            isPrimaryArtemisCandidate: true,
          };
        }
        return {
          id,
          name: id,
          epoch: '2024-confirmed' as const,
          coordinates: {
            latitudeDeg: -89.9,
            longitudeDeg: 0.0,
            convention: 'IAU/IAG Lunar Mean Earth/Polar Axis',
          },
          elevationMeters: 0,
          description: `Custom comparison site ${id}`,
          officialReference: 'User Query',
        };
      });
    }

    const result = safetyService.compareSites(sitesToCompare, weights, epochMs, mode);
    ctx.json({ result });
  });

  return router;
}

export const safetyRouter = createSafetyRouter();


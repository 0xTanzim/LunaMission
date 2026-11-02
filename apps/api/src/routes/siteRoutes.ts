import { createRouter } from '@nextrush/router';
import { siteQuerySchema } from '@server/schemas/siteSchemas';
import { siteCatalogService } from '@server/services/siteCatalogService';

export function createSiteRouter() {
  const router = createRouter();

  router.get('/', (ctx) => {
    const rawQuery = ctx.query || {};
    const parseResult = siteQuerySchema.safeParse(rawQuery);

    if (!parseResult.success) {
      ctx.status = 400;
      ctx.json({
        error: 'Validation Error',
        issues: parseResult.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    const catalog = siteCatalogService.getSites(parseResult.data);
    ctx.json(catalog);
  });

  router.get('/:id', (ctx) => {
    const id = ctx.params?.id;
    if (!id) {
      ctx.status = 400;
      ctx.json({ error: 'Missing required parameter: id' });
      return;
    }

    const detail = siteCatalogService.getSiteDetail(id);
    if (!detail) {
      ctx.status = 404;
      ctx.json({
        error: `Landing site '${id}' not found in catalog`,
        availableSitesCount: 20,
      });
      return;
    }

    ctx.json(detail);
  });

  return router;
}

export const siteRouter = createSiteRouter();

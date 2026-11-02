import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import {
  siteQuerySchema,
  siteCatalogResponseSchema,
  siteDetailResponseSchema,
} from '@server/schemas/siteSchemas';
import { siteCatalogService } from '@server/services/siteCatalogService';

const app = createServerApp();
const rawHandler = createHandler(app);
const handler = (req: Request) => (rawHandler as any)(req, {} as any);

// ---------------------------------------------------------------------------
// 1. Zod Schema Unit Validations
// ---------------------------------------------------------------------------

test('Site Schemas: siteQuerySchema accepts valid category and tier filters', () => {
  const validFilters = [
    { category: 'artemis-iii-2024' },
    { category: 'artemis-2024' },
    { category: 'clps' },
    { category: 'polar-benchmark' },
    { category: 'historic' },
    { category: 'all' },
    { tier: 'clps' },
    {},
  ];

  for (const filter of validFilters) {
    const parsed = siteQuerySchema.safeParse(filter);
    assert.equal(parsed.success, true, `Expected ${JSON.stringify(filter)} to be valid`);
  }
});

test('Site Schemas: siteQuerySchema rejects invalid category or tier values', () => {
  const invalid = siteQuerySchema.safeParse({ category: 'mars-sample-return' });
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    assert.ok(invalid.error.issues.length > 0);
  }
});

// ---------------------------------------------------------------------------
// 2. Site Catalog Service Unit Validations
// ---------------------------------------------------------------------------

test('Site Catalog Service: getSites returns all 20 sites with IAU/LOLA metadata by default', () => {
  const catalog = siteCatalogService.getSites();
  assert.equal(catalog.sites.length, 20);
  assert.equal(catalog.metadata.totalSites, 20);
  assert.equal(catalog.metadata.filteredCount, 20);
  assert.equal(catalog.metadata.coordinateConvention, 'IAU/IAG Lunar Mean Earth / Polar Axis (ME)');
  assert.ok(catalog.metadata.elevationDatum.includes('1737.4 km'));
  assert.ok(catalog.metadata.elevationDatum.includes('LOLA DEM 128ppd'));

  // Validate output against schema
  const parseResult = siteCatalogResponseSchema.safeParse(catalog);
  assert.equal(parseResult.success, true);
});

test('Site Catalog Service: getSites filters Artemis III 2024 down-selected 9 regions', () => {
  const result = siteCatalogService.getSites({ category: 'artemis-iii-2024' });
  assert.equal(result.sites.length, 9);
  assert.equal(result.metadata.filteredCount, 9);
  assert.equal(result.metadata.totalSites, 20);

  const ids = result.sites.map((s) => s.id);
  assert.ok(ids.includes('peak-near-cabeus-b'));
  assert.ok(ids.includes('haworth-rim'));
  assert.ok(ids.includes('malapert-massif'));
  assert.ok(ids.includes('mons-mouton'));
  assert.ok(ids.includes('slater-plain'));
});

test('Site Catalog Service: getSites filters CLPS commercial sites', () => {
  const result = siteCatalogService.getSites({ category: 'clps' });
  assert.equal(result.sites.length, 3);
  const ids = result.sites.map((s) => s.id);
  assert.ok(ids.includes('im-1-odysseus'));
  assert.ok(ids.includes('im-2-prime1'));
  assert.ok(ids.includes('firefly-blue-ghost'));
});

test('Site Catalog Service: getSites filters polar benchmarks via tier parameter', () => {
  const result = siteCatalogService.getSites({ tier: 'polar-benchmark' });
  assert.equal(result.sites.length, 5);
  const ids = result.sites.map((s) => s.id);
  assert.ok(ids.includes('shackleton-rim'));
  assert.ok(ids.includes('connecting-ridge'));
});

test('Site Catalog Service: getSites filters historic baseline sites', () => {
  const result = siteCatalogService.getSites({ category: 'historic' });
  assert.equal(result.sites.length, 3);
  const ids = result.sites.map((s) => s.id);
  assert.ok(ids.includes('apollo-11'));
  assert.ok(ids.includes('apollo-17'));
  assert.ok(ids.includes('change-6'));
});

test('Site Catalog Service: getSiteDetail returns full investigation with 48-point profile and deep links', () => {
  const detail = siteCatalogService.getSiteDetail('shackleton-rim');
  assert.ok(detail !== null);
  assert.equal(detail.site.id, 'shackleton-rim');
  assert.equal(detail.investigation.id, 'shackleton-rim');

  // Verify 48-point LOLA altimetric cross-section
  assert.equal(detail.investigation.topography.elevationProfile.length, 48);
  assert.ok(detail.investigation.topography.meanSlopeDeg > 0);
  assert.ok(detail.investigation.geology.stratigraphicUnitCode !== '');
  assert.ok(detail.investigation.illuminationThermal.annualSolarExposurePercentage > 0);

  // Verify deep reconnaissance links
  assert.ok(detail.reconnaissanceLinks.moonTrekUrl.includes('trek.nasa.gov'));
  assert.ok(detail.reconnaissanceLinks.moonTrekUrl.includes('128ppd'));
  assert.equal(detail.reconnaissanceLinks.svsIlluminationUrl, 'https://svs.gsfc.nasa.gov/5127');
  assert.equal(detail.reconnaissanceLinks.lpiAtlasUrl, 'https://www.lpi.usra.edu/lunar/lunar-south-pole-atlas/');
  assert.equal(detail.reconnaissanceLinks.pdsGeosciencesUrl, 'https://pds-geosciences.wustl.edu/lro/');

  // Verify coordinate datum
  assert.equal(detail.datum.coordinateFrame, 'IAU/IAG Lunar Mean Earth / Polar Axis (ME)');
  assert.ok(detail.datum.elevationDatum.includes('LOLA'));

  // Validate output against schema
  const parseResult = siteDetailResponseSchema.safeParse(detail);
  assert.equal(parseResult.success, true);
});

test('Site Catalog Service: getSiteDetail returns null for unknown site', () => {
  const detail = siteCatalogService.getSiteDetail('non-existent-site-xyz');
  assert.equal(detail, null);
});

// ---------------------------------------------------------------------------
// 3. HTTP Integration: GET /api/sites
// ---------------------------------------------------------------------------

test('NextRush Route: GET /api/sites returns 200 with full catalog and metadata', async () => {
  const req = new Request('http://localhost:3001/api/sites', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.metadata.totalSites, 20);
  assert.equal(data.metadata.filteredCount, 20);
  assert.equal(data.sites.length, 20);
  assert.equal(data.metadata.coordinateConvention, 'IAU/IAG Lunar Mean Earth / Polar Axis (ME)');
  assert.ok(data.metadata.elevationDatum.includes('1737.4 km'));
});

test('NextRush Route: GET /api/sites?category=artemis-iii-2024 returns 200 with 9 sites', async () => {
  const req = new Request('http://localhost:3001/api/sites?category=artemis-iii-2024', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.metadata.filteredCount, 9);
  assert.equal(data.sites.length, 9);
  assert.equal(data.metadata.activeFilter?.category, 'artemis-iii-2024');
});

test('NextRush Route: GET /api/sites?tier=clps returns 200 with 3 commercial landers', async () => {
  const req = new Request('http://localhost:3001/api/sites?tier=clps', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.metadata.filteredCount, 3);
  assert.equal(data.sites.length, 3);
});

test('NextRush Route: GET /api/sites?category=invalid-category returns 400 Validation Error', async () => {
  const req = new Request('http://localhost:3001/api/sites?category=invalid-category', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Validation Error');
  assert.ok(Array.isArray(data.issues));
  assert.ok(data.issues.length > 0);
});

// ---------------------------------------------------------------------------
// 4. HTTP Integration: GET /api/sites/:id
// ---------------------------------------------------------------------------

test('NextRush Route: GET /api/sites/shackleton-rim returns 200 with detailed investigation', async () => {
  const req = new Request('http://localhost:3001/api/sites/shackleton-rim', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.site.id, 'shackleton-rim');
  assert.equal(data.investigation.id, 'shackleton-rim');
  assert.equal(data.investigation.topography.elevationProfile.length, 48);
  assert.ok(data.reconnaissanceLinks.moonTrekUrl.includes('trek.nasa.gov'));
  assert.equal(data.datum.coordinateFrame, 'IAU/IAG Lunar Mean Earth / Polar Axis (ME)');
});

test('NextRush Route: GET /api/sites/haworth-rim returns 200 for Artemis III candidate', async () => {
  const req = new Request('http://localhost:3001/api/sites/haworth-rim', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.site.id, 'haworth-rim');
  assert.ok(data.investigation !== undefined);
  assert.ok(data.reconnaissanceLinks.moonTrekUrl.includes('trek.nasa.gov'));
});

test('NextRush Route: GET /api/sites/unknown-site-404 returns 404 with error message', async () => {
  const req = new Request('http://localhost:3001/api/sites/unknown-site-404', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 404);
  const data = await res.json();
  assert.ok(data.error.includes('unknown-site-404'));
  assert.equal(data.availableSitesCount, 20);
});

// ---------------------------------------------------------------------------
// 5. HTTP Integration: GET /api/telemetry/dsn
// ---------------------------------------------------------------------------

test('NextRush Route: GET /api/telemetry/dsn returns 200 with active complexes and tracking summary', async () => {
  const req = new Request('http://localhost:3001/api/telemetry/dsn', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.status === 'live_feed' || data.status === 'offline_fallback');
  assert.ok(Array.isArray(data.stations));
  assert.equal(data.stations.length, 3);
  assert.ok(data.lunarTrackingSummary !== undefined);
  assert.ok(data.provenance !== undefined);
});

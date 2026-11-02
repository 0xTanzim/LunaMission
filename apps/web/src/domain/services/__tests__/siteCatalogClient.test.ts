import test from 'node:test';
import assert from 'node:assert/strict';
import { siteCatalogClient } from '../siteCatalogClient';

test('siteCatalogClient: returns explicit failed status when backend is unreachable', async () => {
  // Point to an unreachable port
  const client = siteCatalogClient.withBaseUrl('http://127.0.0.1:59999/api');

  const result = await client.fetchCandidateSites();

  assert.equal(result.source, 'nextrush_server');
  assert.equal(result.status, 'failed');
  assert.equal(result.sites.length, 0);
  assert.equal(result.length, 0);
  assert.ok(result.error !== undefined);
});

test('siteCatalogClient: handles query filtering with unreachable backend without synthetic fallbacks', async () => {
  const client = siteCatalogClient.withBaseUrl('http://127.0.0.1:59999/api');

  const artemisSites = await client.fetchCandidateSites({ category: 'artemis-iii-2024' });
  assert.equal(artemisSites.source, 'nextrush_server');
  assert.equal(artemisSites.status, 'failed');
  assert.equal(artemisSites.sites.length, 0);

  const clpsSites = await client.fetchCandidateSites({ tier: 'clps' });
  assert.equal(clpsSites.source, 'nextrush_server');
  assert.equal(clpsSites.status, 'failed');
  assert.equal(clpsSites.sites.length, 0);
});

test('siteCatalogClient: fetchSiteDetail returns failed status without synthetic fallbacks when unreachable', async () => {
  const client = siteCatalogClient.withBaseUrl('http://127.0.0.1:59999/api');

  const detail = await client.fetchSiteDetail('shackleton-rim');

  assert.equal(detail.source, 'nextrush_server');
  assert.equal(detail.status, 'failed');
  assert.equal(detail.site, null);
  assert.equal(detail.investigation, null);
  assert.ok(detail.error !== undefined);
});

test('siteCatalogClient: fetchSiteDetail returns failed status for unknown ID', async () => {
  const client = siteCatalogClient.withBaseUrl('http://127.0.0.1:59999/api');

  const detail = await client.fetchSiteDetail('non-existent-crater-999');

  assert.equal(detail.source, 'nextrush_server');
  assert.equal(detail.status, 'failed');
  assert.equal(detail.site, null);
  assert.equal(detail.investigation, null);
});

test('siteCatalogClient: parses server response when backend succeeds', async () => {
  const mockServerResponse = {
    metadata: {
      catalogName: 'Mock Catalog',
      catalogVersion: '1.0',
      lineage: 'Mock Lineage',
      coordinateConvention: 'IAU ME',
      elevationDatum: 'LOLA 128ppd',
      totalSites: 1,
      filteredCount: 1,
    },
    sites: [
      {
        id: 'mock-site-1',
        code: 'SITE-MOCK',
        name: 'Mock Crater Peak',
        coordinates: { latitudeDeg: -89.0, longitudeDeg: 0.0, elevationMeters: 500 },
        priority: 'Primary',
        description: 'Mocked landing zone',
        category: 'artemis-iii-2024',
      },
    ],
  };

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/sites')) {
        return new Response(JSON.stringify(mockServerResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    const client = siteCatalogClient.withBaseUrl('/api');
    const result = await client.fetchCandidateSites();

    assert.equal(result.source, 'nextrush_server');
    assert.equal(result.status, 'valid');
    assert.equal(result.sites.length, 1);
    assert.equal(result.sites[0].id, 'mock-site-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useSiteCatalog } from '../useSiteCatalog';
import { clearDynamicSites, getAllAvailableSites, registerDynamicSites } from '@/domain/sites/catalog';
import { CANDIDATE_SITES } from '@luna/contracts';

test('useSiteCatalog: mounts in loading state with authoritative nextrush_server source', () => {
  clearDynamicSites();
  let capturedState!: ReturnType<typeof useSiteCatalog>;

  const Harness = () => {
    capturedState = useSiteCatalog('all');
    return (
      <div data-testid="site-catalog-harness">
        <span id="count">{capturedState.sites.length}</span>
        <span id="source">{capturedState.source}</span>
        <span id="status">{capturedState.status}</span>
      </div>
    );
  };

  const html = renderToStaticMarkup(<Harness />);
  assert.ok(html.includes('nextrush_server'), 'Authoritative source is nextrush_server');
  assert.equal(capturedState.source, 'nextrush_server');
  assert.equal(capturedState.status, 'loading');
});

test('useSiteCatalog: renders registered sites dynamically', () => {
  clearDynamicSites();
  registerDynamicSites([
    {
      id: 'malapert-massif',
      code: 'SITE-005',
      name: 'Malapert Mountain (Massif)',
      priority: 'Artemis III Candidate',
      category: 'artemis-2024',
      coordinates: { latitudeDeg: -85.9, longitudeDeg: 2.9, elevationMeters: 5100, convention: 'IAU/IAG Lunar Mean Earth/Polar Axis' },
      description: 'Major topographic massif',
    },
  ]);

  let capturedState!: ReturnType<typeof useSiteCatalog>;
  const Harness = () => {
    capturedState = useSiteCatalog('artemis-iii-2024');
    return <div>{capturedState.sites.length}</div>;
  };

  const html = renderToStaticMarkup(<Harness />);
  assert.ok(html.includes('>1<'));
  assert.equal(capturedState.sites.length, 1);
  clearDynamicSites();
  registerDynamicSites(CANDIDATE_SITES);
});

test('useSiteCatalog: exposes refetch, isLoading, and registers dynamic sites into catalog', async () => {
  clearDynamicSites();

  const mockSites = [
    {
      id: 'dynamic-eval-site',
      code: 'SITE-DYN',
      name: 'Dynamic Evaluation Site',
      coordinates: { latitudeDeg: -89.1, longitudeDeg: 120.0, elevationMeters: 450 },
      priority: 'Primary',
      description: 'Dynamic candidate registered via hook',
      category: 'artemis-iii-2024',
    },
  ];

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ sites: mockSites }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    let hookResult!: ReturnType<typeof useSiteCatalog>;
    const Harness = () => {
      hookResult = useSiteCatalog('all');
      return <div>{hookResult.sites.length}</div>;
    };

    renderToStaticMarkup(<Harness />);
    assert.ok(hookResult);
    assert.equal(typeof hookResult.refetch, 'function');

    // Trigger refetch explicitly
    await hookResult.refetch();

    // Verify dynamic registration in catalog
    const all = getAllAvailableSites();
    assert.ok(all.some((s) => s.id === 'dynamic-eval-site'), 'Dynamic site should be registered in catalog');
  } finally {
    globalThis.fetch = originalFetch;
    clearDynamicSites();
    registerDynamicSites(CANDIDATE_SITES);
  }
});

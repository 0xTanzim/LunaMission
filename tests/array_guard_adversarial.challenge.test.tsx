/** @jsx React.createElement */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { siteCatalogClient } from '@/domain/services/siteCatalogClient';
import { useSiteCatalog } from '@/features/spatial/hooks/useSiteCatalog';
import { clearDynamicSites, registerDynamicSites } from '@/domain/sites/catalog';
import { CANDIDATE_SITES } from '@luna/contracts';

describe('Adversarial Array Guard & Consumer Component .map() Resilience', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearDynamicSites();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    registerDynamicSites(CANDIDATE_SITES);
  });

  describe('1. siteCatalogClient: Non-Array Payload Diversion to Local Fallback', () => {
    const malformedPayloads: Array<{ name: string; payload: unknown }> = [
      { name: 'string payload { sites: "Gateway error string" }', payload: { sites: 'Gateway error string' } },
      { name: 'null payload { sites: null }', payload: { sites: null } },
      { name: 'number payload { sites: 123 }', payload: { sites: 123 } },
      { name: 'boolean false payload { sites: false }', payload: { sites: false } },
      { name: 'boolean true payload { sites: true }', payload: { sites: true } },
      { name: 'object payload { sites: { unexpected: true } }', payload: { sites: { unexpected: true } } },
      { name: 'empty object payload {}', payload: {} },
      { name: 'error object payload { error: "502 Bad Gateway" }', payload: { error: '502 Bad Gateway' } },
      { name: 'root null payload null', payload: null },
      { name: 'root number payload 42', payload: 42 },
      { name: 'root string payload "Proxy Timeout"', payload: 'Proxy Timeout' },
      { name: 'root boolean payload false', payload: false },
    ];

    for (const { name, payload } of malformedPayloads) {
      test(`safely routes to failed state when upstream returns ${name}`, async () => {
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;

        const client = siteCatalogClient.withBaseUrl('/api');
        const result = await client.fetchCandidateSites();

        expect(result).toBeDefined();
        expect(result.source).toBe('nextrush_server');
        expect(result.status).toBe('failed');
        expect(Array.isArray(result.sites)).toBe(true);
        expect(Array.isArray(result)).toBe(true);
        expect(result.sites.length).toBe(0);
        expect(result.length).toBe(0);

        // Verify array methods operate without throwing
        const mapped = result.sites.map((s) => s.id);
        expect(mapped.length).toBe(0);
      });
    }
  });

  describe('2. useSiteCatalog & Consumer Component .map() Defense', () => {
    const testCases: Array<{ label: string; payload: unknown }> = [
      { label: 'String in sites field', payload: { sites: 'Gateway error string' } },
      { label: 'Null in sites field', payload: { sites: null } },
      { label: 'Number in sites field', payload: { sites: 123 } },
      { label: 'Boolean false in sites field', payload: { sites: false } },
      { label: 'Object in sites field', payload: { sites: { code: 'FAIL' } } },
      { label: 'Missing sites property', payload: { message: 'Internal Gateway Timeout' } },
      { label: 'Root level null response', payload: null },
      { label: 'Root level number response', payload: 504 },
    ];

    for (const { label, payload } of testCases) {
      test(`consumer component does not throw and successfully renders .map() with ${label}`, async () => {
        globalThis.fetch = (async () => {
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as any;

        let hookInstance!: ReturnType<typeof useSiteCatalog>;

        // Simulate a consumer UI component mapping over hook.sites
        const SiteListConsumer = () => {
          hookInstance = useSiteCatalog('all');
          return React.createElement(
            'div',
            { 'data-testid': 'site-consumer' },
            React.createElement('span', { id: 'source-badge' }, hookInstance.source),
            React.createElement(
              'ul',
              { 'data-testid': 'site-list' },
              hookInstance.sites.map((site) =>
                React.createElement('li', { key: site.id, 'data-site-id': site.id }, site.name)
              )
            )
          );
        };

        // Initial render frame-0
        renderToStaticMarkup(React.createElement(SiteListConsumer));
        expect(Array.isArray(hookInstance.sites)).toBe(true);

        // Explicit refetch to simulate async update cycle
        await hookInstance.refetch();

        // Must still be an array and never store non-array into React state
        expect(Array.isArray(hookInstance.sites)).toBe(true);
        expect(hookInstance.sites.length).toBe(0);
        expect(hookInstance.source).toBe('nextrush_server');
        expect(hookInstance.status).toBe('failed');

        // Test consumer mapping after refetch
        const renderedIds = hookInstance.sites.map((s) => s.id);
        expect(renderedIds.length).toBe(0);
      });
    }
  });

  describe('3. Filtered useSiteCatalog with Malformed Gateway Responses', () => {
    test('filters for artemis-iii-2024 handle malformed response with status=failed', async () => {
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ sites: 'INVALID_CORRUPT_SCHEMA' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      let hookInstance!: ReturnType<typeof useSiteCatalog>;
      const FilteredConsumer = () => {
        hookInstance = useSiteCatalog('artemis-iii-2024');
        return React.createElement(
          'div',
          null,
          hookInstance.sites.map((s) => React.createElement('span', { key: s.id }, s.code))
        );
      };

      renderToStaticMarkup(React.createElement(FilteredConsumer));
      expect(Array.isArray(hookInstance.sites)).toBe(true);

      await hookInstance.refetch();

      expect(Array.isArray(hookInstance.sites)).toBe(true);
      expect(hookInstance.sites.length).toBe(0);
      expect(hookInstance.source).toBe('nextrush_server');
      expect(hookInstance.status).toBe('failed');
      expect(hookInstance.sites.map((s) => s.id).length).toBe(0);
    });

    test('concurrent multiple consumer components all receive valid arrays and execute .map() cleanly', async () => {
      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ sites: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      let hook1!: ReturnType<typeof useSiteCatalog>;
      let hook2!: ReturnType<typeof useSiteCatalog>;

      const MultiConsumer = () => {
        hook1 = useSiteCatalog('all');
        hook2 = useSiteCatalog('historic');
        return React.createElement(
          'div',
          null,
          React.createElement('div', { id: 'c1' }, hook1.sites.map((s) => s.id).join(',')),
          React.createElement('div', { id: 'c2' }, hook2.sites.map((s) => s.id).join(','))
        );
      };

      renderToStaticMarkup(React.createElement(MultiConsumer));

      await Promise.all([hook1.refetch(), hook2.refetch()]);

      expect(Array.isArray(hook1.sites)).toBe(true);
      expect(Array.isArray(hook2.sites)).toBe(true);
      expect(hook1.sites.length).toBe(0);
      expect(hook2.sites.length).toBe(0);
      expect(hook1.sites.map((s) => s.name).length).toBe(0);
      expect(hook2.sites.map((s) => s.name).length).toBe(0);
    });
  });
});

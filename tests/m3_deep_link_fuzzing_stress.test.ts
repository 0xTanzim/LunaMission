import { describe, expect, test, afterEach } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGlobalScenarioState, initialScenarioState } from '@/app/state/scenarioReducer';
import { deriveScenarioState } from '@/app/scenario/state/scenarioState';
import { getSiteById } from '@/domain/sites/catalog';
import { CANDIDATE_SITES } from '@luna/contracts';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';
import { useScenario, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { deriveScenarioModel } from '@/app/scenario/model/scenarioModel';

/**
 * The retired `createInitialScenarioState` / `DEFAULT_EPOCH_MS` / `DEFAULT_CALCULATION_MODE`
 * triple lived in a scenario store that no longer exists. The canonical defaults now belong
 * to the single authoritative store, so they are derived from `initialScenarioState` here
 * instead of being re-declared: one source, one set of fuzz expectations.
 */
const DEFAULT_EPOCH_MS = Date.parse(initialScenarioState.activePlayheadUtc);
const DEFAULT_CALCULATION_MODE = initialScenarioState.calculationMode;
const DEFAULT_SITE_ID = initialScenarioState.primarySiteId;

/**
 * Hydrates the authoritative store from a URL search string and projects it the way the
 * scientific views consume it. A deep link never opens a map-inspection divergence
 * (ADR-02), which is asserted on every call so the projection's inspected site and the
 * store's mission target cannot silently disagree.
 */
function initialScenario(search?: string) {
  const store = createInitialGlobalScenarioState(search);
  expect(store.mapFocusSiteId).toBeNull();
  return { ...deriveScenarioState(store), primarySiteId: store.primarySiteId };
}

function TestProbe() {
  const state = useScenario();
  const model = useScenarioModel();
  return React.createElement(
    'div',
    { 'data-testid': 'scenario-test-probe' },
    `site:${state.selectedSiteId}|epoch:${state.epochMs}|iso:${model.epochIsoUtc}`,
  );
}

describe('M3 Adversarial Challenge 3: Deep Link Query Parameter Fuzzing', () => {
  const hadWindow = typeof globalThis.window !== 'undefined';
  const originalWindow = (globalThis as any).window;

  afterEach(() => {
    if (hadWindow) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
  });

  test('Fuzz Unknown Site Slugs: Falls back gracefully to the canonical default site without throwing', () => {
    const unknownSiteSlugs = [
      'mars-jezero-crater',
      'titan-kraken-mare',
      'non-existent-site-xyz',
      'shackleton', // Partial / incomplete slug
      'connecting_ridge', // Underscore instead of hyphen
      'SHACKLETON-RIM', // Uppercase
      '',
      '   ',
      'null',
      'undefined',
      '0',
      'false',
    ];

    for (const slug of unknownSiteSlugs) {
      const state = initialScenario(`?site=${encodeURIComponent(slug)}`);
      expect(state.selectedSiteId).toBe(DEFAULT_SITE_ID);
      expect(state.epochMs).toBe(DEFAULT_EPOCH_MS);
      expect(state.calculationMode).toBe(DEFAULT_CALCULATION_MODE);
      expect(state.customTarget).toBeNull();
    }
  });

  test('Fuzz XSS & Script Injection Strings: Sanitizes and falls back safely to defaults', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><img src=x onerror=alert(1)>',
      '"><svg onload=alert(document.cookie)>',
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      "'-alert(1)-'",
      '${alert(1)}',
      '{{7*7}}',
      '<iframe src="evil.com">',
      '"><a href="javascript:alert(1)">click</a>',
    ];

    for (const payload of xssPayloads) {
      const qs = `?site=${encodeURIComponent(payload)}&epoch=${encodeURIComponent(payload)}&mode=${encodeURIComponent(payload)}`;
      const state = initialScenario(qs);

      // Verify strict fallback to defaults
      expect(state.selectedSiteId).toBe(DEFAULT_SITE_ID);
      expect(state.epochMs).toBe(DEFAULT_EPOCH_MS);
      expect(state.calculationMode).toBe(DEFAULT_CALCULATION_MODE);

      // Verify ScenarioProvider mounts and renders without executing or throwing
      (globalThis as any).window = { location: new URL(`http://localhost:3000/explore${qs}`) };
      expect(() => {
        const html = renderToStaticMarkup(
          React.createElement(ScenarioProvider, null, React.createElement(TestProbe)),
        );
        expect(html).toContain(`site:${DEFAULT_SITE_ID}`);
      }).not.toThrow();
    }
  });

  test('Fuzz Prototype Pollution: Resists prototype pollution keys (__proto__, constructor, prototype)', () => {
    const pollutionKeys = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'];

    for (const key of pollutionKeys) {
      const state = initialScenario(`?site=${key}&mode=${key}`);
      expect(state.selectedSiteId).toBe(DEFAULT_SITE_ID);
      expect(state.calculationMode).toBe(DEFAULT_CALCULATION_MODE);

      // Verify pollution does not add unintended properties
      expect((Object.prototype as any).pollutedProperty).toBeUndefined();
    }
  });

  test('Fuzz Corrupted Dates & Malformed Epoch Strings: Non-numeric strings fall back to the canonical epoch without throwing', () => {
    const nonNumericCorruptedEpochs = [
      'corrupted-date',
      'not-a-number',
      'NaN',
      'Infinity',
      '-Infinity',
      'undefined',
      'null',
      'true',
      'false',
      '[object Object]',
      '{epoch:123}',
      'undefined-epoch',
      'invalid_iso_date',
    ];

    for (const epochStr of nonNumericCorruptedEpochs) {
      const state = initialScenario(`?epoch=${encodeURIComponent(epochStr)}`);
      expect(state.epochMs).toBe(DEFAULT_EPOCH_MS);
      expect(Number.isFinite(state.epochMs)).toBe(true);

      const site = getSiteById(state.selectedSiteId)!;
      expect(() => {
        deriveScenarioModel(site, state.epochMs, state.calculationMode);
      }).not.toThrow();
    }
  });

  test('Fuzz ISO Formats vs Timestamp Strings: Verifies behavior on ISO date strings like 2026-10-21', () => {
    // When given an ISO string like 2026-10-21, parseInt parses leading digits "2026"
    const state = initialScenario('?epoch=2026-10-21T12:00:00Z');
    // parseInt("2026-10-21T12:00:00Z", 10) yields 2026
    expect(Number.isFinite(state.epochMs)).toBe(true);

    const site = getSiteById(state.selectedSiteId)!;
    expect(() => {
      deriveScenarioModel(site, state.epochMs, state.calculationMode);
    }).not.toThrow();
  });

  test('Fuzz Negative & In-Range Extreme Timestamps: Handles safely without throwing unhandled exceptions', () => {
    const extremeEpochs = [
      '-1',
      '-1000',
      '-1773532800000', // negative timestamp (year 1913)
      '-999999999999999',
      '0', // 1970-01-01T00:00:00Z
      '1',
      '1792584000000', // nominal Artemis III epoch (2026-10-21T12:00:00Z)
      '8640000000000000', // maximum valid JS date
    ];

    for (const epochStr of extremeEpochs) {
      // Must not throw unhandled exception
      let state: any;
      expect(() => {
        state = initialScenario(`?epoch=${encodeURIComponent(epochStr)}`);
      }).not.toThrow();

      expect(state).toBeDefined();
      expect(Number.isFinite(state.epochMs)).toBe(true);

      // Model derivation must not throw
      const site = getSiteById(state.selectedSiteId)!;
      expect(() => {
        deriveScenarioModel(site, state.epochMs, state.calculationMode);
      }).not.toThrow();

      // Provider mounting must not throw
      (globalThis as any).window = { location: new URL(`http://localhost:3000/explore?epoch=${encodeURIComponent(epochStr)}`) };
      expect(() => {
        renderToStaticMarkup(
          React.createElement(ScenarioProvider, null, React.createElement(TestProbe)),
        );
      }).not.toThrow();
    }
  });

  /**
   * Regression guard for the out-of-range `?epoch=` crash.
   *
   * `createInitialGlobalScenarioState` documents "Invalid parameters are ignored rather
   * than coerced", but it originally normalized `?epoch=` through `new Date(ms).toISOString()`
   * without a range guard, so a timestamp outside the JS Date range threw
   * `RangeError: Invalid Date` and took the whole app bootstrap down. The source now
   * rejects anything outside ±8.64e15 ms, so this asserts the documented contract directly.
   */
  test('Fuzz Out-Of-Range Timestamps: out-of-range ?epoch= is ignored, not thrown', () => {
    const outOfRangeEpochs = [
      '8640000000000001', // one millisecond past the maximum JS date
      '99999999999999999999',
    ];

    for (const epochStr of outOfRangeEpochs) {
      let state: any;
      expect(() => {
        state = initialScenario(`?epoch=${encodeURIComponent(epochStr)}`);
      }).not.toThrow();

      expect(state.epochMs).toBe(DEFAULT_EPOCH_MS);

      (globalThis as any).window = { location: new URL(`http://localhost:3000/explore?epoch=${encodeURIComponent(epochStr)}`) };
      expect(() => {
        renderToStaticMarkup(
          React.createElement(ScenarioProvider, null, React.createElement(TestProbe)),
        );
      }).not.toThrow();
    }
  });

  test('Fuzz Combinatorial Generator: 100 random malformed URL search strings execute without crashing', () => {
    const sites = ['shackleton-rim', 'invalid-site', '<script>', '__proto__', '', 'malapert-massif'];
    const epochs = ['1792584000000', 'corrupted', '-5000', 'NaN', '2026-10-21', ''];
    const modes = ['terrain-aware', 'geometry-only', 'invalid-mode', ''];

    let successfulRuns = 0;

    for (let i = 0; i < 100; i++) {
      const randomSite = sites[Math.floor(Math.random() * sites.length)];
      const randomEpoch = epochs[Math.floor(Math.random() * epochs.length)];
      const randomMode = modes[Math.floor(Math.random() * modes.length)];

      const qs = `?site=${encodeURIComponent(randomSite)}&epoch=${encodeURIComponent(randomEpoch)}&mode=${encodeURIComponent(randomMode)}&extra=${i}`;

      const state = initialScenario(qs);
      expect(state).toBeDefined();
      expect(CANDIDATE_SITES.some((s) => s.id === state.selectedSiteId)).toBe(true);
      expect(Number.isFinite(state.epochMs)).toBe(true);
      expect(['terrain-aware', 'geometry-only']).toContain(state.calculationMode);

      (globalThis as any).window = { location: new URL(`http://localhost:3000/explore${qs}`) };
      const html = renderToStaticMarkup(
        React.createElement(ScenarioProvider, null, React.createElement(TestProbe)),
      );
      expect(html).toContain('data-testid="scenario-test-probe"');
      successfulRuns++;
    }

    expect(successfulRuns).toBe(100);
  });
});

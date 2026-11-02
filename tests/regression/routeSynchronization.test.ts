import { describe, expect, test } from 'bun:test';
import {
  MISSION_WORKSPACE_ROUTES,
  synchronizeWorkspaceState,
  formatWorkspaceQueryParams,
  parseWorkspaceQueryParams,
  type WorkspaceSyncState,
} from '@/app/scenario/scenarioSynchronization';

describe('DEF-10 Regression: Canonical Route Synchronization (/methodology)', () => {
  test('MISSION_WORKSPACE_ROUTES includes /methodology and rejects obsolete /method', () => {
    expect(MISSION_WORKSPACE_ROUTES).toContain('/methodology');
    expect(MISSION_WORKSPACE_ROUTES as readonly string[]).not.toContain('/method');
  });

  test('synchronizeWorkspaceState validates /methodology as a navigable canonical route', () => {
    const state: WorkspaceSyncState = {
      siteId: 'shackleton-rim',
      epochMs: 1773532800000,
      mastHeightM: 15.0,
      calculationMode: 'terrain-aware',
    };

    const result = synchronizeWorkspaceState('/explore', '/methodology', state);
    expect(result.isNavigable).toBe(true);
    expect(result.targetRoute).toBe('/methodology');
    expect(result.sourceRoute).toBe('/explore');
    expect(result.synchronizedState.siteId).toBe('shackleton-rim');
  });

  test('bidirectional state preservation holds between /methodology and other workspaces', () => {
    const methodologyState: WorkspaceSyncState = {
      siteId: 'connecting-ridge',
      epochMs: 1774000000000,
      calculationMode: 'geometry-only',
    };

    // The Analyze workspace is canonically served at /analyze (round-2 route alignment:
    // the nav label, the h1 and the URL now agree; /horizon remains a router alias).
    const toAnalyze = synchronizeWorkspaceState('/methodology', '/analyze', methodologyState);
    expect(toAnalyze.isNavigable).toBe(true);
    expect(toAnalyze.targetRoute).toBe('/analyze');
    expect(toAnalyze.synchronizedState.calculationMode).toBe('geometry-only');

    const toMethodology = synchronizeWorkspaceState('/analyze', '/methodology', toAnalyze.synchronizedState);
    expect(toMethodology.isNavigable).toBe(true);
    expect(toMethodology.targetRoute).toBe('/methodology');
    expect(toMethodology.synchronizedState.siteId).toBe('connecting-ridge');
  });

  test('query string formatting and parsing preserve state for /methodology route', () => {
    const state: WorkspaceSyncState = {
      siteId: 'malapert-massif',
      epochMs: 1773600000000,
      mastHeightM: 25.0,
      calculationMode: 'terrain-aware',
    };

    const qs = formatWorkspaceQueryParams(state);
    const parsed = parseWorkspaceQueryParams(qs);
    expect(parsed.siteId).toBe(state.siteId);
    expect(parsed.epochMs).toBe(state.epochMs);
    expect(parsed.mastHeightM).toBe(state.mastHeightM);
  });
});

import { describe, expect, test } from 'bun:test';
import {
  synchronizeWorkspaceState,
  parseWorkspaceQueryParams,
  formatWorkspaceQueryParams,
  resolveEffectiveTargetCoordinates,
  MISSION_WORKSPACE_ROUTES,
  type WorkspaceSyncState,
} from './scenarioSynchronization';

describe('Cross-Workspace Scenario State Synchronizer (Task 2.4)', () => {
  test('defines all 5 canonical mission control workspace routes', () => {
    expect(MISSION_WORKSPACE_ROUTES).toEqual([
      '/explore',
      '/scenario/3d-lab',
      '/compare',
      '/analyze',
      '/methodology',
    ]);
  });

  test('formats and parses workspace query params for bidirectional deep-linking', () => {
    const originalState: WorkspaceSyncState = {
      siteId: 'DM2-358',
      epochMs: 1773000000000,
      mastHeightM: 20.0,
      calculationMode: 'terrain-aware',
    };

    const queryString = formatWorkspaceQueryParams(originalState);
    expect(queryString).toContain('site=DM2-358');
    expect(queryString).toContain('epoch=1773000000000');
    expect(queryString).toContain('mast=20');

    const parsedState = parseWorkspaceQueryParams(queryString);
    expect(parsedState.siteId).toBe(originalState.siteId);
    expect(parsedState.epochMs).toBe(originalState.epochMs);
    expect(parsedState.mastHeightM).toBe(originalState.mastHeightM);
    expect(parsedState.calculationMode).toBe('terrain-aware');
  });

  test('resolves candidate site coordinates vs custom target coordinates deterministically', () => {
    // When custom target is provided, it takes precedence
    const customTarget = {
      id: 'custom-1',
      name: 'Custom Rim Spot',
      latitudeDeg: -89.45,
      longitudeDeg: 120.3,
      elevationKm: -1.25,
      createdAt: Date.now(),
    };

    const coordsFromCustom = resolveEffectiveTargetCoordinates({
      siteId: 'shackleton-connecting-ridge',
      customTarget,
    });
    expect(coordsFromCustom.latitudeDeg).toBe(-89.45);
    expect(coordsFromCustom.longitudeDeg).toBe(120.3);
    expect(coordsFromCustom.isCustom).toBe(true);

    // When custom target is null, candidate catalog coordinates are used
    const coordsFromCatalog = resolveEffectiveTargetCoordinates({
      siteId: 'shackleton-connecting-ridge',
      customTarget: null,
    });
    expect(coordsFromCatalog.latitudeDeg).toBeLessThan(-85.0);
    expect(coordsFromCatalog.isCustom).toBe(false);
  });

  test('synchronizes state transition between source and target workspace routes', () => {
    const currentState: WorkspaceSyncState = {
      siteId: 'nobile-rim-2',
      epochMs: 1774000000000,
      mastHeightM: 10.0,
      calculationMode: 'terrain-aware',
    };

    const syncResult = synchronizeWorkspaceState('/explore', '/compare', currentState);
    expect(syncResult.targetRoute).toBe('/compare');
    expect(syncResult.synchronizedState.siteId).toBe('nobile-rim-2');
    expect(syncResult.synchronizedState.epochMs).toBe(1774000000000);
    expect(syncResult.isNavigable).toBe(true);
  });
});

/**
 * Cross-Workspace Scenario State Synchronizer
 *
 * Implements bidirectional state propagation and deep-linking serialization
 * across all 5 canonical mission control workspace routes:
 * 1. /explore (Cartographic workbench)
 * 2. /scenario/3d-lab (Interactive WebGL spatial laboratory)
 * 3. /compare (Multi-criteria TOPSIS candidate site ranking)
 * 4. /analyze (Topographic obstacle elevation profile & visibility windows)
 * 5. /methodology (Astrodynamic verification & methodology)
 */

import { CalculationMode } from '@/domain/celestial/calculationMode';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';
import { getSiteById } from '@/domain/sites/catalog';

export const MISSION_WORKSPACE_ROUTES = [
  '/explore',
  '/scenario/3d-lab',
  '/compare',
  '/analyze',
  '/methodology',
] as const;

export type MissionWorkspaceRoute = (typeof MISSION_WORKSPACE_ROUTES)[number];

export interface WorkspaceSyncState {
  readonly siteId: string;
  readonly epochMs: number;
  readonly mastHeightM?: number;
  readonly calculationMode?: CalculationMode;
  readonly customTarget?: CustomLandingTarget | null;
}

export interface ResolvedCoordinates {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly isCustom: boolean;
  readonly targetName: string;
}

export interface WorkspaceSyncResult {
  readonly sourceRoute: MissionWorkspaceRoute;
  readonly targetRoute: MissionWorkspaceRoute;
  readonly synchronizedState: WorkspaceSyncState;
  readonly isNavigable: boolean;
}

/**
 * Formats scenario state into canonical URL query string.
 */
export function formatWorkspaceQueryParams(state: WorkspaceSyncState): string {
  const params = new URLSearchParams();
  if (state.siteId) params.set('site', state.siteId);
  if (state.epochMs) params.set('epoch', String(state.epochMs));
  if (state.mastHeightM !== undefined) params.set('mast', String(state.mastHeightM));
  if (state.calculationMode) params.set('mode', state.calculationMode);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Parses canonical URL query parameters into scenario state.
 */
export function parseWorkspaceQueryParams(queryString: string): WorkspaceSyncState {
  const clean = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const params = new URLSearchParams(clean);

  const siteId = params.get('site') ?? 'shackleton-connecting-ridge';
  const epochStr = params.get('epoch');
  const epochMs = epochStr ? parseInt(epochStr, 10) : 1773532800000;
  const mastStr = params.get('mast');
  const mastHeightM = mastStr ? parseFloat(mastStr) : 20.0;
  const modeStr = params.get('mode') as CalculationMode | null;
  const calculationMode: CalculationMode = modeStr === 'geometry-only' ? 'geometry-only' : 'terrain-aware';

  return {
    siteId,
    epochMs,
    mastHeightM,
    calculationMode,
  };
}

/**
 * Resolves effective latitude and longitude coordinates, prioritizing custom landing target.
 */
export function resolveEffectiveTargetCoordinates(input: {
  siteId: string;
  customTarget?: CustomLandingTarget | null;
}): ResolvedCoordinates {
  if (input.customTarget) {
    return {
      latitudeDeg: input.customTarget.latitudeDeg,
      longitudeDeg: input.customTarget.longitudeDeg,
      isCustom: true,
      targetName: input.customTarget.name,
    };
  }

  const catalogSite = getSiteById(input.siteId);
  if (catalogSite) {
    return {
      latitudeDeg: catalogSite.coordinates.latitudeDeg,
      longitudeDeg: catalogSite.coordinates.longitudeDeg,
      isCustom: false,
      targetName: catalogSite.name,
    };
  }

  // Fallback to default south pole Shackleton ridge coordinates
  return {
    latitudeDeg: -89.45,
    longitudeDeg: 119.5,
    isCustom: false,
    targetName: 'Shackleton Connecting Ridge',
  };
}

/**
 * Validates and synchronizes scenario state when transitioning between workspace routes.
 */
export function synchronizeWorkspaceState(
  source: MissionWorkspaceRoute,
  target: MissionWorkspaceRoute,
  currentState: WorkspaceSyncState
): WorkspaceSyncResult {
  const isNavigable = MISSION_WORKSPACE_ROUTES.includes(target);

  return {
    sourceRoute: source,
    targetRoute: target,
    synchronizedState: { ...currentState },
    isNavigable,
  };
}

/**
 * Single Global Scenario State Reducer
 * Governed by docs/phase-3/FRONTEND_ARCHITECTURE.md § 2.1, § 2.2 and ADR-02.
 *
 * This is the application's only scenario store. Two ids live here on purpose:
 *
 * - `primarySiteId` is the mission analysis target. Analyze, Compare, the Dossier
 *   and the URL all commit to it.
 * - `mapFocusSiteId` is map inspection focus. Clicking a map pin or a ribbon chip
 *   inspects a site in the Passport and map inspectors without moving the mission.
 *
 * `SET_PRIMARY_SITE` ends an inspection divergence, and `SET_PROJECTION` drops
 * focus when the operator leaves the map, so neither id can go stale silently.
 */

import type { CalculationMode } from '@/domain/celestial/calculationMode';
import type { CustomLandingTarget } from '@/domain/target/customTargetModel';
import { getSiteById } from '@/domain/sites/catalog';

export type { CalculationMode };

export interface GlobalScenarioState {
  primarySiteId: string;
  mapFocusSiteId: string | null;
  comparisonSiteId: string | null;
  customTarget: CustomLandingTarget | null;
  missionEpoch: {
    startUtc: string;
    stopUtc: string;
    durationDays: number;
  };
  observerMastHeightM: 1.0 | 2.0 | 5.0 | 10.0;
  sunVisibilityCriterion: 'upperLimb' | 'fullDisk';
  earthVisibilityCriterion: 'center' | 'fullDisk' | 'anyLimb';
  launchSlipOffsetDays: number;
  activePlayheadUtc: string;
  calculationMode: CalculationMode;
  hoveredAzimuthDeg: number | null;
  activeBlockerAzimuthDeg: number | null;
  activeProjection: 'explore' | 'analyze' | 'compare';
  spatialDimensionMode: '2d' | '3d';
  activeDrawer: 'none' | 'passport' | 'blocker' | 'provenance' | 'custom_coord' | 'seismic';
  calculationId: string | null;
  calculationStatus: 'valid' | 'valid-with-limitations' | 'approximate' | 'incomplete' | 'unsupported' | 'failed' | 'loading';
}

/** Landing targets are only planned inside the south-polar operational zone. */
const MIN_TARGET_LATITUDE_DEG = -90.0;
const MAX_TARGET_LATITUDE_DEG = -80.0;

export const initialScenarioState: GlobalScenarioState = {
  primarySiteId: 'connecting-ridge',
  mapFocusSiteId: null,
  comparisonSiteId: null,
  customTarget: null,
  missionEpoch: {
    startUtc: '2026-11-01T00:00:00.000Z',
    stopUtc: '2026-11-15T00:00:00.000Z',
    durationDays: 14,
  },
  observerMastHeightM: 2.0,
  sunVisibilityCriterion: 'upperLimb',
  earthVisibilityCriterion: 'center',
  launchSlipOffsetDays: 0.0,
  activePlayheadUtc: '2026-11-01T00:00:00.000Z',
  calculationMode: 'terrain-aware',
  hoveredAzimuthDeg: null,
  activeBlockerAzimuthDeg: null,
  activeProjection: 'analyze',
  spatialDimensionMode: '2d',
  activeDrawer: 'none',
  calculationId: null,
  calculationStatus: 'loading',
};

export type ScenarioAction =
  | { type: 'SET_PRIMARY_SITE'; siteId: string }
  | { type: 'SET_MAP_FOCUS'; siteId: string | null }
  | { type: 'SET_COMPARISON_SITE'; siteId: string | null }
  | { type: 'SET_CUSTOM_TARGET'; target: CustomLandingTarget | null }
  | { type: 'SET_MISSION_EPOCH'; startUtc: string; stopUtc: string; durationDays: number }
  | { type: 'SET_MAST_HEIGHT'; heightM: 1.0 | 2.0 | 5.0 | 10.0 }
  | { type: 'SET_SUN_CRITERION'; criterion: 'upperLimb' | 'fullDisk' }
  | { type: 'SET_EARTH_CRITERION'; criterion: 'center' | 'fullDisk' | 'anyLimb' }
  | { type: 'SET_LAUNCH_SLIP'; offsetDays: number }
  | { type: 'SET_PLAYHEAD_UTC'; playheadUtc: string }
  | { type: 'SET_CALCULATION_MODE'; mode: CalculationMode }
  | { type: 'SET_HOVERED_AZIMUTH'; azimuthDeg: number | null }
  | { type: 'SET_ACTIVE_BLOCKER'; azimuthDeg: number | null }
  | { type: 'SET_PROJECTION'; projection: 'explore' | 'analyze' | 'compare' }
  | { type: 'SET_DIMENSION_MODE'; mode: '2d' | '3d' }
  | { type: 'SET_ACTIVE_DRAWER'; drawer: GlobalScenarioState['activeDrawer'] }
  | { type: 'SET_CALCULATION_STATUS'; status: GlobalScenarioState['calculationStatus']; id: string | null };

/** Normalizes an ISO-8601 instant; an unparsable string returns null instead of `NaN`. */
function parseIsoInstant(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function scenarioReducer(state: GlobalScenarioState, action: ScenarioAction): GlobalScenarioState {
  switch (action.type) {
    case 'SET_PRIMARY_SITE':
      if (!getSiteById(action.siteId)) return state;
      return { ...state, primarySiteId: action.siteId, mapFocusSiteId: null, calculationStatus: 'loading' };
    case 'SET_MAP_FOCUS':
      if (action.siteId !== null && !getSiteById(action.siteId)) return state;
      return state.mapFocusSiteId === action.siteId ? state : { ...state, mapFocusSiteId: action.siteId };
    case 'SET_COMPARISON_SITE':
      if (action.siteId !== null && !getSiteById(action.siteId)) return state;
      return { ...state, comparisonSiteId: action.siteId };
    case 'SET_CUSTOM_TARGET': {
      if (!action.target) return state.customTarget === null ? state : { ...state, customTarget: null };
      const lat = Math.max(MIN_TARGET_LATITUDE_DEG, Math.min(MAX_TARGET_LATITUDE_DEG, action.target.latitudeDeg));
      const lon = ((action.target.longitudeDeg % 360.0) + 360.0) % 360.0;
      return { ...state, customTarget: { ...action.target, latitudeDeg: lat, longitudeDeg: lon } };
    }
    case 'SET_MISSION_EPOCH':
      return {
        ...state,
        missionEpoch: { startUtc: action.startUtc, stopUtc: action.stopUtc, durationDays: action.durationDays },
        activePlayheadUtc: action.startUtc,
        calculationStatus: 'loading',
      };
    case 'SET_MAST_HEIGHT':
      return { ...state, observerMastHeightM: action.heightM, calculationStatus: 'loading' };
    case 'SET_SUN_CRITERION':
      return { ...state, sunVisibilityCriterion: action.criterion, calculationStatus: 'loading' };
    case 'SET_EARTH_CRITERION':
      return { ...state, earthVisibilityCriterion: action.criterion, calculationStatus: 'loading' };
    case 'SET_LAUNCH_SLIP': {
      const offsetDays = Math.max(0.0, Math.min(28.0, action.offsetDays));
      const startMs = parseIsoInstant(state.missionEpoch.startUtc);
      if (startMs === null) return state;
      const effectiveStartUtc = new Date(startMs + offsetDays * 86400000).toISOString();
      return {
        ...state,
        launchSlipOffsetDays: offsetDays,
        activePlayheadUtc: effectiveStartUtc,
        calculationStatus: 'loading',
      };
    }
    case 'SET_PLAYHEAD_UTC':
      if (parseIsoInstant(action.playheadUtc) === null) return state;
      return state.activePlayheadUtc === action.playheadUtc ? state : { ...state, activePlayheadUtc: action.playheadUtc };
    case 'SET_CALCULATION_MODE':
      return state.calculationMode === action.mode ? state : { ...state, calculationMode: action.mode };
    case 'SET_HOVERED_AZIMUTH':
      return state.hoveredAzimuthDeg === action.azimuthDeg ? state : { ...state, hoveredAzimuthDeg: action.azimuthDeg };
    case 'SET_ACTIVE_BLOCKER':
      return state.activeBlockerAzimuthDeg === action.azimuthDeg ? state : { ...state, activeBlockerAzimuthDeg: action.azimuthDeg };
    case 'SET_PROJECTION': {
      // Leaving the map must drop inspection focus even when the projection is unchanged,
      // otherwise a stale focus id can survive a re-dispatch of the current projection.
      const mapFocusSiteId = action.projection === 'explore' ? state.mapFocusSiteId : null;
      if (state.activeProjection === action.projection && state.mapFocusSiteId === mapFocusSiteId) return state;
      return { ...state, activeProjection: action.projection, mapFocusSiteId };
    }
    case 'SET_DIMENSION_MODE':
      return state.spatialDimensionMode === action.mode ? state : { ...state, spatialDimensionMode: action.mode };
    case 'SET_ACTIVE_DRAWER':
      return { ...state, activeDrawer: action.drawer };
    case 'SET_CALCULATION_STATUS':
      return { ...state, calculationStatus: action.status, calculationId: action.id };
    default:
      return state;
  }
}

/**
 * Initial state for a cold load, honouring the deep-link contract that the legacy
 * scenario store used to own (`?site=`, `?epoch=`, `?mode=`, plus the URL sync's
 * `?mast=`/`?slip=`). Invalid parameters are ignored rather than coerced.
 */
export function createInitialGlobalScenarioState(search?: string): GlobalScenarioState {
  if (!search) return initialScenarioState;
  const clean = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(clean);
  const next: GlobalScenarioState = { ...initialScenarioState };

  const siteParam = params.get('site');
  if (siteParam && getSiteById(siteParam)) next.primarySiteId = siteParam;

  const epochParam = params.get('epoch');
  if (epochParam) {
    const epochMs = Number(epochParam);
    if (Number.isFinite(epochMs) && Math.abs(epochMs) <= 8.64e15) {
      next.activePlayheadUtc = new Date(epochMs).toISOString();
    }
  }

  const modeParam = params.get('mode');
  if (modeParam === 'geometry-only' || modeParam === 'terrain-aware') next.calculationMode = modeParam;

  const mastParam = params.get('mast');
  if (mastParam) {
    const mast = parseFloat(mastParam);
    if (mast === 1.0 || mast === 2.0 || mast === 5.0 || mast === 10.0) next.observerMastHeightM = mast;
  }

  const slipParam = params.get('slip');
  if (slipParam) {
    const slip = parseFloat(slipParam);
    if (Number.isFinite(slip) && slip >= 0 && slip <= 28) next.launchSlipOffsetDays = slip;
  }

  return next;
}

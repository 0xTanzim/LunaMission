import type { CalculationMode } from '@/domain/celestial/calculationMode';
import type { CustomLandingTarget } from '@/domain/target/customTargetModel';

/**
 * Structural view of the authoritative store that this projection reads.
 *
 * Declared locally rather than imported from `@/app/state/scenarioReducer` so this model
 * module stays free of application-layer imports; the store satisfies it structurally.
 */
export interface ScenarioStoreView {
  primarySiteId: string;
  mapFocusSiteId: string | null;
  customTarget: CustomLandingTarget | null;
  activePlayheadUtc: string;
  calculationMode: CalculationMode;
}

/**
 * The canonical scenario inputs every scientific view derives from.
 *
 * This is a projection of the single authoritative store, never a second copy of
 * it: `selectedSiteId` is the *inspected* site, which is the mission target unless
 * a map inspection is in progress.
 */
export interface ScenarioState {
  selectedSiteId: string;
  customTarget: CustomLandingTarget | null;
  epochMs: number;
  calculationMode: CalculationMode;
}

/** The site the map-facing panels show: inspection focus wins over the committed target. */
export function resolveInspectedSiteId(
  state: Pick<ScenarioStoreView, 'primarySiteId' | 'mapFocusSiteId'>,
): string {
  return state.mapFocusSiteId ?? state.primarySiteId;
}

/**
 * Pure projection of the authoritative store into the inputs a scientific view needs.
 *
 * An unparsable playhead cannot occur through the reducer, which rejects it, so the
 * fallback here is a total function rather than a silent substitution of "now".
 */
export function deriveScenarioState(
  state: Pick<
    ScenarioStoreView,
    'primarySiteId' | 'mapFocusSiteId' | 'customTarget' | 'activePlayheadUtc' | 'calculationMode'
  >,
): ScenarioState {
  return {
    selectedSiteId: resolveInspectedSiteId(state),
    customTarget: state.customTarget,
    epochMs: Date.parse(state.activePlayheadUtc),
    calculationMode: state.calculationMode,
  };
}

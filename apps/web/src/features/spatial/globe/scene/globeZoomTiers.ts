import { DEEP_ZOOM_DISTANCE_UNITS } from '@/features/spatial/globe/scene/globeScene';

/**
 * Named zoom tiers for the polar observatory (SP-11).
 *
 * Three bands on the camera-to-target distance ladder, anchored to the presets that
 * actually exist:
 *   Regional  ≥ 0.35   — Global context, site overview, and the opening cap framing.
 *   Site      0.15–0.35 — Close analytical study; every reference overlay stays on.
 *   Local     < 0.15   — Terrain inspection depth; overview geometry yields.
 *
 * The Local boundary is the SAME threshold as the deep-zoom overlay gate
 * (`DEEP_ZOOM_DISTANCE_UNITS`) — one threshold, one truth. LOD hysteresis remains in
 * the terrain engine (0.28/0.38, inside the Site band).
 */

export type ZoomTier = 'regional' | 'site' | 'local';

export const ZOOM_TIER_REGIONAL_MIN_UNITS = 0.35;
export const ZOOM_TIER_LOCAL_MAX_UNITS = DEEP_ZOOM_DISTANCE_UNITS;

export function getZoomTier(distToTarget: number): ZoomTier {
  if (distToTarget >= ZOOM_TIER_REGIONAL_MIN_UNITS) return 'regional';
  if (distToTarget >= ZOOM_TIER_LOCAL_MAX_UNITS) return 'site';
  return 'local';
}

export interface TierLabelDensity {
  /** Cap on simultaneously visible crater nomenclature labels. */
  maxCraterLabels: number;
}

/**
 * Label density per tier: the full nomenclature at Regional, the four most relevant
 * craters while studying a site, and none at Local where terrain fills the frame.
 */
const TIER_LABEL_DENSITY: Record<ZoomTier, TierLabelDensity> = {
  regional: { maxCraterLabels: Number.POSITIVE_INFINITY },
  site: { maxCraterLabels: 4 },
  local: { maxCraterLabels: 0 },
};

export function getTierLabelDensity(tier: ZoomTier): TierLabelDensity {
  return TIER_LABEL_DENSITY[tier];
}

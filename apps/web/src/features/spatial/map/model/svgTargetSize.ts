/**
 * WCAG 2.2 SC 2.5.8 (Target Size — Minimum) for controls drawn inside an SVG.
 *
 * The polar map and its overlays are one 600×600 viewBox scaled to fit the map
 * pane. A hit radius expressed in user units therefore shrinks with the pane: a
 * 36-unit pin target measured 31.6 CSS px at 1440 but 19.2 CSS px at 390, which is
 * below the 24 px minimum. The fix is to derive the hit radius from the rendered
 * scale so the target stays at least `MIN_TARGET_PX` in CSS pixels at every width,
 * while never shrinking the generous desktop target that already works.
 */

/** WCAG 2.2 SC 2.5.8 minimum target size in CSS pixels. */
export const MIN_TARGET_PX = 24;

/** Existing generous candidate-pin hit radius, in viewBox units. */
export const PIN_HIT_RADIUS_UNITS = 18;

/** Existing generous selected-pin hit radius, in viewBox units. */
export const SELECTED_PIN_HIT_RADIUS_UNITS = 20;

/** Existing generous Sun/Earth vector badge hit radius, in viewBox units. */
export const BADGE_HIT_RADIUS_UNITS = 18;

/**
 * Hit radius in viewBox units that renders at no less than the WCAG minimum.
 *
 * @param cssPerUnit rendered CSS pixels per viewBox unit (`min(width, height) / viewBoxSize`)
 * @param floorUnits the hit radius already in use, kept as the upper bound of comfort
 */
export function hitRadiusUnits(cssPerUnit: number, floorUnits: number): number {
  if (!Number.isFinite(cssPerUnit) || cssPerUnit <= 0) return floorUnits;
  return Math.max(floorUnits, MIN_TARGET_PX / 2 / cssPerUnit);
}

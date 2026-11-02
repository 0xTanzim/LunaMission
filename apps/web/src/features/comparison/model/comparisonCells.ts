/**
 * Cell text for the comparison matrix.
 *
 * Each function formats a whole availability result into the one string the
 * cell used to render, so an unavailable value stays an explicit em dash and
 * no numeric zero is invented. Values are interpolated raw: the ephemeris
 * already rounds them, and re-formatting would change what the matrix reports.
 */

import { BadgeVariant } from '@/shared/ui/Badge';
import { ResultAvailability } from '@/domain/celestial/availability';
import { EarthVisibilityState, IlluminationState } from '@/domain/celestial/observationStates';
import { UNAVAILABLE_PLACEHOLDER } from '@/shared/formatting/availability';

/** `+4.32°`, `-1.10°`, or the unavailable placeholder. */
export function signedAngleCell(angle: ResultAvailability<number>): string {
  if (angle.kind !== 'available') return UNAVAILABLE_PLACEHOLDER;
  return `${angle.value > 0 ? '+' : ''}${angle.value}°`;
}

/** `214.5°`, or the unavailable placeholder — bearings are unsigned by convention. */
export function unsignedAngleCell(angle: ResultAvailability<number>): string {
  if (angle.kind !== 'available') return UNAVAILABLE_PLACEHOLDER;
  return `${angle.value}°`;
}

/** `1.283 s`, or the unavailable placeholder. */
export function secondsCell(seconds: ResultAvailability<number>): string {
  if (seconds.kind !== 'available') return UNAVAILABLE_PLACEHOLDER;
  return `${seconds.value} s`;
}

export interface BadgeCellContent {
  variant: BadgeVariant;
  label: string;
}

/**
 * Illumination wording. `indeterminate` has no distinct claim to make, so it is
 * reported as the shadowed case exactly as the matrix did before.
 */
export const ILLUMINATION_BADGE_CELLS: Record<IlluminationState, BadgeCellContent> = {
  illuminated: { variant: 'success', label: 'Fully Illuminated' },
  'partial-penumbra': { variant: 'warning', label: 'Grazing Penumbra' },
  shadowed: { variant: 'danger', label: 'Shadowed' },
  indeterminate: { variant: 'danger', label: 'Shadowed' },
};

/** Direct line-of-sight wording, including the limb-grazing band. */
export const EARTH_VISIBILITY_BADGE_CELLS: Record<EarthVisibilityState, BadgeCellContent> = {
  visible: { variant: 'success', label: 'Line-of-Sight Available' },
  indeterminate: { variant: 'warning', label: 'Limb Grazing' },
  'sub-horizon': { variant: 'danger', label: 'Sub-Horizon (No LOS)' },
  unavailable: { variant: 'danger', label: 'Sub-Horizon (No LOS)' },
};

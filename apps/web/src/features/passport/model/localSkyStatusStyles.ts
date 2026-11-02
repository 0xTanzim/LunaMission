import { clearanceVerdict } from '@/features/passport/model/localSkyReadouts';

/**
 * Status colour vocabulary for horizon clearance. Clearance verdicts are computed
 * in `localSkyReadouts`; this module only maps a verdict to Tailwind tokens, so a
 * 'clear' row can never be green in one view and amber in another.
 */

export const CLEAR_BADGE = 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)]';export const ROSE_BADGE = 'bg-[var(--lm-color-danger-surface-strong)] text-[var(--lm-color-danger)] border border-[var(--lm-color-danger-border)]';
export const AMBER_BADGE = 'bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning-border)]';

/** Unknown clearance: neutral, and never coloured as if it were a verdict. */
export const CARD_INDETERMINATE_BADGE =
  'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-muted)] border border-[var(--lm-color-border)]';
export const TABLE_INDETERMINATE_BADGE =
  'bg-[var(--lm-color-surface)] text-[var(--lm-color-text-muted)] border border-[var(--lm-color-border)]';

export const COLOR_DANGER = 'text-[var(--lm-color-danger)]';
export const COLOR_WARNING = 'text-[var(--lm-color-warning)]';
/** Shared badge chrome; only the tone changes with the verdict. */
export const CLEARANCE_BADGE_BASE = 'px-1.5 py-0.5 rounded-xs text-[11px] font-mono';
const COLOR_MUTED = 'text-[var(--lm-color-text-muted)]';
const COLOR_CLEAR = 'text-[var(--lm-color-selected-site)]';

export function clearanceBadgeClass(
  clearanceDeg: number | null,
  indeterminateBadge: string,
  obscuredBadge: string,
): string {
  const verdict = clearanceVerdict(clearanceDeg);
  if (verdict === 'indeterminate') return indeterminateBadge;
  return verdict === 'clear' ? CLEAR_BADGE : obscuredBadge;
}

/** Text tone for a clearance number; Earth obstruction reads as a warning, not an error. */
export function clearanceValueTone(clearanceDeg: number | null, obscuredColor = COLOR_DANGER): string {
  const verdict = clearanceVerdict(clearanceDeg);
  if (verdict === 'indeterminate') return COLOR_MUTED;
  return verdict === 'clear' ? COLOR_CLEAR : obscuredColor;
}

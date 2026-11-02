/**
 * Canvas palette — design tokens resolved for 2D drawing.
 *
 * A canvas context cannot consume a CSS custom property, so every chart colour would
 * normally become a literal hex outside `styles/design-tokens.css`. Instead each colour
 * is named by its *role* here and resolved from the token file once, at first draw.
 *
 * If the roles cannot be resolved (a non-DOM host such as the static render used by the
 * tests) a role resolves to `transparent` rather than to an invented colour: a missing
 * palette must never masquerade as a designed one.
 */

const TOKEN_BY_ROLE = {
  canvas: '--lm-color-canvas',
  surface: '--lm-color-surface',
  surfaceRaised: '--lm-color-surface-raised',
  surfaceStrong: '--lm-color-surface-strong',
  border: '--lm-color-border',
  borderSubtle: '--lm-color-border-subtle',
  borderStrong: '--lm-color-border-strong',
  textPrimary: '--lm-color-text-primary',
  textSecondary: '--lm-color-text-secondary',
  textMuted: '--lm-color-text-muted',
  sun: '--lm-color-sun',
  earth: '--lm-color-earth',
  info: '--lm-color-info',
  infoSurface: '--lm-color-info-surface',
  infoSurfaceStrong: '--lm-color-info-surface-strong',
  infoBorder: '--lm-color-info-border',
  success: '--lm-color-success',
  successSurface: '--lm-color-success-surface',
  successBorder: '--lm-color-success-border',
  warning: '--lm-color-warning',
  warningSurface: '--lm-color-warning-surface',
  warningBorder: '--lm-color-warning-border',
  danger: '--lm-color-danger',
  dangerSurface: '--lm-color-danger-surface',
  dangerBorder: '--lm-color-danger-border',
  focus: '--lm-color-focus',
  seriesB: '--lm-color-series-b',
} as const;

export type ChartRole = keyof typeof TOKEN_BY_ROLE;
export type ChartPalette = Readonly<Record<ChartRole, string>>;

/** The custom properties this module reads, in declaration order. */
export const CHART_TOKEN_NAMES: readonly string[] = Object.values(TOKEN_BY_ROLE);

const UNRESOLVED = 'transparent';

let resolved: ChartPalette | null = null;

function resolve(): ChartPalette {
  const roles = Object.keys(TOKEN_BY_ROLE) as ChartRole[];
  const host = typeof document !== 'undefined' ? document.documentElement : null;
  const computed = host ? getComputedStyle(host) : null;
  const palette = {} as Record<ChartRole, string>;
  for (const role of roles) {
    const value = computed?.getPropertyValue(TOKEN_BY_ROLE[role]).trim() ?? '';
    palette[role] = value.length > 0 ? value : UNRESOLVED;
  }
  return palette;
}

/** Design-token roles for canvas drawing. Resolved once per page load. */
export function chartPalette(): ChartPalette {
  if (!resolved) resolved = resolve();
  return resolved;
}

/** Test seam: forces the next `chartPalette()` call to re-read the tokens. */
export function resetChartPalette(): void {
  resolved = null;
}

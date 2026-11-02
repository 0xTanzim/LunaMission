/**
 * Radar Chart Mathematics & Physical Ratio Normalization
 * Governed by lunar-landing-site-science & docs/SCIENCE_FEASIBILITY.md
 * Eliminates arbitrary composite scores; normalizes strictly to physical bounding limits.
 *
 * The radar is a qualitative summary, not a ranking. Its only job is to show the *shape* of a
 * candidate's trade-offs on five axes that each have a stated physical endpoint, so the view
 * can label every axis with the normalisation it uses and refuse to imply an ordering.
 *
 * Every axis reading carries both the 0–100% axis position and the physical value it came from,
 * in that value's own unit. When an axis has no physical bound to normalize against — the
 * elevation axis in a cohort where every candidate shares one elevation — the reading is
 * `null` rather than a midpoint, because a midpoint renders as data.
 */

import type { RankedFeasibleCandidate } from '@luna/contracts';

export interface RadarAxisDefinition {
  key: 'solar' | 'darkness' | 'dte' | 'safety' | 'elevation';
  label: string;
  description: string;
  unit: string;
  /** How the 0–100% axis position is formed. Printed in the UI, next to the chart. */
  normalisation: string;
  /** What 100% and 0% mean, in physical terms. */
  bound: string;
}

export const RADAR_AXES: RadarAxisDefinition[] = [
  {
    key: 'solar',
    label: 'Continuous Sun',
    description: 'Continuous Sunlight Ratio (% of window)',
    unit: '%',
    normalisation: 'longest continuous sunlight ÷ evaluation window',
    bound: '100% = sunlight for the whole window · 0% = no continuous sunlight',
  },
  {
    key: 'darkness',
    label: 'Darkness Survival',
    description: 'Darkness Buffer (% of window free of max dark)',
    unit: '%',
    normalisation: '(evaluation window − longest continuous darkness) ÷ evaluation window',
    bound: '100% = no darkness at all · 0% = darkness for the whole window',
  },
  {
    key: 'dte',
    label: 'Earth LoS',
    description:
      'Geometric Earth line-of-sight fraction of the evaluation interval (%) — not an RF link budget',
    unit: '%',
    normalisation: 'cumulative Earth line-of-sight hours ÷ evaluation window',
    bound: '100% = Earth above the local horizon for the whole window · 0% = never',
  },
  {
    key: 'safety',
    label: 'Slope Safety',
    description: 'Slope Margin to 45° tip-over limit (%)',
    unit: '%',
    normalisation: '(45° − nominal point slope) ÷ 45°',
    bound: '100% = a level landing point · 0% = a 45° slope, the tip-over limit',
  },
  {
    key: 'elevation',
    label: 'Elevation Advantage',
    description: 'Relative Topographic Height Advantage (%)',
    unit: '%',
    normalisation: 'elevation ÷ the cohort’s own elevation span',
    bound: '100% = the cohort’s highest candidate · 0% = its lowest — a relative position, not a merit',
  },
];

export interface CandidateRadarRatios {
  solarRatio: number;
  darknessRatio: number;
  dteRatio: number;
  safetyRatio: number;
  /** `null` when the cohort has no elevation spread to normalize against. */
  elevationRatio: number | null;
}

export interface ElevationCohortBounds {
  minElevationMeters: number;
  maxElevationMeters: number;
}

const clampPercent = (val: number): number => Math.min(100.0, Math.max(0.0, val));

/**
 * Normalizes candidate physical metrics to 0-100% ratios along physical boundaries.
 */
export function calculateCandidateRadarRatios(
  candidate: RankedFeasibleCandidate,
  totalEvaluationHours: number,
  elevationBounds?: ElevationCohortBounds,
): CandidateRadarRatios {
  const effectiveHours = Math.max(1.0, totalEvaluationHours);
  const m = candidate.metrics;

  // 1. Continuous sunlight ratio relative to evaluation window
  const solarRatio = clampPercent((m.longestContinuousSunlightHours / effectiveHours) * 100.0);

  // 2. Darkness survivability: (1 - (maxDark / totalHours)) * 100%
  const darknessRatio = clampPercent((1.0 - m.maxContinuousDarknessHours / effectiveHours) * 100.0);

  // 3. Direct-to-Earth visibility percentage
  const dteRatio = clampPercent((m.cumulativeDteHours / effectiveHours) * 100.0);

  // 4. Slope safety margin relative to 45° tip-over limit
  const safetyRatio = clampPercent(((45.0 - m.landingSlopeDeg) / 45.0) * 100.0);

  // 5. Elevation advantage relative to the cohort's own span. A cohort whose candidates all sit
  // at one elevation has no span to normalize against, so the axis is unknown — never a 50% that
  // would read as a measured midpoint.
  let elevationRatio: number | null = null;
  if (elevationBounds && elevationBounds.maxElevationMeters > elevationBounds.minElevationMeters) {
    const span = elevationBounds.maxElevationMeters - elevationBounds.minElevationMeters;
    elevationRatio = clampPercent(
      ((candidate.coordinates.elevationMeters - elevationBounds.minElevationMeters) / span) * 100.0,
    );
  }

  return {
    solarRatio,
    darknessRatio,
    dteRatio,
    safetyRatio,
    elevationRatio,
  };
}

export interface RadarAxisReading {
  readonly key: RadarAxisDefinition['key'];
  readonly label: string;
  readonly normalisation: string;
  readonly bound: string;
  /** 0–100 axis position, or `null` when the axis has no physical bound to normalize against. */
  readonly ratio: number | null;
  /** The physical value in its own unit, e.g. `336.0 h`. */
  readonly valueText: string;
  readonly unavailableReason?: string;
}

const ELEVATION_UNAVAILABLE =
  'Every candidate in this cohort shares one elevation, so there is no cohort span to normalize against.';

/** Per-axis readings for one candidate: the axis position and the value it came from. */
export function readRadarProfile(
  candidate: RankedFeasibleCandidate,
  totalEvaluationHours: number,
  elevationBounds?: ElevationCohortBounds,
): RadarAxisReading[] {
  const ratios = calculateCandidateRadarRatios(candidate, totalEvaluationHours, elevationBounds);
  const m = candidate.metrics;

  const readings: RadarAxisReading[] = [
    {
      key: 'solar',
      label: RADAR_AXES[0].label,
      normalisation: RADAR_AXES[0].normalisation,
      bound: RADAR_AXES[0].bound,
      ratio: ratios.solarRatio,
      valueText: `${m.longestContinuousSunlightHours.toFixed(1)} h`,
    },
    {
      key: 'darkness',
      label: RADAR_AXES[1].label,
      normalisation: RADAR_AXES[1].normalisation,
      bound: RADAR_AXES[1].bound,
      ratio: ratios.darknessRatio,
      valueText: `${m.maxContinuousDarknessHours.toFixed(1)} h`,
    },
    {
      key: 'dte',
      label: RADAR_AXES[2].label,
      normalisation: RADAR_AXES[2].normalisation,
      bound: RADAR_AXES[2].bound,
      ratio: ratios.dteRatio,
      valueText: `${m.cumulativeDteHours.toFixed(1)} h`,
    },
    {
      key: 'safety',
      label: RADAR_AXES[3].label,
      normalisation: RADAR_AXES[3].normalisation,
      bound: RADAR_AXES[3].bound,
      ratio: ratios.safetyRatio,
      valueText: `${m.landingSlopeDeg.toFixed(1)}°`,
    },
    {
      key: 'elevation',
      label: RADAR_AXES[4].label,
      normalisation: RADAR_AXES[4].normalisation,
      bound: RADAR_AXES[4].bound,
      ratio: ratios.elevationRatio,
      valueText: `${candidate.coordinates.elevationMeters.toLocaleString()} m`,
      unavailableReason: ratios.elevationRatio === null ? ELEVATION_UNAVAILABLE : undefined,
    },
  ];

  return readings;
}

/**
 * Computes SVG (x, y) coordinates for a given axis index (0..4) and normalized value (0..100).
 * Top axis (index 0) points straight up at -PI/2.
 */
export function getRadarAxisPoint(
  axisIndex: number,
  valuePercent: number,
  center: { cx: number; cy: number },
  radius: number,
): { x: number; y: number } {
  const totalAxes = 5;
  const angle = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / totalAxes;
  const r = (clampPercent(valuePercent) / 100.0) * radius;

  return {
    x: center.cx + r * Math.cos(angle),
    y: center.cy + r * Math.sin(angle),
  };
}

/**
 * Generates an SVG polygon points string ("x1,y1 x2,y2 ...") from array of 5 ratios.
 */
export function generateRadarPolygonPoints(
  values: number[],
  center: { cx: number; cy: number },
  radius: number,
): string {
  return values
    .map((val, idx) => {
      const pt = getRadarAxisPoint(idx, val, center, radius);
      return `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Polygon points for a profile with unknown axes: the unknown axis contributes no vertex, so the
 * drawn shape has a visible gap instead of an invented midpoint.
 */
export function generateRadarPolygonPointsGapped(
  values: readonly (number | null)[],
  center: { cx: number; cy: number },
  radius: number,
): string {
  return values
    .map((val, idx) => (val === null ? null : getRadarAxisPoint(idx, val, center, radius)))
    .filter((point): point is { x: number; y: number } => point !== null)
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ');
}

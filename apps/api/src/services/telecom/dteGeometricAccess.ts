/**
 * Direct-to-Earth (DTE) *geometric* line-of-sight access.
 *
 * What this observable is: the Earth direction clears the local terrain horizon by a
 * non-negative margin at the evaluated observer height. It is a pointing/clearance geometry
 * statement.
 *
 * What it is NOT: an RF link budget. The governing invariant —
 * **"geometric Earth visibility is not an RF link budget"** — means a clear line of sight says
 * nothing about carrier-to-noise ratio, link margin or usable data rate. Link closure needs a
 * separate budget (transmit power, antenna gains, band, system noise temperature, data rate,
 * modulation/coding, required Eb/N0) computed by `calculateRfLinkBudget` in `./linkBudget`.
 * Every payload here therefore carries `rfLinkClosureAssessed: false` plus the caveat list.
 *
 * No astronomy is performed here: elevations/statuses come from an already-evaluated scenario.
 */

import { earthIntervalStatusEnum, type EarthIntervalStatus } from '@luna/contracts';

/** Structural view of one evaluated scenario sub-interval's `earth` block. */
export interface EvaluatedEarthStepSource {
  startEpochMs: number;
  endEpochMs: number;
  earth: {
    status: string;
    meanElevationDeg: number;
    clearanceDeg: number;
  };
}

export interface GeometricDteWindow {
  startEpochMs: number;
  endEpochMs: number;
  startDateUtc: string;
  endDateUtc: string;
  durationHours: number;
  /** Lowest Earth-direction elevation inside the window, degrees. */
  minimumEarthElevationDeg: number;
}

export type GeometricDteStatus = 'valid' | 'incomplete';

export interface GeometricDteAccessResult {
  /** Discriminates this observable from an RF link result. */
  observable: 'geometric_earth_line_of_sight';
  status: GeometricDteStatus;
  /** Explicit user-facing label; the phrase "line-of-sight" must survive any relabelling. */
  label: string;
  /** Always false: this module performs no link-budget arithmetic. */
  rfLinkClosureAssessed: false;
  /** Always false: no RF budget fields are included in this payload. */
  rfLinkBudgetIncluded: false;
  windows: GeometricDteWindow[];
  totalAccessHours: number;
  /** Access hours divided by covered evaluated hours, percent (0 when nothing is covered). */
  accessAvailabilityPercent: number;
  /** True when the supplied intervals tile the requested span without gaps or overlap. */
  coverageComplete: boolean;
  caveats: string[];
}

interface ValidatedEarthStep {
  startEpochMs: number;
  endEpochMs: number;
  status: EarthIntervalStatus;
  meanElevationDeg: number;
  clearanceDeg: number;
}

/** Statuses that mean the Earth direction cleared the terrain horizon. */
const LINE_OF_SIGHT_STATUSES: ReadonlySet<EarthIntervalStatus> = new Set<EarthIntervalStatus>([
  'visible',
  'earth_direct',
]);

const MS_PER_HOUR = 3_600_000;

const DTE_LABEL =
  'Geometric Earth line-of-sight (terrain clearance of the evaluated Earth direction) — ' +
  'not an RF link budget and not a statement of link closure';

export const DTE_GEOMETRIC_CAVEATS: readonly string[] = [
  'Geometric line-of-sight only: this is the clearance of the evaluated Earth direction above ' +
    'the local terrain horizon at the stated observer height. It establishes neither carrier ' +
    'lock nor link closure.',
  'Link closure requires an independent RF link budget for stated transmit power, antenna ' +
    'gains and efficiency, carrier band, receiving-system noise temperature, data rate, ' +
    'modulation/coding and required Eb/N0. A clear line of sight with an inadequate budget ' +
    'still yields no usable link, and a marginal budget can close only at a reduced data rate.',
  'Grazing behaviour: the horizon is a maximum over terrain samples, so near the skyline a ' +
    'small change in terrain height, observer position or observer height can flip the ' +
    'clearance sign. Clearance in degrees is not a physical timing or availability accuracy.',
  'No refraction, diffraction, multipath, ionospheric/plasma, antenna pointing-loss or ' +
    'ground-station scheduling effects are modelled in this observable.',
  'Terrain clearance assumes an unobstructed solid angle to the evaluated Earth direction at ' +
    'the evaluated observer height. No antenna gimbal travel limit, articulation limit or ' +
    'spacecraft body occlusion is applied.',
  'Relay availability is a separate observable requiring an orbital-relay state/ephemeris ' +
    'product, which this repository does not provide. These direct-to-Earth windows neither ' +
    'imply nor exclude relay coverage.',
];

function round6(value: number): number {
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded === 0 ? 0 : rounded;
}

/** Validates the incoming status strings; an unknown solver state must never read as "blocked". */
function validate(intervals: readonly EvaluatedEarthStepSource[]): ValidatedEarthStep[] {
  return intervals.map((interval) => {
    const status = earthIntervalStatusEnum.parse(interval.earth.status);
    if (interval.endEpochMs <= interval.startEpochMs) {
      throw new RangeError('DTE interval endEpochMs must be strictly greater than startEpochMs');
    }
    if (
      !Number.isFinite(interval.earth.meanElevationDeg) ||
      !Number.isFinite(interval.earth.clearanceDeg)
    ) {
      throw new RangeError('DTE interval elevations and clearances must be finite numbers');
    }
    return {
      startEpochMs: interval.startEpochMs,
      endEpochMs: interval.endEpochMs,
      status,
      meanElevationDeg: interval.earth.meanElevationDeg,
      clearanceDeg: interval.earth.clearanceDeg,
    };
  });
}

/** Merges adjacent line-of-sight intervals into continuous geometric access windows. */
function mergeWindows(intervals: readonly ValidatedEarthStep[]): GeometricDteWindow[] {
  const windows: GeometricDteWindow[] = [];
  for (const interval of intervals) {
    if (!LINE_OF_SIGHT_STATUSES.has(interval.status)) continue;
    if (interval.clearanceDeg < 0) continue;
    const last = windows[windows.length - 1];
    if (last && last.endEpochMs === interval.startEpochMs) {
      last.endEpochMs = interval.endEpochMs;
      last.endDateUtc = new Date(interval.endEpochMs).toISOString();
      last.durationHours = round6((last.endEpochMs - last.startEpochMs) / MS_PER_HOUR);
      last.minimumEarthElevationDeg = Math.min(
        last.minimumEarthElevationDeg,
        interval.meanElevationDeg,
      );
      continue;
    }
    windows.push({
      startEpochMs: interval.startEpochMs,
      endEpochMs: interval.endEpochMs,
      startDateUtc: new Date(interval.startEpochMs).toISOString(),
      endDateUtc: new Date(interval.endEpochMs).toISOString(),
      durationHours: round6((interval.endEpochMs - interval.startEpochMs) / MS_PER_HOUR),
      minimumEarthElevationDeg: interval.meanElevationDeg,
    });
  }
  return windows;
}

/**
 * Summarises evaluated Earth geometry into direct-to-Earth geometric access windows.
 *
 * Throws a `ZodError` when an interval carries an unrecognised Earth status, so an unknown
 * solver state can never be silently treated as "no line of sight".
 */
export function evaluateGeometricDteAccess(
  intervals: readonly EvaluatedEarthStepSource[],
): GeometricDteAccessResult {
  const validated = validate(intervals);

  let coveredHours = 0;
  let previousEndMs: number | null = null;
  let coverageComplete = true;
  let overlapping = false;

  for (const interval of validated) {
    coveredHours += (interval.endEpochMs - interval.startEpochMs) / MS_PER_HOUR;
    if (previousEndMs !== null) {
      if (interval.startEpochMs > previousEndMs + 1000) coverageComplete = false;
      if (interval.startEpochMs < previousEndMs) overlapping = true;
    }
    previousEndMs = Math.max(previousEndMs ?? interval.endEpochMs, interval.endEpochMs);
  }
  if (overlapping) coverageComplete = false;

  const windows = mergeWindows(validated);
  const totalAccessHours = windows.reduce((sum, window) => sum + window.durationHours, 0);
  const caveats = [...DTE_GEOMETRIC_CAVEATS];
  if (validated.length === 0) {
    caveats.push(
      'No evaluated intervals were supplied, so no geometric direct-to-Earth access can be ' +
        'reported. This is an absence of input, not a demonstration that Earth is occluded.',
    );
  }
  if (!coverageComplete) {
    caveats.push(
      'Evaluated intervals do not tile the requested span without gaps or overlaps, so access ' +
        'duration and availability are incomplete over the covered span.',
    );
  }

  return {
    observable: 'geometric_earth_line_of_sight',
    status: coverageComplete ? 'valid' : 'incomplete',
    label: DTE_LABEL,
    rfLinkClosureAssessed: false,
    rfLinkBudgetIncluded: false,
    windows: windows.map((window) => ({
      ...window,
      minimumEarthElevationDeg: round6(window.minimumEarthElevationDeg),
    })),
    totalAccessHours: round6(totalAccessHours),
    accessAvailabilityPercent:
      coveredHours > 0 ? round6((100 * totalAccessHours) / coveredHours) : 0,
    coverageComplete,
    caveats,
  };
}

/**
 * Sun/Earth trajectory model for the 360° panorama.
 *
 * Scientific-integrity contract: the only topocentric states the browser receives are the
 * backend's per-sub-interval values on `EvaluatedSubInterval`. Those are *published samples*
 * (one server-evaluated az/el pair per sub-interval). Everything between two samples is a
 * straight line drawn by this module — visibly marked as interpolation, never presented as an
 * ephemeris evaluation. No position is computed here.
 */

import type { EvaluatedSubInterval } from '@luna/contracts';
import { normalizeAzimuthDeg } from './skyRibbonProjection';
import { finiteOrNull } from './skyRibbonFormat';

export type TrajectoryBody = 'sun' | 'earth';

export interface TrajectorySample {
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
  /** Start epoch of the sub-interval this published value belongs to. */
  readonly epochMs: number;
  readonly windowLabel: string;
}

export interface TrajectorySeries {
  readonly body: TrajectoryBody;
  readonly samples: readonly TrajectorySample[];
  /** Azimuth-continuous runs; the renderer never joins two runs. */
  readonly runs: readonly (readonly TrajectorySample[])[];
  /** Joins suppressed because the bearing seam / a jump would imply a path never measured. */
  readonly seamBreaks: number;
}

/** A bearing step wider than this cannot be drawn as a trajectory on a linear axis. */
export const TRAJECTORY_MAX_JOIN_DEG = 90;

function label(interval: EvaluatedSubInterval): string {
  const start = interval.startDateUtc.slice(11, 16);
  const end = interval.endDateUtc.slice(11, 16);
  return `${start}–${end}Z`;
}

export function buildTrajectory(
  intervals: readonly EvaluatedSubInterval[],
  body: TrajectoryBody,
): TrajectorySeries {
  const samples: TrajectorySample[] = [];
  for (const interval of intervals) {
    const source = body === 'sun' ? interval.sun : interval.earth;
    const azimuthDeg = finiteOrNull(source.meanAzimuthDeg);
    const elevationDeg = finiteOrNull(source.meanElevationDeg);
    if (azimuthDeg === null || elevationDeg === null) continue;
    samples.push({
      azimuthDeg: normalizeAzimuthDeg(azimuthDeg),
      elevationDeg,
      epochMs: interval.startEpochMs,
      windowLabel: label(interval),
    });
  }
  samples.sort((a, b) => a.epochMs - b.epochMs);

  const runs: TrajectorySample[][] = [];
  let seamBreaks = 0;
  let current: TrajectorySample[] = [];
  for (const sample of samples) {
    const previous = current.at(-1);
    if (previous) {
      const step = Math.abs(sample.azimuthDeg - previous.azimuthDeg);
      if (step > TRAJECTORY_MAX_JOIN_DEG) {
        seamBreaks += 1;
        runs.push(current);
        current = [];
      }
    }
    current.push(sample);
  }
  if (current.length > 0) runs.push(current);

  return { body, samples, runs, seamBreaks };
}

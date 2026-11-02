/**
 * Terrain skyline normalization for the Dual-Panel Sky-Ribbon.
 *
 * The backend publishes `horizonProfile` bins (ray-marched LOLA samples). This module only
 * *normalizes, sorts and groups* those samples: it never interpolates between bins, never
 * extrapolates beyond them, and never replaces a missing elevation with a flat 0° horizon.
 *
 * Sample-vs-interpolation contract (docs/ui/INSTRUMENTS.md): a sample is a published bin; the
 * straight run drawn between two adjacent bins is browser rendering, not a survey. `runs`
 * therefore groups bins only where the azimuth step is continuous, so the renderer can leave a
 * visible gap instead of drawing a ridge across azimuths that were never measured.
 */

import type { EvaluatedSubInterval } from '@luna/contracts';
import type { HorizonProfileBin } from './skyRibbonRenderer';
import { normalizeAzimuthDeg } from './skyRibbonProjection';
import { finiteOrNull } from './skyRibbonFormat';

/** Where a skyline sample came from — the two are not the same measurement. */
export type SkylineSource = 'horizon-bin' | 'interval-mean';

export interface SkylineSample {
  readonly azimuthDeg: number;
  readonly nominalDeg: number;
  readonly lowDeg: number | null;
  readonly highDeg: number | null;
  /** Absent on literals built by callers that do not care; treated as `horizon-bin`. */
  readonly source?: SkylineSource;
}

/** Two adjacent bins further apart than this were not measured as a continuum. */
export const SKYLINE_MIN_GAP_DEG = 2;

/**
 * Normalizes backend horizon bins for drawing/selection. A bin with no usable nominal
 * elevation is dropped rather than rendered as open sky; the panels then state explicitly
 * that no skyline telemetry exists.
 */
export function toSkylineSamples(
  bins?: readonly HorizonProfileBin[],
  source: SkylineSource = 'horizon-bin',
): SkylineSample[] {
  if (!bins || bins.length === 0) return [];
  const samples: SkylineSample[] = [];
  for (const bin of bins) {
    if (!Number.isFinite(bin.azimuthDeg)) continue;
    const nominalDeg = finiteOrNull(bin.thetaNomDeg) ?? finiteOrNull(bin.elevationDeg);
    if (nominalDeg === null) continue;
    samples.push({
      azimuthDeg: normalizeAzimuthDeg(bin.azimuthDeg),
      nominalDeg,
      lowDeg: finiteOrNull(bin.thetaLowDeg),
      highDeg: finiteOrNull(bin.thetaHighDeg),
      source,
    });
  }
  samples.sort((a, b) => a.azimuthDeg - b.azimuthDeg);
  return samples;
}

/**
 * Payloads that omit the optional `horizonProfile` still carry the backend's
 * per-sub-interval mean skyline sample. This re-shapes those samples into bin form
 * (no interpolation); the deck then prefers `horizonProfile` whenever present.
 */
export function horizonBinsFromIntervals(
  intervals: readonly EvaluatedSubInterval[],
): HorizonProfileBin[] {
  return intervals.map((interval) => ({
    azimuthDeg: interval.sun.meanAzimuthDeg,
    thetaNomDeg: interval.sun.meanHorizonMaskDeg,
    featureName: interval.sun.blocker?.featureName,
  }));
}

export interface SkylineRun {
  /** Contiguous-in-azimuth samples; consecutive bins only. */
  readonly samples: readonly SkylineSample[];
  /** Azimuth step that opened the run (the panel prints it). */
  readonly stepDeg: number;
}

export interface SkylineTopology {
  readonly runs: readonly SkylineRun[];
  /** Number of azimuth discontinuities the renderer must not bridge. */
  readonly gaps: number;
  /** Median published bin step, degrees. */
  readonly medianStepDeg: number | null;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Groups samples into azimuth-continuous runs. A step wider than twice the median step (and at
 * least `SKYLINE_MIN_GAP_DEG`) is a data gap: the renderer draws the runs separately and hatches
 * the gap rather than inventing a ridge across unmeasured azimuths.
 */
export function buildSkylineTopology(samples: readonly SkylineSample[]): SkylineTopology {
  if (samples.length === 0) return { runs: [], gaps: 0, medianStepDeg: null };

  const steps: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const step = samples[i]!.azimuthDeg - samples[i - 1]!.azimuthDeg;
    if (step > 0) steps.push(step);
  }
  const medianStepDeg = median(steps);
  const gapThreshold = Math.max(SKYLINE_MIN_GAP_DEG, (medianStepDeg ?? 0) * 2);

  const runs: SkylineRun[] = [];
  let current: SkylineSample[] = [samples[0]!];
  let openedWith = medianStepDeg ?? 0;

  for (let i = 1; i < samples.length; i++) {
    const previous = samples[i - 1]!;
    const sample = samples[i]!;
    const step = sample.azimuthDeg - previous.azimuthDeg;
    if (step > gapThreshold) {
      runs.push({ samples: current, stepDeg: openedWith });
      current = [sample];
      openedWith = medianStepDeg ?? 0;
      continue;
    }
    if (current.length === 1 && step > 0) openedWith = step;
    current.push(sample);
  }
  runs.push({ samples: current, stepDeg: openedWith });

  return { runs, gaps: runs.length - 1, medianStepDeg };
}

export interface NearestSkylineSample {
  readonly azimuthDeg: number;
  readonly nominalDeg: number;
  /** Absolute circular azimuth difference to the inspection azimuth, degrees. */
  readonly offsetDeg: number;
}

/**
 * Nearest published bin to an azimuth, by circular distance. This is a lookup, not an
 * interpolation: the readout states the bin's own azimuth so the offset is visible.
 */
export function nearestSkylineSample(
  samples: readonly SkylineSample[],
  azimuthDeg: number,
): NearestSkylineSample | null {
  if (samples.length === 0 || !Number.isFinite(azimuthDeg)) return null;
  let best: NearestSkylineSample | null = null;
  for (const sample of samples) {
    const raw = Math.abs(normalizeAzimuthDeg(sample.azimuthDeg - azimuthDeg));
    const offsetDeg = Math.min(raw, 360 - raw);
    if (best === null || offsetDeg < best.offsetDeg) {
      best = { azimuthDeg: sample.azimuthDeg, nominalDeg: sample.nominalDeg, offsetDeg };
    }
  }
  return best;
}

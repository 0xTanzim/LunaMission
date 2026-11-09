/**
 * Dual-Panel Sky-Ribbon 2.0 — accessible-companion table model.
 *
 * Pure ordering/selection over backend values so the WCAG companion table carries
 * real numbers rather than a decorative copy of the canvas. No interpolation, no
 * ephemeris work: rows are chosen from published sub-intervals and event whiskers.
 */

import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';
import {
  classifyDisk,
  earthBadgeFor,
  earthStateFromStatus,
  type DiskVisibilityClass,
  type EarthState,
} from './skyRibbonAnalysis';
import type { SkylineSample } from './skyRibbonSkyline';
import { finiteOrNull, formatUtcMinute } from './skyRibbonFormat';

/**
 * Index of the sub-interval containing the canonical playhead. Pure interval
 * containment test over backend epochs; falls back to the first sub-interval.
 */
export function resolveActiveIntervalIndex(
  intervals: readonly EvaluatedSubInterval[],
  playheadUtc?: string | null,
): number {
  if (intervals.length === 0) return 0;
  if (!playheadUtc) return 0;
  const epochMs = Date.parse(playheadUtc);
  if (!Number.isFinite(epochMs)) return 0;
  if (epochMs <= intervals[0]!.startEpochMs) return 0;
  if (epochMs >= intervals[intervals.length - 1]!.endEpochMs) return intervals.length - 1;
  const index = intervals.findIndex(
    (interval) => epochMs >= interval.startEpochMs && epochMs <= interval.endEpochMs,
  );
  return index >= 0 ? index : 0;
}

export interface GrazingIntervalRow {
  readonly key: string;
  readonly windowLabel: string;
  readonly azimuthDeg: number | null;
  readonly elevationDeg: number | null;
  readonly skylineDeg: number | null;
  readonly clearanceDeg: number | null;
  readonly diskPercent: number | null;
  readonly diskClass: DiskVisibilityClass;
  readonly earthState: EarthState;
  readonly earthBadge: string;
  readonly blockingRidgeAzimuthDeg: number | null;
  readonly blockingFeature: string | null;
  readonly isActive: boolean;
}

function buildRow(
  interval: EvaluatedSubInterval,
  key: string,
  isActive: boolean,
): GrazingIntervalRow {
  const disk = finiteOrNull(interval.sun.fractionalSolarDiskVisibility);
  const earthState = earthStateFromStatus(interval.earth.status);
  return {
    key,
    windowLabel: `${formatUtcMinute(interval.startDateUtc)} → ${formatUtcMinute(interval.endDateUtc)}`,
    azimuthDeg: finiteOrNull(interval.sun.meanAzimuthDeg),
    elevationDeg: finiteOrNull(interval.sun.meanElevationDeg),
    skylineDeg: finiteOrNull(interval.sun.meanHorizonMaskDeg),
    clearanceDeg: finiteOrNull(interval.sun.clearanceDeg),
    diskPercent: disk === null ? null : Math.min(100, Math.max(0, disk * 100)),
    diskClass: classifyDisk(disk, interval.sun.status),
    earthState,
    earthBadge: earthBadgeFor(earthState),
    blockingRidgeAzimuthDeg: finiteOrNull(interval.sun.blocker?.azimuthDeg),
    blockingFeature: interval.sun.blocker?.featureName ?? null,
    isActive,
  };
}

/**
 * Rows for the accessible companion: the most constraining sub-intervals (lowest
 * visible-disk fraction, then lowest clearance) plus the active sub-interval.
 */
export function buildGrazingRows(
  intervals: readonly EvaluatedSubInterval[],
  activeIndex: number,
  limit = 8,
): GrazingIntervalRow[] {
  if (intervals.length === 0) return [];
  const ranked = intervals
    .map((interval, index) => ({ interval, index }))
    .sort((a, b) => {
      const diskA = finiteOrNull(a.interval.sun.fractionalSolarDiskVisibility) ?? 1;
      const diskB = finiteOrNull(b.interval.sun.fractionalSolarDiskVisibility) ?? 1;
      if (diskA !== diskB) return diskA - diskB;
      const clearanceA = finiteOrNull(a.interval.sun.clearanceDeg) ?? Number.POSITIVE_INFINITY;
      const clearanceB = finiteOrNull(b.interval.sun.clearanceDeg) ?? Number.POSITIVE_INFINITY;
      return clearanceA - clearanceB;
    });

  const selected = ranked.slice(0, Math.max(1, limit));
  const activeInterval = intervals[activeIndex];
  if (activeInterval && !selected.some((entry) => entry.index === activeIndex)) {
    selected[selected.length - 1] = { interval: activeInterval, index: activeIndex };
  }

  return selected
    .sort((a, b) => (a.index === activeIndex ? -1 : b.index === activeIndex ? 1 : a.index - b.index))
    .map((entry) => buildRow(entry.interval, `row-${entry.index}`, entry.index === activeIndex));
}

export interface EventRow {
  readonly key: string;
  readonly type: string;
  readonly timeLabel: string;
  readonly windowLabel: string;
  readonly azimuthDeg: number | null;
  readonly sensitivity: string;
  readonly spanHours: number | null;
}

const EVENT_LABELS: Record<EventWhisker['eventType'], string> = {
  SUNRISE: 'Sunrise (solar limb)',
  SUNSET: 'Sunset (solar limb)',
  EARTH_RISE: 'Earth rise (LoS)',
  EARTH_SET: 'Earth set (LoS)',
};

/** Rise/set rows straight from the backend event whiskers, capped for the mirror. */
export function buildEventRows(whiskers: readonly EventWhisker[], limit = 12): EventRow[] {
  return whiskers.slice(0, Math.max(0, limit)).map((whisker, index) => ({
    key: `event-${index}-${whisker.eventType}`,
    type: EVENT_LABELS[whisker.eventType] ?? whisker.eventType,
    timeLabel: formatUtcMinute(whisker.tNominalDateUtc),
    windowLabel: `${formatUtcMinute(whisker.tLowDateUtc)} → ${formatUtcMinute(whisker.tHighDateUtc)}`,
    azimuthDeg: finiteOrNull(whisker.azimuthDeg),
    sensitivity: whisker.sensitivityRating,
    spanHours: finiteOrNull(whisker.whiskerSpanHours),
  }));
}

export interface RidgeContact {
  readonly azimuthDeg: number;
  readonly nominalDeg: number;
}

/**
 * Skyline samples at or above a reference elevation — the terrain sectors that
 * actually reach/block that elevation. Comparison only, no interpolation.
 */
export function buildRidgeContacts(
  samples: readonly SkylineSample[],
  referenceElevationDeg: number | null,
  limit = 8,
): RidgeContact[] {
  if (referenceElevationDeg === null || !Number.isFinite(referenceElevationDeg)) return [];
  return samples
    .filter((sample) => sample.nominalDeg >= referenceElevationDeg)
    .sort((a, b) => b.nominalDeg - a.nominalDeg)
    .slice(0, Math.max(0, limit))
    .map((sample) => ({ azimuthDeg: sample.azimuthDeg, nominalDeg: sample.nominalDeg }));
}

export interface GrazingWindow {
  readonly key: string;
  readonly windowLabel: string;
  readonly durationHours: number | null;
  readonly diskPercent: number | null;
  readonly clearanceDeg: number | null;
  readonly azimuthDeg: number | null;
  readonly elevationDeg: number | null;
  readonly isActive: boolean;
}

/** A sub-interval is a grazing window when the backend reports a partly visible disk. */
export function isGrazingInterval(interval: EvaluatedSubInterval): boolean {
  const fraction = finiteOrNull(interval.sun.fractionalSolarDiskVisibility);
  return fraction !== null && fraction > 0 && fraction < 1;
}

/**
 * Critical grazing windows: the sub-intervals where part of the apparent solar disk is above the
 * ridge. Pure selection over backend sub-intervals — the definition is the backend's own
 * `fractionalSolarDiskVisibility` being strictly between 0 and 1, not a threshold invented here.
 */
export function buildGrazingWindows(
  intervals: readonly EvaluatedSubInterval[],
  activeIndex: number,
  limit = 6,
): GrazingWindow[] {
  const windows: GrazingWindow[] = [];
  intervals.forEach((interval, index) => {
    if (!isGrazingInterval(interval)) return;
    const fraction = finiteOrNull(interval.sun.fractionalSolarDiskVisibility);
    windows.push({
      key: `grazing-${index}`,
      windowLabel: `${formatUtcMinute(interval.startDateUtc)} → ${formatUtcMinute(interval.endDateUtc)}`,
      durationHours: finiteOrNull(interval.durationHours),
      diskPercent: fraction === null ? null : Math.min(100, Math.max(0, fraction * 100)),
      clearanceDeg: finiteOrNull(interval.sun.clearanceDeg),
      azimuthDeg: finiteOrNull(interval.sun.meanAzimuthDeg),
      elevationDeg: finiteOrNull(interval.sun.meanElevationDeg),
      isActive: index === activeIndex,
    });
  });
  const active = windows.find((w) => w.isActive);
  const rest = windows.filter((w) => !w.isActive);
  const selected = active ? [active, ...rest] : rest;
  return selected.slice(0, Math.max(0, limit));
}

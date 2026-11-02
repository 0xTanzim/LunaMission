/**
 * Gantt timeline view model.
 *
 * Pure selection and grouping over backend sub-intervals. The tracks answer "when does each
 * observable hold, and where are the interval boundaries"; the zoom presets answer "which slice of
 * the mission am I looking at". No science is derived: a track cell is the sub-interval's own
 * backend status.
 */

import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';

export type GanttTrackId = 'sun' | 'earth' | 'overlap';

export interface GanttTrackDefinition {
  readonly id: GanttTrackId;
  readonly shortLabel: string;
  readonly label: string;
  /** What the track asserts — printed in the UI and in the accessible mirror. */
  readonly observable: string;
}

/**
 * Canonical status vocabulary, in the order an operator should read them — best access
 * first. Used for legend ordering and for the screen-reader legend sentence, so the two
 * cannot drift. Track-specific statuses are grouped by the access they assert.
 */
export const STATUS_ORDER: readonly string[] = [
  'full_sun',
  'partial_limb',
  'terrain_shadow',
  'sub_horizon',
  'earth_direct',
  'terrain_blocked',
  'earth_sub_horizon',
  'sun_and_earth',
  'sun_only',
  'earth_only',
  'dark_and_blocked',
];

export const GANTT_TRACKS: readonly GanttTrackDefinition[] = [
  {
    id: 'sun',
    shortLabel: 'Solar disk',
    label: 'Solar disk visibility',
    observable: 'geometric visible fraction of the apparent solar disk — not electrical power',
  },
  {
    id: 'earth',
    shortLabel: 'Earth LoS',
    label: 'Earth line-of-sight',
    observable: 'geometric line-of-sight to Earth — not an RF link closure',
  },
  {
    id: 'overlap',
    shortLabel: 'Overlap',
    label: 'Concurrent overlap',
    observable: 'concurrent geometric Sun and Earth access — not a feasibility window',
  },
];

export interface GanttCell {
  readonly key: string;
  readonly track: GanttTrackId;
  readonly status: string;
  readonly startEpochMs: number;
  readonly endEpochMs: number;
  readonly startUtc: string;
  readonly endUtc: string;
  readonly isActive: boolean;
}

export function cellStatus(interval: EvaluatedSubInterval, track: GanttTrackId): string {
  if (track === 'sun') return interval.sun.status;
  if (track === 'earth') return interval.earth.status;
  return interval.overlap.status;
}

/** One cell per sub-interval per track, in playback order. */
export function buildGanttCells(
  intervals: readonly EvaluatedSubInterval[],
  activeIndex: number,
): GanttCell[] {
  const cells: GanttCell[] = [];
  intervals.forEach((interval, index) => {
    for (const track of GANTT_TRACKS) {
      cells.push({
        key: `${track.id}-${index}`,
        track: track.id,
        status: cellStatus(interval, track.id),
        startEpochMs: interval.startEpochMs,
        endEpochMs: interval.endEpochMs,
        startUtc: interval.startDateUtc,
        endUtc: interval.endDateUtc,
        isActive: index === activeIndex,
      });
    }
  });
  return cells;
}

export interface GanttBoundary {
  readonly epochMs: number;
  /** `state` = a track changed state; `event` = a solved rise/set; `critical` = short window edge. */
  readonly kind: 'state' | 'event' | 'critical';
}

/**
 * Every time the drawn state changes plus every solved event epoch. Used to draw the boundaries
 * the canvas marks and to answer "hover shows the exact UTC start and end".
 */
export function buildGanttBoundaries(
  intervals: readonly EvaluatedSubInterval[],
  whiskers: readonly EventWhisker[],
  criticalEpochs: readonly number[] = [],
): GanttBoundary[] {
  const boundaries: GanttBoundary[] = [];
  intervals.forEach((interval, index) => {
    const previous = intervals[index - 1];
    const changed =
      previous === undefined ||
      previous.sun.status !== interval.sun.status ||
      previous.earth.status !== interval.earth.status ||
      previous.overlap.status !== interval.overlap.status;
    if (changed) boundaries.push({ epochMs: interval.startEpochMs, kind: 'state' });
  });
  for (const whisker of whiskers) boundaries.push({ epochMs: whisker.eventEpochMs, kind: 'event' });
  for (const epochMs of criticalEpochs) boundaries.push({ epochMs, kind: 'critical' });
  return boundaries.sort((a, b) => a.epochMs - b.epochMs);
}

export interface CriticalWindow {
  readonly key: string;
  readonly startEpochMs: number;
  readonly endEpochMs: number;
  readonly durationHours: number;
  readonly status: string;
}

/**
 * Short windows worth surfacing: the sub-interval is mission-critical by the backend's own flag,
 * or its duration is at or below `maxDurationHours`. Short is not small — a 30-minute overlap
 * window is the shape of the constraint, which is why it gets highlighted rather than averaged.
 */
export function buildCriticalWindows(
  intervals: readonly EvaluatedSubInterval[],
  maxDurationHours = 3,
): CriticalWindow[] {
  const windows: CriticalWindow[] = [];
  intervals.forEach((interval, index) => {
    const durationHours = interval.durationHours;
    const flagged = interval.overlap.isMissionCriticalWindow;
    if (!flagged && !(Number.isFinite(durationHours) && durationHours <= maxDurationHours)) return;
    windows.push({
      key: `critical-${index}`,
      startEpochMs: interval.startEpochMs,
      endEpochMs: interval.endEpochMs,
      durationHours,
      status: interval.overlap.status,
    });
  });
  return windows;
}

export interface TimelineViewWindow {
  readonly startEpochMs: number;
  readonly endEpochMs: number;
}

export const MIN_VIEW_SPAN_HOURS = 0.5;
const HOUR_MS = 3_600_000;

export function clampViewWindow(
  view: TimelineViewWindow,
  mission: TimelineViewWindow,
): TimelineViewWindow {
  const missionSpan = mission.endEpochMs - mission.startEpochMs;
  if (!(missionSpan > 0)) return mission;
  const minSpan = Math.min(missionSpan, MIN_VIEW_SPAN_HOURS * HOUR_MS);
  const span = Math.min(missionSpan, Math.max(minSpan, view.endEpochMs - view.startEpochMs));
  const start = Math.min(
    Math.max(view.startEpochMs, mission.startEpochMs),
    mission.endEpochMs - span,
  );
  return { startEpochMs: start, endEpochMs: start + span };
}

/** Zooms around a centre instant, preserving the anchor while the span changes. */
export function zoomAround(
  view: TimelineViewWindow,
  factor: number,
  mission: TimelineViewWindow,
): TimelineViewWindow {
  const centre = (view.startEpochMs + view.endEpochMs) / 2;
  const halfSpan = ((view.endEpochMs - view.startEpochMs) * factor) / 2;
  return clampViewWindow(
    { startEpochMs: centre - halfSpan, endEpochMs: centre + halfSpan },
    mission,
  );
}

/** Frames one instant with a readable pad on both sides. */
export function frameInstant(
  epochMs: number,
  padHours: number,
  mission: TimelineViewWindow,
): TimelineViewWindow {
  return clampViewWindow(
    { startEpochMs: epochMs - padHours * HOUR_MS, endEpochMs: epochMs + padHours * HOUR_MS },
    mission,
  );
}

/** Frames an interval, padded so both edges stay visible with their labels. */
export function frameInterval(
  startEpochMs: number,
  endEpochMs: number,
  mission: TimelineViewWindow,
): TimelineViewWindow {
  const span = Math.max(MIN_VIEW_SPAN_HOURS * HOUR_MS, endEpochMs - startEpochMs);
  const pad = Math.max(span * 0.35, 0.25 * HOUR_MS);
  return clampViewWindow(
    { startEpochMs: startEpochMs - pad, endEpochMs: startEpochMs + span + pad },
    mission,
  );
}

export type ZoomPresetId = 'mission' | 'week' | 'day' | 'active';

export interface GanttZoomPreset {
  readonly id: ZoomPresetId;
  readonly label: string;
}

export const GANTT_ZOOM_PRESETS: readonly GanttZoomPreset[] = [
  { id: 'mission', label: 'Mission span' },
  { id: 'week', label: '7 d' },
  { id: 'day', label: '24 h' },
  { id: 'active', label: 'Active event' },
];

/** Resolves a preset against the mission window and the active sub-interval. */
export function resolveZoomPreset(
  preset: ZoomPresetId,
  mission: TimelineViewWindow,
  activeInterval: EvaluatedSubInterval | null,
  playheadEpochMs: number,
): TimelineViewWindow {
  if (preset === 'mission') return mission;
  if (preset === 'active' && activeInterval) {
    return frameInterval(activeInterval.startEpochMs, activeInterval.endEpochMs, mission);
  }
  const hours = preset === 'week' ? 7 * 24 : 24;
  return frameInstant(playheadEpochMs, hours / 2, mission);
}

/** Tick spacing that keeps roughly 6–10 labelled ticks across the visible window. */
export function chooseTickIntervalMs(spanMs: number): number {
  const candidateHours = [1, 2, 3, 6, 12, 24, 48, 72, 168, 336];
  const target = spanMs / 8;
  for (const hours of candidateHours) {
    if (hours * HOUR_MS >= target) return hours * HOUR_MS;
  }
  return 672 * HOUR_MS;
}

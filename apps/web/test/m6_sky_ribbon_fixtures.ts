/**
 * Shared fixtures for the Milestone C Dual-Panel Sky-Ribbon suites.
 * Not a test file (no `.test.` / `_test` suffix) — imported by the suites.
 */

import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';

export interface IntervalOverrides {
  startEpochMs?: number;
  endEpochMs?: number;
  startDateUtc?: string;
  endDateUtc?: string;
  sun?: Partial<EvaluatedSubInterval['sun']>;
  earth?: Partial<EvaluatedSubInterval['earth']>;
  overlap?: Partial<EvaluatedSubInterval['overlap']>;
}

const HOUR_MS = 3_600_000;
export const BASE_EPOCH_MS = Date.parse('2026-11-01T00:00:00.000Z');

export function makeInterval(overrides: IntervalOverrides = {}): EvaluatedSubInterval {
  const startEpochMs = overrides.startEpochMs ?? BASE_EPOCH_MS;
  const endEpochMs = overrides.endEpochMs ?? startEpochMs + 2 * HOUR_MS;
  return {
    startEpochMs,
    endEpochMs,
    startDateUtc: overrides.startDateUtc ?? new Date(startEpochMs).toISOString(),
    endDateUtc: overrides.endDateUtc ?? new Date(endEpochMs).toISOString(),
    durationHours: (endEpochMs - startEpochMs) / HOUR_MS,
    sun: {
      status: 'full_sun',
      fractionalSolarDiskVisibility: 1,
      meanElevationDeg: 1.42,
      meanAzimuthDeg: 154.5,
      meanHorizonMaskDeg: 0.25,
      clearanceDeg: 1.17,
      blocker: null,
      ...overrides.sun,
    },
    earth: {
      status: 'visible',
      meanElevationDeg: 8.4,
      meanAzimuthDeg: 342.1,
      meanHorizonMaskDeg: 1.1,
      clearanceDeg: 7.3,
      ...overrides.earth,
    },
    overlap: {
      status: 'sun_and_earth',
      isMissionCriticalWindow: false,
      ...overrides.overlap,
    },
  };
}

export function makeWhisker(overrides: Partial<EventWhisker> = {}): EventWhisker {
  const epochMs = overrides.eventEpochMs ?? BASE_EPOCH_MS + 6 * HOUR_MS;
  const iso = (offsetHours: number) => new Date(epochMs + offsetHours * HOUR_MS).toISOString();
  return {
    eventEpochMs: epochMs,
    eventDateUtc: overrides.eventDateUtc ?? iso(0),
    eventType: overrides.eventType ?? 'SUNSET',
    azimuthDeg: overrides.azimuthDeg ?? 158.4,
    tLowDateUtc: overrides.tLowDateUtc ?? iso(-0.5),
    tNominalDateUtc: overrides.tNominalDateUtc ?? iso(0),
    tHighDateUtc: overrides.tHighDateUtc ?? iso(0.5),
    whiskerSpanHours: overrides.whiskerSpanHours ?? 1,
    sensitivityRating: overrides.sensitivityRating ?? 'MODERATE',
  };
}

export interface DrawCallRecord {
  readonly method: string;
  readonly args: readonly number[];
  readonly text?: string;
}

/**
 * Records 2D canvas calls so drawing behaviour can be asserted without a DOM.
 * Implements exactly the surface the sky renderers use.
 */
export function createRecordingContext(): {
  ctx: CanvasRenderingContext2D;
  calls: DrawCallRecord[];
  texts: string[];
  countOf(method: string): number;
} {
  const calls: DrawCallRecord[] = [];
  const texts: string[] = [];

  const record = (method: string, args: unknown[] = [], text?: string) => {
    calls.push({
      method,
      args: args.filter((value): value is number => typeof value === 'number'),
      text,
    });
    if (typeof text === 'string') texts.push(text);
  };

  const gradient = {
    addColorStop: (offset: number) => record('addColorStop', [offset]),
  };

  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    fillRect: (...args: number[]) => record('fillRect', args),
    clearRect: (...args: number[]) => record('clearRect', args),
    beginPath: () => record('beginPath'),
    closePath: () => record('closePath'),
    moveTo: (x: number, y: number) => record('moveTo', [x, y]),
    lineTo: (x: number, y: number) => record('lineTo', [x, y]),
    arc: (x: number, y: number, radius: number) => record('arc', [x, y, radius]),
    stroke: () => record('stroke'),
    fill: () => record('fill'),
    save: () => record('save'),
    restore: () => record('restore'),
    setLineDash: (dash: number[]) => record('setLineDash', dash),
    setTransform: () => record('setTransform'),
    fillText: (text: string, x: number, y: number) => record('fillText', [x, y], text),
    measureText: (text: string) => ({ width: text.length * 5 }),
    createLinearGradient: () => {
      record('createLinearGradient');
      return gradient;
    },
    createRadialGradient: () => {
      record('createRadialGradient');
      return gradient;
    },
  } as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    calls,
    texts,
    countOf: (method: string) => calls.filter((call) => call.method === method).length,
  };
}

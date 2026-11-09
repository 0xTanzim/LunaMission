import { describe, it, expect } from 'bun:test';
import {
  buildTrajectory,
  interpolateTrajectorySample,
  type TrajectorySeries,
} from '../src/features/sky-ribbon/skyRibbonTrajectory';
import { resolveActiveIntervalIndex } from '../src/features/sky-ribbon/skyRibbonTableModel';
import { buildSkyDeckModel } from '../src/features/sky-ribbon/skyRibbonDeckModel';
import { createPanoramaProjection } from '../src/features/sky-ribbon/skyRibbonProjection';
import { drawAzimuthCompassBar } from '../src/features/sky-ribbon/skyRibbonRenderer';
import { makeInterval } from './m6_sky_ribbon_fixtures';

describe('Panel 1 · 360° Panorama Trajectory & Visual Enhancements', () => {
  it('interpolates trajectory coordinates along sub-interval knots', () => {
    const intervals = [
      makeInterval({
        startEpochMs: 1000,
        endEpochMs: 2000,
        sun: { meanAzimuthDeg: 30, meanElevationDeg: 1.0 },
      }),
      makeInterval({
        startEpochMs: 2000,
        endEpochMs: 3000,
        sun: { meanAzimuthDeg: 60, meanElevationDeg: 3.0 },
      }),
    ];

    const series = buildTrajectory(intervals, 'sun');
    expect(series.samples).toHaveLength(2);

    // Knot 0
    const at0 = interpolateTrajectorySample(series, 1000);
    expect(at0?.azimuthDeg).toBeCloseTo(30, 2);
    expect(at0?.elevationDeg).toBeCloseTo(1.0, 2);

    // Halfway between knot 0 and knot 1
    const atMid = interpolateTrajectorySample(series, 1500);
    expect(atMid?.azimuthDeg).toBeCloseTo(45, 2);
    expect(atMid?.elevationDeg).toBeCloseTo(2.0, 2);

    // Knot 1
    const at1 = interpolateTrajectorySample(series, 2000);
    expect(at1?.azimuthDeg).toBeCloseTo(60, 2);
    expect(at1?.elevationDeg).toBeCloseTo(3.0, 2);

    // Beyond boundaries clamps cleanly
    const before = interpolateTrajectorySample(series, 500);
    expect(before?.azimuthDeg).toBeCloseTo(30, 2);
    const after = interpolateTrajectorySample(series, 5000);
    expect(after?.azimuthDeg).toBeCloseTo(60, 2);
  });

  it('handles trajectory seam wrap across 0°/360°', () => {
    const intervals = [
      makeInterval({
        startEpochMs: 1000,
        endEpochMs: 2000,
        sun: { meanAzimuthDeg: 350, meanElevationDeg: 1.0 },
      }),
      makeInterval({
        startEpochMs: 2000,
        endEpochMs: 3000,
        sun: { meanAzimuthDeg: 10, meanElevationDeg: 2.0 },
      }),
    ];

    const series = buildTrajectory(intervals, 'sun');
    // Halfway across 350° -> 10° should pass through 0°
    const mid = interpolateTrajectorySample(series, 1500);
    expect(mid?.azimuthDeg).toBeCloseTo(0, 1);
    expect(mid?.elevationDeg).toBeCloseTo(1.5, 2);
  });

  it('resolveActiveIntervalIndex clamps safely beyond interval bounds', () => {
    const intervals = [
      makeInterval({ startEpochMs: 1000, endEpochMs: 2000 }),
      makeInterval({ startEpochMs: 2000, endEpochMs: 3000 }),
    ];

    // Before start -> index 0
    expect(resolveActiveIntervalIndex(intervals, new Date(500).toISOString())).toBe(0);
    // Inside interval 0 -> index 0
    expect(resolveActiveIntervalIndex(intervals, new Date(1500).toISOString())).toBe(0);
    // Inside interval 1 -> index 1
    expect(resolveActiveIntervalIndex(intervals, new Date(2500).toISOString())).toBe(1);
    // Past end -> last index (1) instead of resetting to 0
    expect(resolveActiveIntervalIndex(intervals, new Date(5000).toISOString())).toBe(1);
  });

  it('buildSkyDeckModel provides smooth playheadMarker coordinates from playheadUtc', () => {
    const intervals = [
      makeInterval({
        startEpochMs: 1000,
        endEpochMs: 2000,
        startDateUtc: new Date(1000).toISOString(),
        endDateUtc: new Date(2000).toISOString(),
        sun: { meanAzimuthDeg: 40, meanElevationDeg: 1.0 },
      }),
      makeInterval({
        startEpochMs: 2000,
        endEpochMs: 3000,
        startDateUtc: new Date(2000).toISOString(),
        endDateUtc: new Date(3000).toISOString(),
        sun: { meanAzimuthDeg: 80, meanElevationDeg: 3.0 },
      }),
    ];

    const model = buildSkyDeckModel({
      intervals,
      horizonProfile: [],
      playheadUtc: new Date(1500).toISOString(),
      solarCriterion: 'upperLimb',
    });

    expect(model.playheadMarker).not.toBeNull();
    // At t=1500, halfway between 40° and 80° -> 60°
    expect(model.playheadMarker?.azimuthDeg).toBeCloseTo(60, 1);
    expect(model.playheadMarker?.elevationDeg).toBeCloseTo(2.0, 1);
    expect(model.sun?.azimuthDeg).toBeCloseTo(60, 1);
  });

  it('drawAzimuthCompassBar runs without throwing on valid canvas context', () => {
    const projection = createPanoramaProjection(1200, 264);
    const commands: string[] = [];
    const mockCtx = {
      save: () => commands.push('save'),
      restore: () => commands.push('restore'),
      beginPath: () => commands.push('beginPath'),
      moveTo: () => commands.push('moveTo'),
      lineTo: () => commands.push('lineTo'),
      stroke: () => commands.push('stroke'),
      fillText: () => commands.push('fillText'),
      measureText: (txt: string) => ({ width: txt.length * 7 }),
      fillRect: () => commands.push('fillRect'),
    } as unknown as CanvasRenderingContext2D;

    expect(() => drawAzimuthCompassBar(mockCtx, projection, 45)).not.toThrow();
    expect(commands).toContain('save');
    expect(commands).toContain('restore');
    expect(commands).toContain('fillText');
  });
});

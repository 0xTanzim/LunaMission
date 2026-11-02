import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalScenarioProvider } from '../src/app/state/GlobalScenarioContext';
import {
  epochToPixelX,
  pixelXToEpoch,
  drawTimelineHeader,
  drawIntervalTracks,
} from '../src/features/timeline/ganttTrackRenderer';
import {
  drawEventWhiskers,
  drawPlayheadScrubber,
} from '../src/features/timeline/ganttWhiskerRenderer';
import { GanttTimelineCanvas } from '../src/features/timeline/GanttTimelineCanvas';
import { LaunchSlipSlider } from '../src/features/timeline/LaunchSlipSlider';
import { TimelineScrubberControls } from '../src/features/timeline/TimelineScrubberControls';
import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';

describe('Milestone M6: Interactive Gantt Timeline & Uncertainty Whiskers', () => {
  const startMs = Date.UTC(2026, 10, 1, 0, 0, 0); // 2026-11-01
  const stopMs = Date.UTC(2026, 10, 15, 0, 0, 0);  // 2026-11-15 (14 days)
  const dim = { width: 1400, startEpochMs: startMs, endEpochMs: stopMs };

  const mockIntervals: EvaluatedSubInterval[] = [
    {
      startEpochMs: startMs,
      endEpochMs: startMs + 86400000 * 2,
      startDateUtc: '2026-11-01T00:00:00.000Z',
      endDateUtc: '2026-11-03T00:00:00.000Z',
      durationHours: 48.0,
      sun: {
        status: 'full_sun',
        fractionalSolarDiskVisibility: 1.0,
        meanElevationDeg: 1.2,
        meanAzimuthDeg: 150.0,
        meanHorizonMaskDeg: 0.5,
        clearanceDeg: 0.7,
        blocker: null,
      },
      earth: {
        status: 'visible',
        meanElevationDeg: 7.8,
        meanAzimuthDeg: 340.0,
        meanHorizonMaskDeg: 1.2,
        clearanceDeg: 6.6,
      },
      overlap: {
        status: 'sun_and_earth',
        isMissionCriticalWindow: true,
      },
    },
    {
      startEpochMs: startMs + 86400000 * 2,
      endEpochMs: startMs + 86400000 * 3,
      startDateUtc: '2026-11-03T00:00:00.000Z',
      endDateUtc: '2026-11-04T00:00:00.000Z',
      durationHours: 24.0,
      sun: {
        status: 'terrain_shadow',
        fractionalSolarDiskVisibility: 0.0,
        meanElevationDeg: 0.9,
        meanAzimuthDeg: 175.0,
        meanHorizonMaskDeg: 2.1,
        clearanceDeg: -1.2,
        blocker: {
          azimuthDeg: 175.2,
          distanceKm: 42.5,
          elevationMeters: 2450,
          featureName: 'Malapert Ridge Crest',
        },
      },
      earth: {
        status: 'visible',
        meanElevationDeg: 8.1,
        meanAzimuthDeg: 343.0,
        meanHorizonMaskDeg: 1.0,
        clearanceDeg: 7.1,
      },
      overlap: {
        status: 'earth_only',
        isMissionCriticalWindow: false,
      },
    },
  ];

  const mockWhiskers: EventWhisker[] = [
    {
      eventEpochMs: startMs + 86400000 * 2,
      eventDateUtc: '2026-11-03T00:00:00.000Z',
      eventType: 'SUNSET',
      azimuthDeg: 175.0,
      tLowDateUtc: '2026-11-02T22:30:00.000Z',
      tNominalDateUtc: '2026-11-03T00:00:00.000Z',
      tHighDateUtc: '2026-11-03T01:30:00.000Z',
      whiskerSpanHours: 3.0,
      sensitivityRating: 'MODERATE',
    },
  ];

  it('converts between timestamps and pixel coordinates accurately', () => {
    expect(epochToPixelX(startMs, dim)).toBe(0.0);
    expect(epochToPixelX(stopMs, dim)).toBe(1400.0);
    expect(epochToPixelX(startMs + 7 * 86400000, dim)).toBe(700.0);

    expect(pixelXToEpoch(0, dim)).toBe(startMs);
    expect(pixelXToEpoch(700, dim)).toBe(startMs + 7 * 86400000);
    expect(pixelXToEpoch(1400, dim)).toBe(stopMs);
  });

  it('renders LaunchSlipSlider with hit target >= 32px and reset capability', () => {
    const html = renderToStaticMarkup(
      <LaunchSlipSlider
        launchSlipOffsetDays={3.5}
        onLaunchSlipChange={() => {}}
        nominalStartUtc="2026-11-01T00:00:00.000Z"
        nominalStopUtc="2026-11-15T00:00:00.000Z"
      />,
    );

    expect(html).toContain('data-testid="gantt-launch-slip-slider"');
    expect(html).toContain('min-h-[32px]');
    expect(html).toContain('+3.5 Days');
    expect(html).toContain('Reset');
  });

  it('renders TimelineScrubberControls with playback buttons and step controls', () => {
    const html = renderToStaticMarkup(
      <TimelineScrubberControls
        currentEpochMs={startMs + 3600000}
        startEpochMs={startMs}
        endEpochMs={stopMs}
        onEpochChange={() => {}}
      />,
    );

    expect(html).toContain('data-testid="timeline-play-btn"');
    expect(html).toContain('PLAY');
    expect(html).toContain('+1h');
    expect(html).toContain('−1h');
    expect(html).toContain('+10m');
    expect(html).toContain('−10m');
    expect(html).toContain('Playhead:');
  });

  it('renders GanttTimelineCanvas with canvas element and controls', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <GanttTimelineCanvas
          intervals={mockIntervals}
          eventWhiskers={mockWhiskers}
          startUtc="2026-11-01T00:00:00.000Z"
          stopUtc="2026-11-15T00:00:00.000Z"
        />
      </GlobalScenarioProvider>,
    );

    expect(html).toContain('data-testid="gantt-timeline-canvas"');
    expect(html).toContain('OPERATIONAL MULTI-TRACK GANTT TIMELINE');
    expect(html).toContain('TERRAIN SENSITIVITY WHISKERS');
    expect(html).toContain('Solar Disk Visibility • Earth Geometric LoS • Concurrent Overlap');
  });

  it('executes timeline canvas drawing routines without throwing', () => {
    const mockCtx: any = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      closePath: () => {},
      arc: () => {},
      fillText: () => {},
      save: () => {},
      restore: () => {},
      setLineDash: () => {},
    };

    drawTimelineHeader(mockCtx, dim);
    drawIntervalTracks(mockCtx, dim, mockIntervals);
    drawEventWhiskers(mockCtx, dim, mockWhiskers);
    drawPlayheadScrubber(mockCtx, dim, startMs + 86400000);
  });
});

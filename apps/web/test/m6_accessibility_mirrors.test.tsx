import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SkyRibbonCompassTable } from '../src/features/accessibility/SkyRibbonCompassTable';
import { GanttEventSequenceTable } from '../src/features/accessibility/GanttEventSequenceTable';
import { AccessibleHatchingPatterns } from '../src/features/accessibility/AccessibleHatchingPatterns';
import type { EvaluatedSubInterval } from '@luna/contracts';

describe('Milestone M6: Accessible Companion Mirrors & Non-Color Encodings', () => {
  const mockIntervals: EvaluatedSubInterval[] = [
    {
      startEpochMs: Date.UTC(2026, 10, 1, 0, 0, 0),
      endEpochMs: Date.UTC(2026, 10, 1, 12, 0, 0),
      startDateUtc: '2026-11-01T00:00:00.000Z',
      endDateUtc: '2026-11-01T12:00:00.000Z',
      durationHours: 12.0,
      sun: {
        status: 'full_sun',
        fractionalSolarDiskVisibility: 1.0,
        meanElevationDeg: 1.45,
        meanAzimuthDeg: 45.0, // Northeast octant
        meanHorizonMaskDeg: 0.8,
        clearanceDeg: 0.65,
        blocker: null,
      },
      earth: {
        status: 'visible',
        meanElevationDeg: 8.5,
        meanAzimuthDeg: 340.0, // North octant
        meanHorizonMaskDeg: 1.0,
        clearanceDeg: 7.5,
      },
      overlap: {
        status: 'sun_and_earth',
        isMissionCriticalWindow: true,
      },
    },
    {
      startEpochMs: Date.UTC(2026, 10, 1, 12, 0, 0),
      endEpochMs: Date.UTC(2026, 10, 2, 0, 0, 0),
      startDateUtc: '2026-11-01T12:00:00.000Z',
      endDateUtc: '2026-11-02T00:00:00.000Z',
      durationHours: 12.0,
      sun: {
        status: 'terrain_shadow',
        fractionalSolarDiskVisibility: 0.0,
        meanElevationDeg: 0.85,
        meanAzimuthDeg: 135.0, // Southeast octant
        meanHorizonMaskDeg: 2.4,
        clearanceDeg: -1.55,
        blocker: {
          azimuthDeg: 135.2,
          distanceKm: 65.0,
          elevationMeters: 3100,
          featureName: 'Connecting Ridge North Peak',
        },
      },
      earth: {
        status: 'terrain_blocked',
        meanElevationDeg: 1.1,
        meanAzimuthDeg: 135.0,
        meanHorizonMaskDeg: 2.4,
        clearanceDeg: -1.3,
      },
      overlap: {
        status: 'dark_and_blocked',
        isMissionCriticalWindow: false,
      },
    },
  ];

  it('renders SkyRibbonCompassTable with all 8 compass octants', () => {
    const html = renderToStaticMarkup(
      <SkyRibbonCompassTable
        siteName="Connecting Ridge CR01"
        intervals={mockIntervals}
      />,
    );

    expect(html).toContain('data-testid="sky-ribbon-compass-table"');
    expect(html).toContain('N (North)');
    expect(html).toContain('NE (Northeast)');
    expect(html).toContain('E (East)');
    expect(html).toContain('SE (Southeast)');
    expect(html).toContain('S (South)');
    expect(html).toContain('SW (Southwest)');
    expect(html).toContain('W (West)');
    expect(html).toContain('NW (Northwest)');
    expect(html).toContain('Connecting Ridge North Peak');
  });

  it('renders GanttEventSequenceTable with interval records and WCAG 1.1.1 compliance', () => {
    const html = renderToStaticMarkup(
      <GanttEventSequenceTable
        siteName="Connecting Ridge CR01"
        intervals={mockIntervals}
      />,
    );

    expect(html).toContain('data-testid="gantt-event-sequence-table"');
    expect(html).toContain('Total Intervals: 2');
    expect(html).toContain('FULL SUN');
    expect(html).toContain('TERRAIN SHADOW');
    expect(html).toContain('CONCURRENT');
    expect(html).toContain('Connecting Ridge North Peak');
  });

  it('mounts AccessibleHatchingPatterns with SVG defs for non-color status conveyance', () => {
    const html = renderToStaticMarkup(<AccessibleHatchingPatterns />);

    expect(html).toContain('id="pattern-terrain-shadow"');
    expect(html).toContain('id="pattern-partial-limb"');
    expect(html).toContain('id="pattern-sub-horizon"');
    expect(html).toContain('id="pattern-earth-occluded"');
  });
});

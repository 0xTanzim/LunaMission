import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PolarSkyRadarView } from '../src/features/analyze/components/PolarSkyRadarView';
import type { HorizonProfileBin } from '@luna/contracts';

describe('PolarSkyRadarView Component (R07 Reference Integration)', () => {
  const mockHorizonBins: HorizonProfileBin[] = [
    { azimuthDeg: 0, elevationDeg: 1.2 },
    { azimuthDeg: 90, elevationDeg: -0.5 },
    { azimuthDeg: 180, elevationDeg: 2.8 },
    { azimuthDeg: 270, elevationDeg: 0.4 },
  ];

  it('renders polar sky radar with circular dome canvas and telemetry', () => {
    const html = renderToStaticMarkup(
      <PolarSkyRadarView
        horizonBins={mockHorizonBins}
        sunPoint={{ azimuthDeg: 45.2, elevationDeg: 1.1, status: 'full_sun' }}
        earthPoint={{ azimuthDeg: 182.0, elevationDeg: 6.5, status: 'visible' }}
        targetSiteName="Connecting Ridge CR01"
      />,
    );

    expect(html).toContain('data-testid="polar-sky-radar-view"');
    expect(html).toContain('Circular Polar Sky Radar for Connecting Ridge CR01');
    expect(html).toContain('R07 RADAR');
    expect(html).toContain('Closed Cyan Line: LOLA Horizon Skyline');
    expect(html).toContain('Gold Circle: Sun Disk');
    expect(html).toContain('Blue Circle: Earth Disk');
    expect(html).toContain('Az: 45.2°');
    expect(html).toContain('El: 1.1°');
    expect(html).toContain('Az: 182.0°');
    expect(html).toContain('El: 6.5°');
  });

  it('renders geometric invariant rule notice in telemetry card', () => {
    const html = renderToStaticMarkup(
      <PolarSkyRadarView
        horizonBins={[]}
        targetSiteName="Shackleton Crater"
      />,
    );

    expect(html).toContain('When the celestial marker is inside the closed skyline polygon');
  });
});

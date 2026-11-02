import { describe, it, expect } from 'bun:test';
import {
  calculateCandidateRadarRatios,
  generateRadarPolygonPoints,
  getRadarAxisPoint,
  RADAR_AXES,
} from '../model/radarChartMath';
import type { RankedFeasibleCandidate } from '@luna/contracts';

describe('radarChartMath', () => {
  const mockCandidate: RankedFeasibleCandidate = {
    rank: 1,
    siteId: 'test-site',
    siteName: 'Test Site Alpha',
    entityType: 'research_candidate_point',
    coordinates: {
      latitudeDeg: -89.5,
      longitudeEastDeg: 120.0,
      elevationMeters: 2000,
      referenceDatum: 'IAU_MOON_ME',
      referenceRadiusKm: 1737.4,
    },
    metrics: {
      longestContinuousSunlightHours: 168.0, // 50% of 336h
      maxContinuousDarknessHours: 33.6,      // 10% dark -> 90% survivability
      cumulativeSunlitHours: 200.0,
      solarAccessPercentage: 60.0,
      cumulativeDteHours: 252.0,            // 75% DTE
      dteAccessPercentage: 75.0,
      cumulativeOverlapHours: 150.0,
      landingSlopeDeg: 9.0,                 // (45 - 9) / 45 = 36/45 = 80%
      terrainUncertaintySpanHours: 2.0,
    },
    sortKeyTrace: [],
  };

  it('calculates physical normalized ratios accurately for a 336h window', () => {
    const totalEvaluationHours = 336.0;
    const elevationBounds = { minElevationMeters: 1000, maxElevationMeters: 3000 };

    const ratios = calculateCandidateRadarRatios(mockCandidate, totalEvaluationHours, elevationBounds);

    expect(ratios.solarRatio).toBeCloseTo(50.0, 1);
    expect(ratios.darknessRatio).toBeCloseTo(90.0, 1);
    expect(ratios.dteRatio).toBeCloseTo(75.0, 1);
    expect(ratios.safetyRatio).toBeCloseTo(80.0, 1);
    expect(ratios.elevationRatio).toBeCloseTo(50.0, 1); // (2000 - 1000) / (3000 - 1000) = 50%
  });

  it('clamps values cleanly between 0% and 100%', () => {
    const extremeCandidate: RankedFeasibleCandidate = {
      ...mockCandidate,
      metrics: {
        ...mockCandidate.metrics,
        longestContinuousSunlightHours: 400.0, // Exceeds total hours
        maxContinuousDarknessHours: 500.0,     // Exceeds total hours -> darkness ratio <= 0
        landingSlopeDeg: 55.0,                 // Exceeds 45° -> safety <= 0
      },
      coordinates: {
        ...mockCandidate.coordinates,
        elevationMeters: 4000,                 // Above max elevation
      },
    };

    const ratios = calculateCandidateRadarRatios(extremeCandidate, 336.0, {
      minElevationMeters: 1000,
      maxElevationMeters: 3000,
    });

    expect(ratios.solarRatio).toBe(100.0);
    expect(ratios.darknessRatio).toBe(0.0);
    expect(ratios.safetyRatio).toBe(0.0);
    expect(ratios.elevationRatio).toBe(100.0);
  });

  it('generates 5 points for SVG polygon with 12 o clock top axis', () => {
    const center = { cx: 100, cy: 100 };
    const radius = 80;
    const values = [100, 100, 100, 100, 100]; // 100% full perimeter

    const pointsStr = generateRadarPolygonPoints(values, center, radius);
    const points = pointsStr.split(' ');
    expect(points.length).toBe(5);

    // Top point (axis 0) should be at (cx, cy - radius) = (100, 20)
    const [x0, y0] = points[0].split(',').map(Number);
    expect(x0).toBeCloseTo(100, 1);
    expect(y0).toBeCloseTo(20, 1);
  });

  it('exposes 5 distinct radar axes with physical labels', () => {
    expect(RADAR_AXES.length).toBe(5);
    expect(RADAR_AXES.map((a) => a.key)).toEqual([
      'solar',
      'darkness',
      'dte',
      'safety',
      'elevation',
    ]);
  });
});

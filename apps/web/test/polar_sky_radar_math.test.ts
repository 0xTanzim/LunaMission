import { describe, it, expect } from 'bun:test';
import {
  elevationToRadius,
  radiusToElevation,
  polarToCartesian,
  cartesianToPolar,
} from '../src/features/analyze/utils/polarRadarMath';

describe('Polar Sky Radar Mathematical Transformations (R07 Integration)', () => {
  const maxR = 200;

  it('preserves exact boundary values and monotonic radial decrease', () => {
    // -5° maps to maxRadius (perimeter)
    expect(elevationToRadius(-5, maxR)).toBeCloseTo(200, 4);

    // 0° (horizon line) maps to R - 0.55 * R * (5/15) = 200 - 36.666 = 163.333
    expect(elevationToRadius(0, maxR)).toBeCloseTo(163.3333, 3);

    // 10° threshold maps to 0.45 * R = 90
    expect(elevationToRadius(10, maxR)).toBeCloseTo(90, 4);

    // 90° (zenith) maps to 0 (center)
    expect(elevationToRadius(90, maxR)).toBeCloseTo(0, 4);

    // Strict monotonic decrease: as elevation increases, radius decreases
    const elevations = [-5, -2, 0, 2, 5, 10, 20, 45, 60, 80, 90];
    const radii = elevations.map((el) => elevationToRadius(el, maxR));
    for (let i = 0; i < radii.length - 1; i++) {
      expect(radii[i]).toBeGreaterThan(radii[i + 1]);
    }
  });

  it('guarantees continuity across the 10° slope partition boundary', () => {
    const justBelow = elevationToRadius(9.9999, maxR);
    const atBoundary = elevationToRadius(10.0, maxR);
    const justAbove = elevationToRadius(10.0001, maxR);

    expect(Math.abs(justBelow - atBoundary)).toBeLessThan(0.01);
    expect(Math.abs(justAbove - atBoundary)).toBeLessThan(0.01);
  });

  it('handles negative elevation overflow (< -5°) by clamping to maxRadius', () => {
    expect(elevationToRadius(-10, maxR)).toBe(maxR);
    expect(elevationToRadius(-25, maxR)).toBe(maxR);
  });

  it('inverts radius to elevation with high numerical precision', () => {
    const testElevations = [-5, -2.5, 0, 1.5, 5, 8.5, 10, 25, 45, 75, 90];
    for (const el of testElevations) {
      const r = elevationToRadius(el, maxR);
      const recoveredEl = radiusToElevation(r, maxR);
      expect(recoveredEl).toBeCloseTo(el, 3);
    }
  });

  it('transforms polar azimuth and elevation to Cartesian and back accurately', () => {
    const center = { x: 250, y: 250 };

    // North (0°) at 0° elevation -> points directly UP (-Y)
    const northPt = polarToCartesian({ azimuthDeg: 0, elevationDeg: 0 }, center, maxR);
    expect(northPt.x).toBeCloseTo(250, 3);
    expect(northPt.y).toBeLessThan(250);

    // East (90°) at 0° elevation -> points directly RIGHT (+X)
    const eastPt = polarToCartesian({ azimuthDeg: 90, elevationDeg: 0 }, center, maxR);
    expect(eastPt.x).toBeGreaterThan(250);
    expect(eastPt.y).toBeCloseTo(250, 3);

    // South (180°) at 0° elevation -> points directly DOWN (+Y)
    const southPt = polarToCartesian({ azimuthDeg: 180, elevationDeg: 0 }, center, maxR);
    expect(southPt.x).toBeCloseTo(250, 3);
    expect(southPt.y).toBeGreaterThan(250);

    // Round-trip conversion check for arbitrary azimuths
    const testCases = [
      { azimuthDeg: 45, elevationDeg: 12 },
      { azimuthDeg: 135, elevationDeg: -1.2 },
      { azimuthDeg: 225, elevationDeg: 55 },
      { azimuthDeg: 315, elevationDeg: 0 },
    ];

    for (const tc of testCases) {
      const pt = polarToCartesian(tc, center, maxR);
      const recovered = cartesianToPolar(pt, center, maxR);
      expect(recovered.azimuthDeg).toBeCloseTo(tc.azimuthDeg, 2);
      expect(recovered.elevationDeg).toBeCloseTo(tc.elevationDeg, 2);
    }
  });

  it('preserves the fundamental visibility invariant: e > h <=> r(e) < r(h)', () => {
    const horizonElev = 2.5; // Mountain ridge at 2.5° elevation
    const rHorizon = elevationToRadius(horizonElev, maxR);

    // Sun above ridge at 3.0° -> clear sky
    const sunAbove = 3.0;
    const rSunAbove = elevationToRadius(sunAbove, maxR);
    expect(rSunAbove).toBeLessThan(rHorizon); // Inside skyline!

    // Sun below ridge at 1.0° -> blocked
    const sunBelow = 1.0;
    const rSunBelow = elevationToRadius(sunBelow, maxR);
    expect(rSunBelow).toBeGreaterThan(rHorizon); // Outside skyline!
  });
});

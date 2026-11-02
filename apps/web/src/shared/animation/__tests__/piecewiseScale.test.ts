import { describe, expect, it } from 'bun:test';
import {
  elevationToPixelY,
  pixelYToElevation,
  CANVAS_HEIGHT_PX,
  SEAM_Y_PX,
  HORIZON_0_Y_PX,
  MIN_ELEVATION_DEG,
  MAX_ELEVATION_DEG,
  SEAM_ELEVATION_DEG,
} from '../piecewiseScale';

describe('piecewiseScale: Dual-Slope 360° Sky-Ribbon Elevation Mapping', () => {
  it('correctly maps canonical elevation anchors to exact pixel coordinates', () => {
    expect(elevationToPixelY(MAX_ELEVATION_DEG)).toBe(0);
    expect(elevationToPixelY(SEAM_ELEVATION_DEG)).toBe(SEAM_Y_PX); // 80px
    expect(elevationToPixelY(0.0)).toBe(HORIZON_0_Y_PX);           // 200px
    expect(elevationToPixelY(MIN_ELEVATION_DEG)).toBe(CANVAS_HEIGHT_PX); // 272px
  });

  it('guarantees zero discontinuity across the +5.0° seam boundary', () => {
    const yBelow = elevationToPixelY(4.9999);
    const yAt = elevationToPixelY(5.0);
    const yAbove = elevationToPixelY(5.0001);

    expect(Math.abs(yBelow - yAt)).toBeLessThan(0.01);
    expect(Math.abs(yAbove - yAt)).toBeLessThan(0.01);
  });

  it('inverts exact round-trips from elevation -> pixel -> elevation', () => {
    const testAngles = [-3.0, -1.5, 0.0, 1.25, 4.8, 5.0, 5.2, 10.0, 15.0, 25.0];
    for (const deg of testAngles) {
      const y = elevationToPixelY(deg);
      const inverted = pixelYToElevation(y);
      expect(inverted).toBeCloseTo(deg, 4);
    }
  });

  it('clamps out-of-range elevations cleanly without NaN or infinite values', () => {
    expect(elevationToPixelY(30.0)).toBe(0);
    expect(elevationToPixelY(-10.0)).toBe(CANVAS_HEIGHT_PX);
    expect(pixelYToElevation(-10)).toBe(MAX_ELEVATION_DEG);
    expect(pixelYToElevation(300)).toBe(MIN_ELEVATION_DEG);
  });
});

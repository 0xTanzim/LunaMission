import { describe, it, expect } from 'bun:test';
import { calculateLunarGeodesicDistance, R_MOON_METERS } from '../model/geodesicDistance';

describe('calculateLunarGeodesicDistance', () => {
  it('returns 0 for identical coordinates', () => {
    const lat = -89.5;
    const lon = 120.0;
    const result = calculateLunarGeodesicDistance(lat, lon, lat, lon);
    expect(result.distanceMeters).toBe(0);
    expect(result.distanceKm).toBe(0);
  });

  it('calculates accurate distance between Shackleton Rim (-89.9°S, 0.0°E) and Malapert Massif (-86.04°S, 2.7°E)', () => {
    // Angular separation roughly 3.86 degrees
    // Geodesic distance on R_MOON (1,737.4 km) should be approx ~117 km
    const result = calculateLunarGeodesicDistance(-89.9, 0.0, -86.04, 2.7);
    expect(result.distanceKm).toBeGreaterThan(115);
    expect(result.distanceKm).toBeLessThan(120);
    expect(result.distanceMeters).toBeCloseTo(result.distanceKm * 1000, 1);
  });

  it('correctly calculates distance across the pole for antipodal longitudes', () => {
    // Two points at -89.8°S with 180° longitude difference
    // Distance across pole is 2 * (90 - 89.8)° = 0.4°
    // 0.4° in radians * 1,737,400 m = (0.4 * pi / 180) * 1737400 ≈ 12,129 meters (12.13 km)
    const result = calculateLunarGeodesicDistance(-89.8, 0.0, -89.8, 180.0);
    expect(result.distanceKm).toBeCloseTo(12.13, 1);
  });

  it('clamps numerical bounds to avoid NaN when coordinates produce dot product > 1', () => {
    const result = calculateLunarGeodesicDistance(-90.0, 0.0, -90.0, 0.0);
    expect(Number.isNaN(result.distanceKm)).toBe(false);
    expect(result.distanceKm).toBe(0);
  });

  it('exports authoritative lunar spherical radius constant R_MOON_METERS = 1,737,400', () => {
    expect(R_MOON_METERS).toBe(1737400);
  });
});

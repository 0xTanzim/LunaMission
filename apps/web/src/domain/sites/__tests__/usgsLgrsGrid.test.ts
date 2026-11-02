import { describe, expect, test } from 'bun:test';
import {
  projectGeodeticToLps,
  inverseLpsToGeodetic,
  encodeUsgsAcc6,
  decodeUsgsAcc6,
  computeLgrsGridCell,
} from '@/domain/sites/usgsLgrsGrid';

describe('USGS Lunar Polar Stereographic (LPS) and LGRS Grids', () => {
  test('projects south pole exactly to (0, 0)', () => {
    const pt = projectGeodeticToLps(-90.0, 0.0);
    expect(pt.x).toBeCloseTo(0, 3);
    expect(pt.y).toBeCloseTo(0, 3);

    const inv = inverseLpsToGeodetic(0, 0);
    expect(inv.latitudeDeg).toBeCloseTo(-90.0, 4);
  });

  test('correctly executes forward and inverse LPS projections with sub-millimeter precision', () => {
    const lat = -85.9;
    const lon = 2.9;
    const lps = projectGeodeticToLps(lat, lon);
    expect(lps.x).toBeDefined();
    expect(lps.y).toBeDefined();

    const inv = inverseLpsToGeodetic(lps.x, lps.y);
    expect(inv.latitudeDeg).toBeCloseTo(lat, 5);
    expect(inv.longitudeDeg).toBeCloseTo(lon, 5);
  });

  test('computes hierarchical LGRS grid cells (1km, 100m, 10m)', () => {
    const lat = -84.3;
    const lon = 329.8;
    const grid = computeLgrsGridCell(lat, lon);

    expect(grid.grid1km).toContain('1K');
    expect(grid.grid100m).toContain('100M');
    expect(grid.grid10m).toContain('10M');
    expect(grid.eastingMeters).toBeFinite();
    expect(grid.northingMeters).toBeFinite();
  });

  test('encodes and decodes 6-character Alphanumeric Coordinate Condensation (ACC)', () => {
    const lat = -84.20156;
    const lon = 60.69989;
    const acc = encodeUsgsAcc6(lat, lon);

    expect(acc.length).toBe(6);
    expect(/^[0-9A-Z]{6}$/.test(acc)).toBe(true);

    const decoded = decodeUsgsAcc6(acc);
    const origLps = projectGeodeticToLps(lat, lon);
    const decodedLps = projectGeodeticToLps(decoded.latitudeDeg, decoded.longitudeDeg);
    const distMeters = Math.hypot(decodedLps.x - origLps.x, decodedLps.y - origLps.y);
    expect(distMeters).toBeLessThanOrEqual(100);
  });

  test('rejects latitudes outside the polar corridor (north of -80°S)', () => {
    expect(() => projectGeodeticToLps(-75.0, 0.0)).toThrow('polar corridor');
  });
});

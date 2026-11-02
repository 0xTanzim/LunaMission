import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asSelenographicLatitudeDeg,
  asSelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';
import {
  projectLatLon,
  unprojectCoordinates,
  calculateLunarDistanceKm,
  calculateCustomPointCelestial,
  calculateScaleBar,
  DEFAULT_PROJECTION_CONFIG,
} from '@/domain/coordinates/projection';

test('Polar Projection: projects exact Lunar South Pole to canvas center', () => {
  const pole = projectLatLon(-90.0, 0.0);
  assert.equal(Math.round(pole.x), DEFAULT_PROJECTION_CONFIG.center);
  assert.equal(Math.round(pole.y), DEFAULT_PROJECTION_CONFIG.center);
});

test('Polar Projection: Prime Meridian (0° lon) points directly UP toward Earth (-Y)', () => {
  const pt = projectLatLon(-86.5, 0.0);
  assert.equal(Math.round(pt.x), DEFAULT_PROJECTION_CONFIG.center);
  assert.ok(pt.y < DEFAULT_PROJECTION_CONFIG.center, 'Point with lon 0° must be above center (y < cy)');
});

test('Polar Projection: 90° East meridian points directly RIGHT (+X)', () => {
  const pt = projectLatLon(-86.5, 90.0);
  assert.ok(pt.x > DEFAULT_PROJECTION_CONFIG.center, 'Point with lon 90° must be right of center (x > cx)');
  assert.equal(Math.round(pt.y), DEFAULT_PROJECTION_CONFIG.center);
});

test('Polar Projection: 180° meridian points directly DOWN (+Y)', () => {
  const pt = projectLatLon(-86.5, 180.0);
  assert.equal(Math.round(pt.x), DEFAULT_PROJECTION_CONFIG.center);
  assert.ok(pt.y > DEFAULT_PROJECTION_CONFIG.center, 'Point with lon 180° must be below center (y > cy)');
});

test('Polar Projection: 270° meridian points directly LEFT (-X)', () => {
  const pt = projectLatLon(-86.5, 270.0);
  assert.ok(pt.x < DEFAULT_PROJECTION_CONFIG.center, 'Point with lon 270° must be left of center (x < cx)');
  assert.equal(Math.round(pt.y), DEFAULT_PROJECTION_CONFIG.center);
});

test('Polar Projection: forward and inverse projection round-trip accurately', () => {
  const testCoords = [
    { latitudeDeg: -89.9, longitudeDeg: 0.0 }, // Shackleton rim
    { latitudeDeg: -88.5, longitudeDeg: 271.4 }, // de Gerlache rim
    { latitudeDeg: -85.2, longitudeDeg: 53.5 }, // Nobile rim
    { latitudeDeg: -84.9, longitudeDeg: 12.9 }, // Malapert Mountain
    { latitudeDeg: -83.5, longitudeDeg: 135.0 }, // Outer edge
  ];

  for (const coord of testCoords) {
    const projected = projectLatLon(coord.latitudeDeg, coord.longitudeDeg);
    const inverted = unprojectCoordinates(projected.x, projected.y);
    assert.ok(inverted !== null, 'Inverted coordinate must not be null within boundary');
    assert.ok(
      Math.abs(inverted.latitudeDeg - coord.latitudeDeg) < 0.02,
      `Latitude mismatch: expected ${coord.latitudeDeg}, got ${inverted.latitudeDeg}`
    );
    assert.ok(
      Math.abs(inverted.longitudeDeg - coord.longitudeDeg) < 0.05,
      `Longitude mismatch: expected ${coord.longitudeDeg}, got ${inverted.longitudeDeg}`
    );
  }
});

test('Polar Projection: unprojecting far outside boundary returns null', () => {
  const outside = unprojectCoordinates(10, 10);
  assert.equal(outside, null);
});

test('Lunar Distance: distance between coincident points is zero', () => {
  const pt = { latitudeDeg: -89.9, longitudeDeg: 0.0 };
  const dist = calculateLunarDistanceKm(pt, pt);
  assert.equal(Math.round(dist), 0);
});

test('Lunar Distance: 1 degree of latitude on Moon is approximately 30.3 km', () => {
  const pt1 = { latitudeDeg: -89.0, longitudeDeg: 0.0 };
  const pt2 = { latitudeDeg: -90.0, longitudeDeg: 0.0 };
  const dist = calculateLunarDistanceKm(pt1, pt2);
  assert.ok(Math.abs(dist - 30.3) < 0.5, `Expected ~30.3 km per degree, got ${dist}`);
});

test('Custom Point Celestial: calculates plausible geometry angles at South Pole', () => {
  const pole = { latitudeDeg: -90.0, longitudeDeg: 0.0 };
  // Sub-solar near equator (lat = 1.2°, lon = 45°)
  const celestial = calculateCustomPointCelestial(
    pole,
    asSelenographicLatitudeDeg(1.2),
    asSelenographicLongitudeDeg(45),
    asSelenographicLatitudeDeg(-5.0),
    asSelenographicLongitudeDeg(0)
  );

  // At South Pole, sub-solar latitude 1.2° corresponds to ~ -1.2° elevation
  assert.ok(celestial.sunElevationDeg < 0 && celestial.sunElevationDeg > -3);
  assert.ok(celestial.sunAzimuthDeg >= 0 && celestial.sunAzimuthDeg <= 360);
  assert.ok(celestial.earthAzimuthDeg >= 0 && celestial.earthAzimuthDeg <= 360);
});

test('Scale Bar: dynamically calculates accurate metric distances across zoom levels', () => {
  const at1x = calculateScaleBar(1.0);
  assert.equal(at1x.distanceKm, 50);
  assert.ok(at1x.widthPx >= 55 && at1x.widthPx <= 70, `Expected ~62px, got ${at1x.widthPx}`);

  const at2x = calculateScaleBar(2.0);
  assert.ok(at2x.distanceKm <= 25, `Expected <= 25km at 2x zoom, got ${at2x.distanceKm}`);
  assert.ok(at2x.widthPx >= 45 && at2x.widthPx <= 110, `Width should be between 45 and 110px, got ${at2x.widthPx}`);

  const at3x = calculateScaleBar(3.0);
  assert.ok(at3x.distanceKm <= 20, `Expected <= 20km at 3x zoom, got ${at3x.distanceKm}`);
});


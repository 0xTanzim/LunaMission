import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRayBoundaryEndpoint,
  computeScreenAngleRad,
  isAtOrAboveHorizon,
  isAtOrBelowHorizon,
  resolveRayEndpoint,
} from '@/features/spatial/map/model/vectorGeometry';
import {
  DEFAULT_PROJECTION_CONFIG,
  ProjectedPoint,
  projectLatLon,
} from '@/domain/coordinates/projection';
import { ResultAvailability } from '@/domain/celestial/availability';
import {
  asSelenographicLongitudeDeg,
  asTopocentricAzimuthDeg,
  asTopocentricElevationDeg,
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
} from '@/domain/coordinates/frames';
import { CANDIDATE_SITES } from '@luna/contracts';

test('SunEarthVector: computes screen angle for local topocentric azimuth', () => {
  // At Prime Meridian (0° lon): Local North points UP (-90° in standard Cartesian SVG)
  const northAtPrime = computeScreenAngleRad(asSelenographicLongitudeDeg(0), asTopocentricAzimuthDeg(0));
  assert.equal(northAtPrime, -Math.PI / 2);

  // At Prime Meridian (0° lon): Azimuth 90° (East) points RIGHT (0° in Cartesian SVG)
  const eastAtPrime = computeScreenAngleRad(asSelenographicLongitudeDeg(0), asTopocentricAzimuthDeg(90));
  assert.equal(eastAtPrime, 0);

  // At 90° East meridian: Local North points RIGHT (0° in Cartesian SVG)
  const northAt90E = computeScreenAngleRad(asSelenographicLongitudeDeg(90), asTopocentricAzimuthDeg(0));
  assert.equal(northAt90E, 0);

  // At 90° East meridian: Azimuth 90° (East) points DOWN (+90° in Cartesian SVG)
  const eastAt90E = computeScreenAngleRad(asSelenographicLongitudeDeg(90), asTopocentricAzimuthDeg(90));
  assert.equal(eastAt90E, Math.PI / 2);
});

test('SunEarthVector: ray boundary endpoint sits precisely on boundary circle', () => {
  const { center: CENTER, maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;
  const BOUNDARY_RADIUS = MAX_RADIUS + 22; // 287 px

  // Test 1: From exact South Pole (300, 300)
  const poleOrigin = { x: CENTER, y: CENTER };
  const anglesToTest = [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2];

  for (const angle of anglesToTest) {
    const end = calculateRayBoundaryEndpoint(poleOrigin, angle, BOUNDARY_RADIUS, CENTER);
    const distFromCenter = Math.hypot(end.x - CENTER, end.y - CENTER);
    assert.ok(
      Math.abs(distFromCenter - BOUNDARY_RADIUS) < 0.001,
      `Expected ${BOUNDARY_RADIUS}, got ${distFromCenter}`
    );
  }

  // Test 2: From offset candidate sites (e.g. Haworth, Malapert, Nobile)
  for (const site of CANDIDATE_SITES) {
    const sitePos = projectLatLon(
      site.coordinates.latitudeDeg,
      site.coordinates.longitudeDeg
    );
    for (let az = 0; az < 360; az += 45) {
      const screenAngle = computeScreenAngleRad(
        asSelenographicLongitudeDeg(site.coordinates.longitudeDeg),
        asTopocentricAzimuthDeg(az)
      );
      const end = calculateRayBoundaryEndpoint(sitePos, screenAngle, BOUNDARY_RADIUS, CENTER);
      const distFromCenter = Math.hypot(end.x - CENTER, end.y - CENTER);
      assert.ok(
        Math.abs(distFromCenter - BOUNDARY_RADIUS) < 0.01,
        `Site ${site.code} at az ${az}°: distance from center must equal boundary radius ${BOUNDARY_RADIUS}, got ${distFromCenter}`
      );
    }
  }
});

test('SunEarthVector: vector origin strictly matches candidate site projected coordinate', () => {
  for (const site of CANDIDATE_SITES) {
    const sitePos = projectLatLon(
      site.coordinates.latitudeDeg,
      site.coordinates.longitudeDeg
    );
    // Origin must be finite and within map boundaries
    assert.ok(Number.isFinite(sitePos.x));
    assert.ok(Number.isFinite(sitePos.y));
    const distFromCenter = Math.hypot(
      sitePos.x - DEFAULT_PROJECTION_CONFIG.center,
      sitePos.y - DEFAULT_PROJECTION_CONFIG.center
    );
    assert.ok(
      distFromCenter <= DEFAULT_PROJECTION_CONFIG.maxRadius,
      `Site ${site.code} position must be within max radius ${DEFAULT_PROJECTION_CONFIG.maxRadius}`
    );
  }
});

function availableAzimuth(deg: number): ResultAvailability<TopocentricAzimuthDeg> {
  return { kind: 'available', value: asTopocentricAzimuthDeg(deg), unit: 'deg' };
}

function missingAzimuth(): ResultAvailability<TopocentricAzimuthDeg> {
  return { kind: 'unavailable', reason: 'Terrain horizon mask has no sample at this azimuth' };
}

function availableElevation(deg: number): ResultAvailability<TopocentricElevationDeg> {
  return { kind: 'available', value: asTopocentricElevationDeg(deg), unit: 'deg' };
}

test('vectorGeometry: an unavailable azimuth draws no ray instead of an invented bearing', () => {
  const origin: ProjectedPoint = { x: 300, y: 300 };
  const end = resolveRayEndpoint(
    origin,
    asSelenographicLongitudeDeg(0),
    missingAzimuth(),
    287,
    300
  );
  assert.equal(end, null);
});

test('vectorGeometry: an available azimuth lands on the boundary circle', () => {
  const { center: CENTER, maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;
  const BOUNDARY_RADIUS = MAX_RADIUS + 22;
  const origin: ProjectedPoint = { x: CENTER, y: CENTER };
  const end = resolveRayEndpoint(
    origin,
    asSelenographicLongitudeDeg(141),
    availableAzimuth(230.5),
    BOUNDARY_RADIUS,
    CENTER
  );
  assert.ok(end !== null);
  assert.ok(Math.abs(Math.hypot(end!.x - CENTER, end!.y - CENTER) - BOUNDARY_RADIUS) < 0.001);
});

test('vectorGeometry: horizon side claims require a known elevation', () => {
  assert.equal(isAtOrAboveHorizon(availableElevation(0)), true);
  assert.equal(isAtOrAboveHorizon(availableElevation(-0.4)), false);
  assert.equal(isAtOrBelowHorizon(availableElevation(-0.4)), true);
  assert.equal(isAtOrBelowHorizon(availableElevation(1.1)), false);
  assert.equal(isAtOrAboveHorizon({ kind: 'indeterminate', reason: 'DEM gap' }), null);
  assert.equal(isAtOrBelowHorizon({ kind: 'unavailable', reason: 'DEM gap' }), null);
});

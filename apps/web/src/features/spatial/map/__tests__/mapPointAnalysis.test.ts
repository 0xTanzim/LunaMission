import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOUTH_POLE_COORDINATE,
  analyzeCustomPoint,
  analyzeHoveredSite,
  celestialAt,
  distanceFromSouthPoleKm,
  distanceToSite,
  nearestCandidate,
  type SubPoints,
} from '@/features/spatial/map/model/mapPointAnalysis';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  calculateLunarDistanceKm,
  projectLatLon,
  type SelenographicCoordinate,
} from '@/domain/coordinates/projection';
import { LUNAR_MEAN_RADIUS_KM } from '@/domain/constants/astronomy';
import { asSelenographicLatitudeDeg, asSelenographicLongitudeDeg } from '@/domain/coordinates/frames';

/** Sub-points for a made-up instant: enough to exercise the transform, not an ephemeris claim. */
const SUB_POINTS: SubPoints = {
  subSolarLatDeg: asSelenographicLatitudeDeg(-83.5),
  subSolarLonDeg: asSelenographicLongitudeDeg(12.25),
  subEarthLatDeg: asSelenographicLatitudeDeg(-1.7),
  subEarthLonDeg: asSelenographicLongitudeDeg(189.4),
};

/** An arbitrary inspected point: away from the pole and between candidates. */
const MID_SOUTH: SelenographicCoordinate = { latitudeDeg: -85, longitudeDeg: 40 };

test('distance from the pole is the arc length away from 90°S', () => {
  assert.equal(distanceFromSouthPoleKm(SOUTH_POLE_COORDINATE), 0);

  // 5° of latitude is 5° of great-circle arc at the pole, independent of longitude.
  const fiveDegFromPole = distanceFromSouthPoleKm({ latitudeDeg: -85, longitudeDeg: 300 });
  const expectedKm = LUNAR_MEAN_RADIUS_KM * ((5 * Math.PI) / 180);
  assert.ok(Math.abs(fiveDegFromPole - expectedKm) < 1e-6, `${fiveDegFromPole} vs ${expectedKm}`);
});

test('distance to a site and distance from the pole agree on a pole-anchored point', () => {
  for (const site of CANDIDATE_SITES) {
    assert.equal(distanceToSite(SOUTH_POLE_COORDINATE, site), distanceFromSouthPoleKm(site.coordinates));
  }
});

test('a candidate is its own nearest candidate', () => {
  for (const site of CANDIDATE_SITES) {
    const nearest = nearestCandidate(site.coordinates);
    assert.equal(nearest.site.id, site.id);
    assert.ok(nearest.distanceKm < 1e-9);
  }
});

test('the nearest candidate matches a brute-force scan of the catalog', () => {
  const point = MID_SOUTH;
  let expectedSite = CANDIDATE_SITES[0];
  let expectedKm = calculateLunarDistanceKm(point, expectedSite.coordinates);
  for (const site of CANDIDATE_SITES) {
    const km = calculateLunarDistanceKm(point, site.coordinates);
    if (km < expectedKm) {
      expectedKm = km;
      expectedSite = site;
    }
  }

  const actual = nearestCandidate(point);
  assert.equal(actual.site.id, expectedSite.id);
  assert.equal(actual.distanceKm, expectedKm);
});

test('custom-point analysis reports distance, angles, nearest site and screen position', () => {
  const referenceSite = CANDIDATE_SITES[0];
  const analysis = analyzeCustomPoint(MID_SOUTH, referenceSite, SUB_POINTS);

  assert.equal(analysis.distanceKm, distanceToSite(MID_SOUTH, referenceSite));
  assert.equal(analysis.nearestSite.id, nearestCandidate(MID_SOUTH).site.id);
  assert.equal(analysis.nearestDistanceKm, nearestCandidate(MID_SOUTH).distanceKm);
  assert.deepEqual(analysis.celestial, celestialAt(MID_SOUTH, SUB_POINTS));
  assert.deepEqual(analysis.pos, projectLatLon(MID_SOUTH.latitudeDeg, MID_SOUTH.longitudeDeg));
});

test('the hovered-candidate preview matches the full analysis for the same point', () => {
  const site = CANDIDATE_SITES[1];
  const preview = analyzeHoveredSite(site, SUB_POINTS);
  const full = analyzeCustomPoint(site.coordinates, site, SUB_POINTS);

  assert.deepEqual(preview.celestial, full.celestial);
  assert.deepEqual(preview.pos, full.pos);
  assert.equal(full.distanceKm, 0, 'a site measured against itself is zero kilometres away');
});

test('the sub-solar point sees the Sun at its zenith', () => {
  const subSolarPoint = {
    latitudeDeg: SUB_POINTS.subSolarLatDeg,
    longitudeDeg: SUB_POINTS.subSolarLonDeg,
  };
  const celestial = celestialAt(subSolarPoint, SUB_POINTS);

  assert.ok(Math.abs(Number(celestial.sunElevationDeg) - 90) < 1e-6);
});

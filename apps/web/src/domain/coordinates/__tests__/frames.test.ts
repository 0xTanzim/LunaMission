import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asScreenAngleRad,
  asSelenographicLatitudeDeg,
  asSelenographicLongitudeDeg,
  asTopocentricAzimuthDeg,
  asTopocentricElevationDeg,
  SelenographicLatitudeDeg,
  TopocentricAzimuthDeg,
} from '@/domain/coordinates/frames';

test('frames: constructors carry the value unchanged', () => {
  assert.equal(asTopocentricElevationDeg(-0.45), -0.45);
  assert.equal(asTopocentricAzimuthDeg(353.2), 353.2);
  assert.equal(asSelenographicLatitudeDeg(-89.9), -89.9);
  assert.equal(asSelenographicLongitudeDeg(222.5), 222.5);
  assert.equal(asScreenAngleRad(1.57), 1.57);
});

/**
 * Frame identity is a compile-time guarantee, so the acceptance evidence is a
 * directive that must fail: if a value ever stops being frame-tagged, tsc
 * reports "Unused '@ts-expect-error' directive" and `bun run typecheck` breaks.
 */
test('frames: cross-frame assignment is rejected at compile time', () => {
  const azimuth: TopocentricAzimuthDeg = asTopocentricAzimuthDeg(90);
  const latitude: SelenographicLatitudeDeg = asSelenographicLatitudeDeg(-89.9);

  // @ts-expect-error a topocentric azimuth is not a selenographic latitude
  const wrong: SelenographicLatitudeDeg = azimuth;
  // @ts-expect-error a selenographic latitude is not a topocentric azimuth
  const alsoWrong: TopocentricAzimuthDeg = latitude;

  assert.ok(wrong !== null && alsoWrong !== null);
});

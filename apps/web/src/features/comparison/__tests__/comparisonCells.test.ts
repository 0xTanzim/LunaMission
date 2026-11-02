import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EARTH_VISIBILITY_BADGE_CELLS,
  ILLUMINATION_BADGE_CELLS,
  secondsCell,
  signedAngleCell,
  unsignedAngleCell,
} from '@/features/comparison/model/comparisonCells';
import { ResultAvailability } from '@/domain/celestial/availability';
import { UNAVAILABLE_PLACEHOLDER } from '@/shared/formatting/availability';
import { CANDIDATE_SITES } from '@luna/contracts';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';
import { asTopocentricElevationDeg, asTopocentricAzimuthDeg } from '@/domain/coordinates/frames';

function available<T extends number>(value: T, unit: string): ResultAvailability<T> {
  return { kind: 'available', value, unit };
}

const unavailable = (reason: string): ResultAvailability<number> => ({ kind: 'unavailable', reason });
const indeterminate = (reason: string): ResultAvailability<number> => ({ kind: 'indeterminate', reason });

test('signed angle cells show an explicit plus above the horizon', () => {
  assert.equal(signedAngleCell(available(4.32, '°')), '+4.32°');
  assert.equal(signedAngleCell(available(asTopocentricElevationDeg(-1.1), '°')), '-1.1°');
  assert.equal(signedAngleCell(available(0, '°')), '0°', 'zero elevation is not labelled positive');
});

test('bearing cells never prepend a sign', () => {
  assert.equal(unsignedAngleCell(available(asTopocentricAzimuthDeg(214.5), '°')), '214.5°');
  assert.equal(unsignedAngleCell(available(0, '°')), '0°');
});

test('light-time cells keep the second unit', () => {
  assert.equal(secondsCell(available(1.283, 's')), '1.283 s');
});

test('cells print the computed value rather than re-rounding it', () => {
  // 4.30 collapses to 4.3 in JS; re-formatting to two decimals would invent precision the ephemeris dropped.
  assert.equal(signedAngleCell(available(Number((4.3).toFixed(2)), '°')), '+4.3°');
  assert.equal(unsignedAngleCell(available(Number((214.5).toFixed(1)), '°')), '214.5°');
});

test('unavailable and indeterminate results render a dash, never a zero', () => {
  for (const result of [unavailable('terrain mask unavailable'), indeterminate('limb grazing')]) {
    assert.equal(signedAngleCell(result), UNAVAILABLE_PLACEHOLDER);
    assert.equal(unsignedAngleCell(result), UNAVAILABLE_PLACEHOLDER);
    assert.equal(secondsCell(result), UNAVAILABLE_PLACEHOLDER);
    assert.notEqual(signedAngleCell(result), '0°');
  }
});

test('every illumination state has badge wording', () => {
  assert.deepEqual(ILLUMINATION_BADGE_CELLS.illuminated, { variant: 'success', label: 'Fully Illuminated' });
  assert.deepEqual(ILLUMINATION_BADGE_CELLS['partial-penumbra'], {
    variant: 'warning',
    label: 'Grazing Penumbra',
  });
  assert.deepEqual(ILLUMINATION_BADGE_CELLS.shadowed, { variant: 'danger', label: 'Shadowed' });
  assert.deepEqual(
    ILLUMINATION_BADGE_CELLS.indeterminate,
    ILLUMINATION_BADGE_CELLS.shadowed,
    'an indeterminate illumination is reported as shadowed',
  );
});

test('every Earth visibility state has badge wording', () => {
  assert.deepEqual(EARTH_VISIBILITY_BADGE_CELLS.visible, {
    variant: 'success',
    label: 'Line-of-Sight Available',
  });
  assert.deepEqual(EARTH_VISIBILITY_BADGE_CELLS.indeterminate, { variant: 'warning', label: 'Limb Grazing' });
  assert.deepEqual(EARTH_VISIBILITY_BADGE_CELLS['sub-horizon'], {
    variant: 'danger',
    label: 'Sub-Horizon (No LOS)',
  });
  assert.equal(EARTH_VISIBILITY_BADGE_CELLS.unavailable.variant, 'danger');
});

test('the matrix cells show real numbers for every site and calculation mode', () => {
  const epoch = new Date('2026-10-21T12:00:00Z');
  for (const site of CANDIDATE_SITES) {
    for (const mode of ['terrain-aware', 'geometry-only'] as const) {
      const conditions = calculateSiteConditions(site, epoch, mode);
      assert.notEqual(signedAngleCell(conditions.sunElevationDeg), UNAVAILABLE_PLACEHOLDER);
      assert.notEqual(unsignedAngleCell(conditions.sunAzimuthDeg), UNAVAILABLE_PLACEHOLDER);
      assert.notEqual(signedAngleCell(conditions.earthElevationDeg), UNAVAILABLE_PLACEHOLDER);
      assert.notEqual(secondsCell(conditions.theoreticalOneWayLightTimeSeconds), UNAVAILABLE_PLACEHOLDER);
      assert.ok(ILLUMINATION_BADGE_CELLS[conditions.solarIllumination].label.length > 0);
      assert.ok(EARTH_VISIBILITY_BADGE_CELLS[conditions.earthVisibility].label.length > 0);
    }
  }
});

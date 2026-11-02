import test from 'node:test';
import assert from 'node:assert/strict';
import {
  angleParts,
  availableValue,
  unavailableReason,
  formatAvailableAngle,
  UNAVAILABLE_PLACEHOLDER,
} from '@/shared/formatting/availability';
import { ResultAvailability } from '@/domain/celestial/availability';

const available: ResultAvailability<number> = {
  kind: 'available',
  value: -0.45,
  unit: 'deg',
};
const unavailable: ResultAvailability<number> = {
  kind: 'unavailable',
  reason: 'Terrain horizon data missing for this azimuth',
};
const indeterminate: ResultAvailability<number> = {
  kind: 'indeterminate',
  reason: 'Solver did not converge',
};

test('availability: only an available result yields a number', () => {
  assert.equal(availableValue(available), -0.45);
  assert.equal(availableValue(unavailable), null);
  assert.equal(availableValue(indeterminate), null);
});

test('availability: reason text is exposed for non-available results only', () => {
  assert.equal(unavailableReason(available), null);
  assert.equal(unavailableReason(unavailable), 'Terrain horizon data missing for this azimuth');
  assert.equal(unavailableReason(indeterminate), 'Solver did not converge');
});

test('availability: angle formatting keeps zero distinct from missing', () => {
  assert.equal(formatAvailableAngle(available, 2, true), '-0.45°');
  assert.equal(formatAvailableAngle(unavailable, 2, true), UNAVAILABLE_PLACEHOLDER);
  assert.equal(
    formatAvailableAngle({ kind: 'available', value: 0, unit: 'deg' }, 1, true),
    '+0.0°'
  );
  assert.equal(
    formatAvailableAngle({ kind: 'available', value: 52.94, unit: 'deg' }, 1),
    '52.9°'
  );
});

test('availability: angle parts reproduce the split sign/digits/unit runs', () => {
  assert.deepEqual(angleParts(52.94, 0), { sign: '', digits: '53', unit: '°' });
  assert.deepEqual(angleParts(-0.45, 1, true), { sign: '-', digits: '0.5', unit: '°' });
  assert.deepEqual(angleParts(1.1, 1, true), { sign: '+', digits: '1.1', unit: '°' });
});

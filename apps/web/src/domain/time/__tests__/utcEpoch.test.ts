import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUtcDateTime, formatIsoUtc, stepUtc } from '@/domain/time/utcEpoch';
import { getJulianDate } from '@/domain/time/julianDate';

test('UTC Time: validateUtcDateTime correctly validates standard ISO dates and times', () => {
  const result = validateUtcDateTime('2026-10-21', '12:00:00');
  assert.equal(result.isValid, true);
  assert.equal(result.normalizedIsoUtc, '2026-10-21T12:00:00Z');
});

test('UTC Time: validateUtcDateTime rejects invalid month and leap-year edge cases', () => {
  const badMonth = validateUtcDateTime('2026-13-01', '12:00:00');
  assert.equal(badMonth.isValid, false);
  assert.match(badMonth.errorMessage || '', /Month must be between/);

  const badFeb = validateUtcDateTime('2026-02-29', '12:00:00');
  assert.equal(badFeb.isValid, false);
  assert.match(badFeb.errorMessage || '', /Day must be between 01 and 28/);

  const goodLeapFeb = validateUtcDateTime('2028-02-29', '12:00:00');
  assert.equal(goodLeapFeb.isValid, true);
});

test('UTC Time: validateUtcDateTime rejects invalid hours and minutes', () => {
  assert.equal(validateUtcDateTime('2026-10-21', '25:00:00').isValid, false);
  assert.equal(validateUtcDateTime('2026-10-21', '12:65:00').isValid, false);
});

test('UTC Time: stepUtc accurately advances and rolls back UTC time without timezone drift', () => {
  const initial = '2026-10-21T23:30:00Z';
  assert.equal(stepUtc(initial, 60), '2026-10-22T00:30:00Z');
  assert.equal(stepUtc(initial, -30), '2026-10-21T23:00:00Z');
});

test('UTC Time: formatIsoUtc serializes the instant with an explicit Z suffix', () => {
  assert.equal(formatIsoUtc(new Date(Date.UTC(2026, 9, 21, 14, 30, 0))), '2026-10-21T14:30:00Z');
});

test('UTC Time: getJulianDate matches standard astronomical J2000 epoch reference', () => {
  const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  assert.ok(Math.abs(getJulianDate(j2000) - 2451545.0) < 0.0001);
});

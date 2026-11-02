import test from 'node:test';
import assert from 'node:assert/strict';
import { epochParts } from '@/features/time/model/utcDisplay';

test('Display: epochParts separates YYYY-MM-DD and HH:mm:ss without local-timezone leakage', () => {
  assert.deepEqual(epochParts(Date.UTC(2026, 9, 21, 12, 0, 0)), { dateStr: '2026-10-21', timeStr: '12:00:00' });
});

test('Display: epochParts returns empty parts for an unparsable instant', () => {
  assert.deepEqual(epochParts(Number.NaN), { dateStr: '', timeStr: '' });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { ephemerisQuerySchema } from '../src/schemas/ephemerisSchemas';
import { telecomQuerySchema } from '../src/schemas/telecomSchemas';

test('Zod Ephemeris Schema: validates correct input and assigns defaults', () => {
  const raw = {
    siteId: 'connecting-ridge',
    epochMs: 1793016000000,
  };

  const parsed = ephemerisQuerySchema.parse(raw);
  assert.equal(parsed.siteId, 'connecting-ridge');
  assert.equal(parsed.epochMs, 1793016000000);
  assert.equal(parsed.calculationMode, 'geometry-only');
});

test('Zod Ephemeris Schema: rejects missing or non-numeric epochMs', () => {
  assert.throws(() => {
    ephemerisQuerySchema.parse({
      siteId: 'connecting-ridge',
      epochMs: 'not-a-number',
    });
  });

  assert.throws(() => {
    ephemerisQuerySchema.parse({
      siteId: '',
      epochMs: 1793016000000,
    });
  });
});

test('Zod Telecom Schema: validates RF link budget inputs and defaults', () => {
  const raw = {
    siteId: 'connecting-ridge',
    epochMs: 1793016000000,
  };

  const parsed = telecomQuerySchema.parse(raw);
  assert.equal(parsed.siteId, 'connecting-ridge');
  assert.equal(parsed.band, 'xBandDownlink');
  assert.equal(parsed.transmitterPowerWatts, 15);
  assert.equal(parsed.dataRateMbps, 2.0);
});

test('Zod Telecom Schema: rejects invalid frequency band or negative power', () => {
  assert.throws(() => {
    telecomQuerySchema.parse({
      siteId: 'connecting-ridge',
      epochMs: 1793016000000,
      band: 'invalid-band',
    });
  });

  assert.throws(() => {
    telecomQuerySchema.parse({
      siteId: 'connecting-ridge',
      epochMs: 1793016000000,
      transmitterPowerWatts: -5,
    });
  });
});

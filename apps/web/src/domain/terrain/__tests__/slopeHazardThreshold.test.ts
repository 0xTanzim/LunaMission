import test from 'node:test';
import assert from 'node:assert/strict';
import { getSlopeColor, getSlopeRgb } from '../terrainColorMaps';

test('Slope Hazard: < 5.0° evaluates to safe green', () => {
  assert.equal(getSlopeColor(0.0), '#10b981');
  assert.equal(getSlopeColor(2.5), '#10b981');
  assert.equal(getSlopeColor(4.99), '#10b981');

  assert.deepEqual(getSlopeRgb(0.0), [16, 185, 129]);
  assert.deepEqual(getSlopeRgb(4.99), [16, 185, 129]);
});

test('Slope Hazard: 5.0° to 11.99° evaluates to moderate lime/yellow', () => {
  assert.equal(getSlopeColor(5.0), '#84cc16');
  assert.equal(getSlopeColor(8.0), '#84cc16');
  assert.equal(getSlopeColor(11.99), '#84cc16');

  assert.deepEqual(getSlopeRgb(5.0), [132, 204, 22]);
  assert.deepEqual(getSlopeRgb(11.99), [132, 204, 22]);
});

test('Slope Hazard: 12.0° to 14.99° evaluates to caution amber', () => {
  assert.equal(getSlopeColor(12.0), '#f59e0b');
  assert.equal(getSlopeColor(13.5), '#f59e0b');
  assert.equal(getSlopeColor(14.99), '#f59e0b');

  assert.deepEqual(getSlopeRgb(12.0), [245, 158, 11]);
  assert.deepEqual(getSlopeRgb(14.99), [245, 158, 11]);
});

test('Slope Hazard: >= 15.0° strictly triggers critical Artemis III tip-over hazard red', () => {
  // Boundary tests
  assert.equal(getSlopeColor(15.0), '#dc2626', 'Exact 15.0° must be red hazard');
  assert.equal(getSlopeColor(15.01), '#dc2626', '15.01° must be red hazard');
  assert.equal(getSlopeColor(22.0), '#dc2626', '22.0° must be red hazard');
  assert.equal(getSlopeColor(35.0), '#dc2626', '35.0° must be red hazard');

  assert.deepEqual(getSlopeRgb(15.0), [220, 38, 38]);
  assert.deepEqual(getSlopeRgb(15.01), [220, 38, 38]);
  assert.deepEqual(getSlopeRgb(30.0), [220, 38, 38]);
});

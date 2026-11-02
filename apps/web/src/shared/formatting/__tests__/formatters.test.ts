import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNumber,
  formatElevation,
  formatAngle,
  formatDistance,
  formatDuration,
  formatCoordinate,
  formatScientificMetric,
} from '@/shared/formatting/formatters';

describe('Defensive Formatters Regression Suite', () => {
  describe('formatNumber', () => {
    it('formats normal finite numbers with correct precision', () => {
      assert.equal(formatNumber(12.3456, { decimals: 2 }), '12.35');
      assert.equal(formatNumber(1234.5, { decimals: 1 }), '1,234.5');
    });

    it('handles legitimate zero correctly without returning fallback', () => {
      assert.equal(formatNumber(0, { decimals: 2 }), '0.00');
      assert.equal(formatNumber(0, { decimals: 0 }), '0');
      assert.equal(formatNumber(-0, { decimals: 1 }), '0.0');
    });

    it('respects the sign flag for positive numbers', () => {
      assert.equal(formatNumber(5.2, { decimals: 1, sign: true }), '+5.2');
      assert.equal(formatNumber(-5.2, { decimals: 1, sign: true }), '-5.2');
      assert.equal(formatNumber(0, { decimals: 1, sign: true }), '0.0');
    });

    it('returns custom or standard fallback for undefined, null, NaN, and Infinity', () => {
      assert.equal(formatNumber(undefined), '—');
      assert.equal(formatNumber(null), '—');
      assert.equal(formatNumber(NaN), '—');
      assert.equal(formatNumber(Infinity), '—');
      assert.equal(formatNumber(-Infinity), '—');
      assert.equal(formatNumber('invalid-string'), '—');
      assert.equal(formatNumber(undefined, { fallback: 'N/A' }), 'N/A');
    });
  });

  describe('formatElevation', () => {
    it('formats positive elevation with plus sign and meters', () => {
      assert.equal(formatElevation(4250), '+4,250 m');
      assert.equal(formatElevation(610), '+610 m');
    });

    it('formats negative elevation (e.g. crater floor) with minus sign', () => {
      assert.equal(formatElevation(-3800), '-3,800 m');
    });

    it('formats 0 elevation', () => {
      assert.equal(formatElevation(0), '0 m');
    });

    it('defensively handles undefined without throwing toLocaleString on undefined', () => {
      assert.equal(formatElevation(undefined), '—');
      assert.equal(formatElevation(null), '—');
    });
  });

  describe('formatAngle', () => {
    it('formats angles with degree symbol', () => {
      assert.equal(formatAngle(52.89, { decimals: 1 }), '52.9°');
      assert.equal(formatAngle(-0.45, { decimals: 2, sign: true }), '-0.45°');
      assert.equal(formatAngle(0.073, { decimals: 3, sign: true }), '+0.073°');
    });

    it('defensively handles missing angle values', () => {
      assert.equal(formatAngle(undefined), '—');
    });
  });

  describe('formatDistance', () => {
    it('formats distance with kilometer units and grouping', () => {
      assert.equal(formatDistance(390853), '390,853 km');
      assert.equal(formatDistance(384400.5, 1), '384,400.5 km');
    });

    it('defensively handles missing distances', () => {
      assert.equal(formatDistance(undefined), '—');
    });
  });

  describe('formatDuration', () => {
    it('formats light-travel time with seconds unit', () => {
      assert.equal(formatDuration(1.3002, 4), '1.3002 s');
    });

    it('defensively handles missing duration', () => {
      assert.equal(formatDuration(undefined), '—');
    });
  });

  describe('formatCoordinate', () => {
    it('formats South Pole latitude with South suffix', () => {
      assert.equal(formatCoordinate(-89.9, 'latitude', 3), '89.900°S');
      assert.equal(formatCoordinate(-85.2, 'latitude', 1), '85.2°S');
    });

    it('formats longitude with East suffix', () => {
      assert.equal(formatCoordinate(271.4, 'longitude', 3), '271.400°E');
      assert.equal(formatCoordinate(0, 'longitude', 3), '0.000°E');
    });

    it('defensively handles missing coordinates', () => {
      assert.equal(formatCoordinate(undefined, 'latitude'), '—');
    });
  });

  describe('formatScientificMetric', () => {
    it('formats available metric correctly', () => {
      const metric = { kind: 'available', value: 1.3002 };
      const formatted = formatScientificMetric(metric, 's', 4);
      assert.equal(formatted.displayValue, '1.3002');
      assert.equal(formatted.unitText, 's');
      assert.equal(formatted.isAvailable, true);
    });

    it('handles unavailable metric gracefully without throwing', () => {
      const metric = { kind: 'unavailable', reason: 'Behind lunar farside' };
      const formatted = formatScientificMetric(metric, '°', 2);
      assert.equal(formatted.displayValue, '—');
      assert.equal(formatted.isAvailable, false);
      assert.equal(formatted.statusNote, 'Behind lunar farside');
    });

    it('handles null/undefined metric gracefully', () => {
      const formatted = formatScientificMetric(null);
      assert.equal(formatted.displayValue, '—');
      assert.equal(formatted.isAvailable, false);
    });
  });
});

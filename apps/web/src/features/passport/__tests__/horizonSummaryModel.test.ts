import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_SITES } from '@luna/contracts';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';
import type { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import {
  computeHorizonSummary,
  type HorizonSummaryData,
} from '@/features/passport/model/horizonSummaryModel';

const SITE = CANDIDATE_SITES[0];
const EPOCH = new Date('2026-10-21T12:00:00Z');

test('computeHorizonSummary extracts topocentric clearances and verdicts accurately', () => {
  const conditions = calculateSiteConditions(SITE, EPOCH, 'terrain-aware');
  const summary: HorizonSummaryData = computeHorizonSummary(conditions, SITE);

  assert.ok(summary !== null, 'summary should not be null');
  assert.equal(typeof summary.meanHorizonDeg, 'number');
  assert.equal(typeof summary.maxObstructionDeg, 'number');
  assert.ok(['clear', 'obscured', 'indeterminate'].includes(summary.sunVerdict));
  assert.ok(['clear', 'obscured', 'indeterminate'].includes(summary.earthVerdict));

  if (summary.sunClearanceDeg !== null) {
    if (summary.sunClearanceDeg > 0) {
      assert.equal(summary.sunVerdict, 'clear');
    } else {
      assert.equal(summary.sunVerdict, 'obscured');
    }
  }

  if (summary.earthClearanceDeg !== null) {
    if (summary.earthClearanceDeg > 0) {
      assert.equal(summary.earthVerdict, 'clear');
    } else {
      assert.equal(summary.earthVerdict, 'obscured');
    }
  }
});

test('computeHorizonSummary handles missing or indeterminate masks gracefully', () => {
  const blankConditions = {} as unknown as CelestialGeometryResult;
  const summary = computeHorizonSummary(blankConditions, SITE);

  assert.equal(summary.sunClearanceDeg, null);
  assert.equal(summary.earthClearanceDeg, null);
  assert.equal(summary.sunVerdict, 'indeterminate');
  assert.equal(summary.earthVerdict, 'indeterminate');
});

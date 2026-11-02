import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLandingWindow } from '@/domain/celestial/missionWindows';
import { getSiteById } from '@/domain/sites/catalog';

test('Mission Window Evaluator: calculates 14-day mission window for Shackleton Rim', () => {
  const shackleton = getSiteById('shackleton-rim')!;
  assert.ok(shackleton);

  // Test during southern summer (December 2026)
  const summerDate = new Date('2026-12-14T00:00:00Z');
  const window = evaluateLandingWindow(shackleton, summerDate, 14, 'terrain-aware');

  assert.equal(window.siteId, 'shackleton-rim');
  assert.equal(window.durationDays, 14);
  assert.equal(window.totalHours, 336); // 14 * 24
  assert.ok(window.sunlightPercentage > 60);
  assert.ok(window.continuousSunlightHours > 50);
  assert.ok(window.maxShadowHours < 100);
  assert.ok(window.dteAvailabilityPercentage > 70);
  assert.equal(window.timelineSamples.length, 56); // 14 days * 4 samples/day (6h step)
});

test('Mission Window Evaluator: validates Apollo 11 equatorial baseline', () => {
  const apollo11 = getSiteById('apollo-11')!;
  assert.ok(apollo11);

  // Apollo 11 lands on the near side equator: Earth is continuously overhead at ~60°
  const testDate = new Date('2026-10-21T12:00:00Z');
  const window = evaluateLandingWindow(apollo11, testDate, 14, 'terrain-aware');

  // Near-side equator: 100% direct-to-Earth communication visibility
  assert.equal(window.dteAvailabilityPercentage, 100);
  assert.equal(window.maxDteOutageHours, 0);
});

test('Mission Window Evaluator: validates Chang\'e 6 far-side communication blackout', () => {
  const change6 = getSiteById('change-6')!;
  assert.ok(change6);

  const testDate = new Date('2026-10-21T12:00:00Z');
  const window = evaluateLandingWindow(change6, testDate, 14, 'terrain-aware');

  // Lunar far side has 0% direct-to-Earth line of sight
  assert.equal(window.dteAvailabilityPercentage, 0);
  assert.equal(window.maxDteOutageHours, 336); // entire mission duration
});

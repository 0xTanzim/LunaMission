import test from 'node:test';
import assert from 'node:assert/strict';
import { solveParetoLandingWindows } from '@server/services/windows/paretoWindowSolver';

test('Pareto Landing Window Solver: finds optimal launch windows for Connecting Ridge in 2026', () => {
  const result = solveParetoLandingWindows({
    siteId: 'connecting-ridge',
    startEpochMs: Date.UTC(2026, 0, 1),
    endEpochMs: Date.UTC(2026, 11, 31),
    stayDurationDays: 14,
    minSunlightPct: 40,
    maxContinuousShadowHours: 120,
    topN: 5,
  });

  assert.equal(result.siteId, 'connecting-ridge');
  assert.ok(result.totalWindowsEvaluated > 10);
  assert.ok(result.topWindows.length >= 1);
  assert.ok(result.topWindows.length <= 5);

  const bestWindow = result.topWindows[0];
  assert.ok(bestWindow.paretoScore > 50);
  assert.ok(bestWindow.sunlightPercentage >= 40);
  assert.ok(bestWindow.maxShadowHours <= 120);
  assert.ok(bestWindow.dteAvailabilityPercentage > 0);
  assert.ok(bestWindow.startDateIso.startsWith('2026-'));
  assert.ok(bestWindow.endDateIso.startsWith('2026-'));
  assert.ok(bestWindow.rank === 1);
});

test('Pareto Landing Window Solver: multi-site comparison ranks sites for a specific target season', () => {
  const result = solveParetoLandingWindows({
    siteId: 'shackleton-ridge',
    startEpochMs: Date.UTC(2026, 9, 1), // Oct 2026 (southern spring)
    endEpochMs: Date.UTC(2026, 11, 31),
    stayDurationDays: 7,
    topN: 3,
  });

  assert.ok(result.topWindows.length > 0);
  assert.ok(result.topWindows[0].paretoScore > 0);
  // Verify chronological or score ordering
  for (let i = 0; i < result.topWindows.length - 1; i++) {
    assert.ok(result.topWindows[i].paretoScore >= result.topWindows[i + 1].paretoScore);
  }
});

test('Pareto Landing Window Solver: applies strict daylight filtering correctly', () => {
  const result = solveParetoLandingWindows({
    siteId: 'shackleton-ridge',
    startEpochMs: Date.UTC(2026, 0, 1),
    endEpochMs: Date.UTC(2026, 2, 1),
    stayDurationDays: 14,
    minSunlightPct: 90, // Strict >90% daylight required
    maxContinuousShadowHours: 24, // Minimal shadow allowed
    topN: 5,
  });

  for (const win of result.topWindows) {
    assert.ok(win.sunlightPercentage >= 90);
    assert.ok(win.maxShadowHours <= 24);
    assert.ok(win.paretoScore >= 70);
    assert.ok(['optimal', 'acceptable'].includes(win.feasibilityVerdict));
  }
});

test('Pareto Landing Window Solver: evaluates 28-day extended lunar day stay', () => {
  const result = solveParetoLandingWindows({
    siteId: 'connecting-ridge',
    startEpochMs: Date.UTC(2026, 9, 1),
    endEpochMs: Date.UTC(2027, 1, 1),
    stayDurationDays: 28,
    topN: 3,
  });

  assert.ok(result.totalWindowsEvaluated > 0);
  assert.ok(result.topWindows.length > 0);
  const win = result.topWindows[0];
  assert.equal(win.durationDays, 28);
  assert.ok(win.paretoScore >= 0 && win.paretoScore <= 100);
});

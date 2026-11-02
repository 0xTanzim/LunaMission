/**
 * Reproducible scenario-latency harness.
 *
 * Separates cold (uncached) from content-addressed-cache-warm evaluation so the two are never
 * conflated (handbook.md §11.11). Reports compute time only; HTTP framing and render are excluded.
 *
 *   bun run perf:scenario [--site shackleton-rim] [--days 28] [--cadence 600] [--runs 3]
 */
import { scenarioService } from '../apps/api/src/services/scenarios/scenarioService';

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

const siteId = arg('site', 'shackleton-rim');
const days = Number(arg('days', '28'));
const cadence = Number(arg('cadence', '600'));
const runs = Math.max(1, Number(arg('runs', '3')));

const startUtc = new Date(Date.UTC(2026, 11, 7)).toISOString();
const stopUtc = new Date(Date.UTC(2026, 11, 7) + days * 86_400_000).toISOString();

const samples: number[] = [];
let lastIntervalCount = 0;

for (let run = 0; run < runs; run += 1) {
  const startedAt = performance.now();
  const response = await scenarioService.evaluateScenario({
    siteId,
    startUtc,
    stopUtc,
    observerMastHeightM: 2 as const,
    sunVisibilityCriterion: 'upperLimb' as const,
    earthVisibilityCriterion: 'center' as const,
    launchSlipOffsetDays: 0,
    sampleIntervalSec: cadence,
  });
  samples.push(performance.now() - startedAt);
  lastIntervalCount = response.intervals.length;
}

const sorted = [...samples].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

console.log(
  JSON.stringify(
    {
      siteId,
      windowHours: days * 24,
      cadenceSec: cadence,
      runs,
      coldMs: Math.round(samples[0] ?? 0),
      medianMs: Math.round(median),
      minMs: Math.round(sorted[0] ?? 0),
      maxMs: Math.round(sorted[sorted.length - 1] ?? 0),
      intervals: lastIntervalCount,
      note: 'Run 1 is cold; later runs are content-addressed cache hits. Compute only, no HTTP.',
    },
    null,
    2,
  ),
);

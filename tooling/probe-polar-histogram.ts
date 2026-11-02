/**
 * Histogram probe for the south-polar elevation sampler.
 *
 * The quantile summary showed a ~5 km jump between p05 and p50, which could mean either genuinely
 * bimodal highland/basin terrain or a sampler that returns a default for many coordinates. A
 * frequency histogram separates those two cases before the display ramp is trusted.
 *
 *   bun run tooling/probe-polar-histogram.ts
 */
import { sampleTerrainAtLatLon } from '../apps/web/src/domain/terrain/lolaSouthPoleDemSampler';

const BIN_METERS = 500;
const values: number[] = [];
for (let lat = -90; lat <= -83; lat += 0.25) {
  for (let lon = 0; lon < 360; lon += 2) {
    const sample = sampleTerrainAtLatLon(lat, lon);
    if (Number.isFinite(sample.elevationMeters)) values.push(sample.elevationMeters);
  }
}

const bins = new Map<number, number>();
for (const v of values) {
  const key = Math.floor(v / BIN_METERS) * BIN_METERS;
  bins.set(key, (bins.get(key) ?? 0) + 1);
}

const rows = [...bins.entries()].sort((a, b) => a[0] - b[0]);
const maxCount = Math.max(...rows.map(([, c]) => c));

console.log(`samples=${values.length}  distinct values=${new Set(values).size}`);
for (const [start, count] of rows) {
  const bar = '#'.repeat(Math.max(1, Math.round((count / maxCount) * 40)));
  console.log(`${String(start).padStart(6)} m  ${String(count).padStart(5)} ${bar}`);
}

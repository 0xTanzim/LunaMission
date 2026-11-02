/**
 * Probes the south-polar elevation domain that the 83°S–90°S sheet actually contains.
 *
 * The 2D polar map used the global lunar ramp (−9000…+9000 m), which spends most of its stops on
 * elevations the polar cap does not hold — so the whole cap rendered in one narrow band of the
 * palette. This script measures the real distribution so the polar display domain is derived from
 * data rather than guessed, and prints a ready-to-paste domain constant.
 *
 *   bun run tooling/probe-polar-domain.ts
 */
import { sampleTerrainAtLatLon } from '../apps/web/src/domain/terrain/lolaSouthPoleDemSampler';

const values: number[] = [];
for (let lat = -90; lat <= -83; lat += 0.25) {
  for (let lon = 0; lon < 360; lon += 2) {
    const sample = sampleTerrainAtLatLon(lat, lon);
    if (Number.isFinite(sample.elevationMeters)) values.push(sample.elevationMeters);
  }
}
values.sort((a, b) => a - b);
const quantile = (p: number): number => values[Math.floor((values.length - 1) * p)]!;

console.log(
  JSON.stringify(
    {
      samples: values.length,
      min: Math.round(values[0]!),
      p01: Math.round(quantile(0.01)),
      p05: Math.round(quantile(0.05)),
      p50: Math.round(quantile(0.5)),
      p95: Math.round(quantile(0.95)),
      p99: Math.round(quantile(0.99)),
      max: Math.round(values[values.length - 1]!),
    },
    null,
    2,
  ),
);

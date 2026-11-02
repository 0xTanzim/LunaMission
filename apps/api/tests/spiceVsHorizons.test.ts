import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateSpiceVsHorizonsArtifact } from '../../../tooling/scripts/validate_spice_vs_horizons';

describe('Milestone M3: SPICE DE421 vs NASA JPL Horizons Validation', () => {
  const artifactPath = join(process.cwd(), 'validation', 'artifacts', 'm3_spice_vs_horizons.json');

  it('generates reproducible proof artifact meeting sub-millidegree tolerance', async () => {
    const { artifact, verified } = await generateSpiceVsHorizonsArtifact();
    expect(verified).toBe(true);
    expect(artifact.milestone).toBe('M3');
    expect(artifact.reference_frame).toBe('MOON_ME_DE421');
    expect(artifact.relativistic_offset_seconds).toBe(69.184);

    const metrics = artifact.metrics as {
      sampleCount: number;
      maxResidualDeg: number;
      meanResidualDeg: number;
      residualThresholdDeg: number;
    };

    expect(metrics.sampleCount).toBe(18);
    expect(metrics.maxResidualDeg).toBeLessThanOrEqual(0.001);
    expect(metrics.residualThresholdDeg).toBe(0.001);
  });

  it('persists certified validation/artifacts/m3_spice_vs_horizons.json on disk', () => {
    expect(existsSync(artifactPath)).toBe(true);

    const raw = readFileSync(artifactPath, 'utf-8');
    const data = JSON.parse(raw);

    expect(data.verified).toBe(true);
    expect(data.milestone).toBe('M3');
    expect(data.reference_frame).toBe('MOON_ME_DE421');
    expect(data.relativistic_offset_seconds).toBe(69.184);
    expect(data.metrics.maxResidualDeg).toBeLessThanOrEqual(0.001);
    expect(data.metrics.sampleCount).toBe(18);

    // Validate 3 benchmark sites are present
    const siteIds = data.benchmark_sites.map((s: { siteId: string }) => s.siteId);
    expect(siteIds).toContain('connecting-ridge');
    expect(siteIds).toContain('shackleton-rim');
    expect(siteIds).toContain('de-gerlache-rim-1');

    // Validate all individual residuals are <= 0.001 deg
    for (const site of data.benchmark_sites) {
      expect(site.comparisons.length).toBe(6); // 3 epochs * 2 targets
      for (const comp of site.comparisons) {
        expect(comp.residuals.angularResidualDeg).toBeLessThanOrEqual(0.001);
        expect(Number.isFinite(comp.horizons.azimuthDeg)).toBe(true);
        expect(Number.isFinite(comp.horizons.elevationDeg)).toBe(true);
        expect(Number.isFinite(comp.horizons.rangeKm)).toBe(true);
        expect(Number.isFinite(comp.spice.azimuthDeg)).toBe(true);
        expect(Number.isFinite(comp.spice.elevationDeg)).toBe(true);
      }
    }
  });
});

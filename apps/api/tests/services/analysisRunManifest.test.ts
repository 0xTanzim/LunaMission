import { describe, expect, it } from 'bun:test';
import { analysisRunManifestSchema, scenarioEvaluateRequestSchema } from '@luna/contracts';
import {
  buildAnalysisRunManifest,
  canonicalJson,
  canonicalizeForFingerprint,
  sha256Hex,
  type AnalysisRunProvenance,
} from '../../src/services/scenarios/analysisRunManifest';
import { scenarioService } from '../../src/services/scenarios/scenarioService';

const provenance: AnalysisRunProvenance = {
  algorithmVersion: 'LunaMission-Engine-2.0.0/ROLLE_HERMITE_BRENT_EVENT_SPLITTER',
  solverConfig: {
    sunLimbCriterion: 'upper_limb_footprint_min',
    earthLimbCriterion: 'center',
    rootBracketToleranceSec: 1.0,
    tangentialGrazeToleranceDeg: 1e-7,
  },
  ephemerisSource: 'NASA_JPL_HORIZONS_API_COORD_301',
  ephemerisDataset: 'DE421/DE440',
  terrainProductId: 'NASA_LOLA_PDS_LDEM_85S_20M',
  terrainSpatialResolutionM: 20,
  horizonProfileAzimuthBins: 360,
};

function request(overrides: Record<string, unknown> = {}) {
  return scenarioEvaluateRequestSchema.parse({
    siteId: 'connecting-ridge',
    startUtc: '2026-11-01T00:00:00.000Z',
    stopUtc: '2026-11-15T00:00:00.000Z',
    observerMastHeightM: 2.0,
    ...overrides,
  });
}

const metrics = {
  totalEvaluationHours: 336.0,
  cumulativeSunlitHours: 336.0,
  solarAccessPercentage: 100.0,
  longestContinuousSunlitWindowHours: 336.0,
  longestContinuousDarkWindowHours: 0.0,
  cumulativeDteHours: 55.98,
  dteAccessPercentage: 16.66,
  longestDteGapHours: 62.4,
  cumulativeOverlapHours: 55.98,
  overlapPercentage: 16.66,
  topographicShadowPenaltyHours: 0.0,
};

const output = { status: 'valid' as const, metrics, intervalCount: 3 };

describe('AnalysisRunManifest canonicalization', () => {
  it('produces byte-identical canonical JSON for reordered object keys at every depth', () => {
    const forward = {
      scenarioInputs: { siteId: 'connecting-ridge', observerMastHeightM: 2, nested: { beta: 2, alpha: 1 } },
      provenance: { terrain: { productId: 'A', resolutionM: 20 }, ephemeris: { dataset: 'D' } },
    };
    const reversed = {
      provenance: { ephemeris: { dataset: 'D' }, terrain: { resolutionM: 20, productId: 'A' } },
      scenarioInputs: { nested: { alpha: 1, beta: 2 }, observerMastHeightM: 2, siteId: 'connecting-ridge' },
    };

    expect(canonicalJson(forward)).toBe(canonicalJson(reversed));
    expect(sha256Hex(canonicalJson(forward))).toBe(sha256Hex(canonicalJson(reversed)));
  });

  it('preserves array order because it is semantically significant', () => {
    expect(canonicalJson({ ids: ['a', 'b'] })).not.toBe(canonicalJson({ ids: ['b', 'a'] }));
  });

  it('drops undefined members and rejects non-finite numbers instead of emitting null', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(() => canonicalizeForFingerprint({ a: Number.NaN })).toThrow(/Non-finite/);
    expect(() => canonicalizeForFingerprint({ a: Number.POSITIVE_INFINITY })).toThrow(/Non-finite/);
    expect(() => canonicalizeForFingerprint({ a: () => 1 })).toThrow(/Unsupported value type/);
  });

  it('serialises Date instances through their ISO representation', () => {
    const epoch = Date.parse('2026-11-01T00:00:00.000Z');
    expect(canonicalJson({ at: new Date(epoch) })).toBe(canonicalJson({ at: '2026-11-01T00:00:00.000Z' }));
  });
});

describe('AnalysisRunManifest fingerprint', () => {
  const baseline = buildAnalysisRunManifest({ request: request(), provenance, output });

  it('is a 64-hex-character SHA-256 digest and satisfies the published contract', () => {
    expect(baseline.runFingerprintSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(baseline.outputFingerprintSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(() => analysisRunManifestSchema.parse(baseline)).not.toThrow();
  });

  it('is invariant to the insertion order of the request and provenance objects', () => {
    const shuffledProvenance: AnalysisRunProvenance = {
      horizonProfileAzimuthBins: 360,
      terrainSpatialResolutionM: 20,
      terrainProductId: 'NASA_LOLA_PDS_LDEM_85S_20M',
      ephemerisDataset: 'DE421/DE440',
      ephemerisSource: 'NASA_JPL_HORIZONS_API_COORD_301',
      solverConfig: {
        tangentialGrazeToleranceDeg: 1e-7,
        rootBracketToleranceSec: 1.0,
        earthLimbCriterion: 'center',
        sunLimbCriterion: 'upper_limb_footprint_min',
      },
      algorithmVersion: 'LunaMission-Engine-2.0.0/ROLLE_HERMITE_BRENT_EVENT_SPLITTER',
    };
    const reorderedRequest = scenarioEvaluateRequestSchema.parse({
      stopUtc: '2026-11-15T00:00:00.000Z',
      observerMastHeightM: 2.0,
      startUtc: '2026-11-01T00:00:00.000Z',
      siteId: 'connecting-ridge',
    });

    const reordered = buildAnalysisRunManifest({
      request: reorderedRequest,
      provenance: shuffledProvenance,
      output,
    });

    expect(reordered.runFingerprintSha256).toBe(baseline.runFingerprintSha256);
    expect(reordered.outputFingerprintSha256).toBe(baseline.outputFingerprintSha256);
  });

  it('changes for every altered scenario input', () => {
    const variants: Record<string, unknown>[] = [
      { siteId: 'shackleton-rim' },
      { startUtc: '2026-11-01T00:10:00.000Z' },
      { stopUtc: '2026-11-14T00:00:00.000Z' },
      { observerMastHeightM: 5.0 },
      { sunVisibilityCriterion: 'fullDisk' },
      { earthVisibilityCriterion: 'fullDisk' },
      { launchSlipOffsetDays: 1.0 },
      { sampleIntervalSec: 300 },
    ];

    const digests = new Set<string>([baseline.runFingerprintSha256]);
    for (const override of variants) {
      digests.add(buildAnalysisRunManifest({ request: request(override), provenance, output }).runFingerprintSha256);
    }
    expect(digests.size).toBe(variants.length + 1);
  });

  it('changes for every altered provenance component', () => {
    const variants: Partial<AnalysisRunProvenance>[] = [
      { algorithmVersion: 'LunaMission-Engine-2.0.1/ROLLE_HERMITE_BRENT_EVENT_SPLITTER' },
      { ephemerisSource: 'NASA_JPL_HORIZONS_API_COORD_500' },
      { ephemerisDataset: 'DE440' },
      { terrainProductId: 'NASA_LOLA_PDS_LDEM_80S_20M' },
      { terrainSpatialResolutionM: 5 },
      { horizonProfileAzimuthBins: 720 },
      { solverConfig: { ...provenance.solverConfig, rootBracketToleranceSec: 0.5 } },
    ];

    const digests = new Set<string>([baseline.runFingerprintSha256]);
    for (const override of variants) {
      digests.add(
        buildAnalysisRunManifest({ request: request(), provenance: { ...provenance, ...override }, output })
          .runFingerprintSha256,
      );
    }
    expect(digests.size).toBe(variants.length + 1);
  });

  it('keeps the run fingerprint stable when only the reported output changes', () => {
    const changed = buildAnalysisRunManifest({
      request: request(),
      provenance,
      output: { status: 'valid-with-limitations', metrics: { ...metrics, cumulativeSunlitHours: 312.5 }, intervalCount: 4 },
    });

    expect(changed.runFingerprintSha256).toBe(baseline.runFingerprintSha256);
    expect(changed.outputFingerprintSha256).not.toBe(baseline.outputFingerprintSha256);
  });

  it('records the horizon grid implied by the azimuth bin count', () => {
    expect(baseline.horizonGrid).toEqual({ azimuthBins: 360, stepDeg: 1.0 });
    expect(buildAnalysisRunManifest({ request: request(), provenance: { ...provenance, horizonProfileAzimuthBins: 720 }, output }).horizonGrid.stepDeg)
      .toBe(0.5);
  });
});

describe('AnalysisRunManifest provenance wiring', () => {
  it('is published on the scenario evaluation provenance and is reproducible across cache hits', async () => {
    const payload = request({ siteId: 'nobile-rim-1' });

    const first = await scenarioService.evaluateScenario(payload);
    const second = await scenarioService.evaluateScenario(payload);

    const manifest = first.provenance.analysisRunManifest;
    expect(manifest).toBeDefined();
    expect(manifest!.runFingerprintSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest!.ephemerisSource).toBe(first.provenance.ephemerisSource);
    expect(manifest!.terrainProductId).toBe(first.provenance.terrainModelSource);
    expect(manifest!.algorithmVersion).toContain(first.provenance.solverAlgorithm);
    expect(manifest!.scenarioInputs.siteId).toBe('nobile-rim-1');

    expect(second.provenance.casCacheHit).toBe(true);
    expect(second.provenance.analysisRunManifest).toEqual(manifest);
  }, 30000);

  it('distinguishes two different scenarios evaluated by the same service', async () => {
    const a = await scenarioService.evaluateScenario(request({ siteId: 'shackleton-rim' }));
    const b = await scenarioService.evaluateScenario(request({ siteId: 'shackleton-rim', observerMastHeightM: 10.0 }));

    expect(a.provenance.analysisRunManifest).toBeDefined();
    expect(b.provenance.analysisRunManifest).toBeDefined();
    expect(a.provenance.analysisRunManifest!.runFingerprintSha256).not.toBe(
      b.provenance.analysisRunManifest!.runFingerprintSha256,
    );
  }, 30000);
});

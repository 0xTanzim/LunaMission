/**
 * Immutable AnalysisRunManifest
 * Masterplan §Pillar E.4 and §9 — deterministic SHA-256 fingerprinting of a scenario
 * evaluation so any published result can be reconstructed and verified by a third party.
 *
 * Two independent fingerprints are produced:
 *   - `runFingerprintSha256`    identifies the *configuration*: scenario inputs plus the
 *                               ephemeris, terrain, solver and algorithm provenance.
 *   - `outputFingerprintSha256` identifies the *reported numbers* of this run.
 *
 * Canonicalization is a recursive key sort followed by `JSON.stringify`. Array order is
 * preserved because it can be semantically significant. Values that are `undefined` are
 * dropped, and non-finite numbers are rejected rather than serialised as `null`, so two
 * runs can never collide through a silent lossy conversion. No wall-clock timestamp enters
 * either fingerprint, which is what makes the digest reproducible.
 *
 * C14 (masterplan §5 Pillar E.4, §9) additionally records what a third party needs in order to
 * *rebuild* the run rather than merely recognise it: the application commit (injected through
 * `GIT_COMMIT`/`GIT_SHA` at startup, never shelled out during a request), the SHA-256 of every
 * checked-in dataset that fed the run, the ephemeris/terrain/frame/solver kernel identifiers and
 * the numerical tolerances. All four participate in `runFingerprintSha256`, so changing a
 * tolerance or a dataset changes the fingerprint; all four are pure functions of environment
 * and repository bytes, so none of them can break determinism.
 */

import { createHash } from 'node:crypto';
import type {
  AnalysisRunDatasetChecksum,
  AnalysisRunKernel,
  AnalysisRunManifest,
  AnalysisRunNumericalTolerances,
  ScenarioEvaluateRequest,
  SummaryMetrics,
  SixStateResultStatus,
} from '@luna/contracts';
import {
  APPLICATION_COMMIT,
  buildKernelVersions,
  buildNumericalTolerances,
  getDatasetChecksums,
} from './analysisRunEvidence';

export const MANIFEST_VERSION = '1.0.0';

export interface AnalysisRunProvenance {
  readonly algorithmVersion: string;
  readonly solverConfig: Readonly<Record<string, number | string | boolean>>;
  readonly ephemerisSource: string;
  readonly ephemerisDataset: string;
  readonly terrainProductId: string;
  readonly terrainSpatialResolutionM: number;
  readonly horizonProfileAzimuthBins: number;
}

export interface AnalysisRunOutput {
  readonly status: SixStateResultStatus;
  readonly metrics: SummaryMetrics;
  readonly intervalCount: number;
}

export function canonicalizeForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeForFingerprint);
  if (value instanceof Date) return value.toISOString();

  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const entry = source[key];
      if (entry === undefined) continue;
      sorted[key] = canonicalizeForFingerprint(entry);
    }
    return sorted;
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`Non-finite number cannot be fingerprinted: ${String(value)}`);
  }
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new TypeError(`Unsupported value type for fingerprinting: ${typeof value}`);
  }

  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeForFingerprint(value));
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Scenario inputs as they entered the pipeline, with defaults already applied. */
export function canonicalScenarioInputs(request: ScenarioEvaluateRequest): Record<string, unknown> {
  return {
    siteId: request.siteId,
    startUtc: request.startUtc,
    stopUtc: request.stopUtc,
    observerMastHeightM: request.observerMastHeightM,
    sunVisibilityCriterion: request.sunVisibilityCriterion,
    earthVisibilityCriterion: request.earthVisibilityCriterion,
    launchSlipOffsetDays: request.launchSlipOffsetDays,
    sampleIntervalSec: request.sampleIntervalSec,
  };
}

/**
 * Optional reconstruction evidence. Every member defaults to the value resolved from the running
 * process (commit injected by the deploy environment, digests of the checked-in datasets, live
 * solver constants), so the manifest is self-describing without any caller supplying anything —
 * yet a test or a replay tool can pin the exact values it wants to fingerprint.
 */
export interface AnalysisRunEvidenceInput {
  readonly applicationCommit?: string;
  readonly datasetChecksums?: readonly AnalysisRunDatasetChecksum[];
  readonly kernelVersions?: readonly AnalysisRunKernel[];
  readonly numericalTolerances?: AnalysisRunNumericalTolerances;
}

function numericSolverConfig(
  solverConfig: Readonly<Record<string, number | string | boolean>>,
  key: string,
): number | undefined {
  const value = solverConfig[key];
  return typeof value === 'number' ? value : undefined;
}

/** Tolerances derived from the provenance that was actually used for this run. */
function resolveNumericalTolerances(
  request: ScenarioEvaluateRequest,
  provenance: AnalysisRunProvenance,
  override?: AnalysisRunNumericalTolerances,
): AnalysisRunNumericalTolerances {
  if (override) return override;
  return buildNumericalTolerances({
    ephemerisSampleIntervalSec: request.sampleIntervalSec,
    rootBracketToleranceSec: numericSolverConfig(provenance.solverConfig, 'rootBracketToleranceSec'),
    tangentialGrazeToleranceDeg: numericSolverConfig(provenance.solverConfig, 'tangentialGrazeToleranceDeg'),
    azimuthBins: provenance.horizonProfileAzimuthBins,
  });
}

export function buildAnalysisRunManifest(args: {
  request: ScenarioEvaluateRequest;
  provenance: AnalysisRunProvenance;
  output: AnalysisRunOutput;
  evidence?: AnalysisRunEvidenceInput;
}): AnalysisRunManifest {
  const scenarioInputs = canonicalScenarioInputs(args.request);
  const horizonGrid = {
    azimuthBins: args.provenance.horizonProfileAzimuthBins,
    stepDeg: 360.0 / args.provenance.horizonProfileAzimuthBins,
  };

  const applicationCommit = args.evidence?.applicationCommit ?? APPLICATION_COMMIT;
  const datasetChecksums = [...(args.evidence?.datasetChecksums ?? getDatasetChecksums())];
  const kernelVersions = [...(args.evidence?.kernelVersions ?? buildKernelVersions())];
  const numericalTolerances = resolveNumericalTolerances(
    args.request,
    args.provenance,
    args.evidence?.numericalTolerances,
  );

  const runFingerprintSha256 = sha256Hex(
    canonicalJson({
      manifestVersion: MANIFEST_VERSION,
      canonicalization: 'recursively-key-sorted-json',
      scenarioInputs,
      algorithmVersion: args.provenance.algorithmVersion,
      solverConfig: args.provenance.solverConfig,
      ephemeris: {
        source: args.provenance.ephemerisSource,
        dataset: args.provenance.ephemerisDataset,
      },
      terrain: {
        productId: args.provenance.terrainProductId,
        spatialResolutionM: args.provenance.terrainSpatialResolutionM,
      },
      horizonGrid,
      applicationCommit,
      datasetChecksums,
      kernelVersions,
      numericalTolerances,
    }),
  );

  const outputFingerprintSha256 = sha256Hex(
    canonicalJson({
      status: args.output.status,
      metrics: args.output.metrics,
      intervalCount: args.output.intervalCount,
    }),
  );

  return {
    manifestVersion: MANIFEST_VERSION,
    canonicalization: 'recursively-key-sorted-json',
    runFingerprintSha256,
    outputFingerprintSha256,
    algorithmVersion: args.provenance.algorithmVersion,
    solverConfig: { ...args.provenance.solverConfig },
    ephemerisSource: args.provenance.ephemerisSource,
    ephemerisDataset: args.provenance.ephemerisDataset,
    terrainProductId: args.provenance.terrainProductId,
    terrainSpatialResolutionM: args.provenance.terrainSpatialResolutionM,
    horizonGrid,
    scenarioInputs,
    applicationCommit,
    datasetChecksums,
    kernelVersions,
    numericalTolerances,
  };
}

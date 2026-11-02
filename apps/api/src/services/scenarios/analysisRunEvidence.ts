/**
 * Analysis-Run Evidence: application commit, dataset digests, kernel identifiers and numerical
 * tolerances — the inputs a third party needs in order to rebuild an `AnalysisRunManifest` run.
 *
 * Plan.md § 9 ("Manifest contains kernel IDs, DEM versions, algorithm commit hash, and output
 * hashes") and § Pillar E.4.
 *
 * Every value here is a pure function of checked-in repository bytes or of `process.env` read
 * ONCE at module load. There is no wall clock, no host name and no per-request state, which is
 * what keeps `runFingerprintSha256` reproducible. Nothing in this module shells out: the commit
 * is injected by the build/deploy environment, never discovered by running `git`.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AnalysisRunDatasetChecksum,
  AnalysisRunKernel,
  AnalysisRunNumericalTolerances,
} from '@luna/contracts';
import {
  DEFAULT_AZIMUTH_STEP_DEG,
  DEFAULT_LIMB_DARKENING_COEFF,
} from '../celestial/solarDiskIntegration';
import {
  EPHEMERIS_DATASET,
  EPHEMERIS_SOURCE,
  HORIZON_AZIMUTH_BINS,
  ROOT_BRACKET_TOLERANCE_SEC,
  SOLVER_ALGORITHM,
  TANGENTIAL_GRAZE_TOLERANCE_DEG,
  TERRAIN_PRODUCT_ID,
  TERRAIN_RESOLUTION_M,
} from './engineIdentity';

/**
 * Commit of the code that produced the run. Resolved once at startup from the deploy
 * environment; `"unknown"` when the environment does not inject it (never a guessed value).
 */
export function resolveApplicationCommit(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.GIT_COMMIT ?? env.GIT_SHA;
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'unknown';
}

export const APPLICATION_COMMIT: string = resolveApplicationCommit();

export interface DatasetDescriptor {
  readonly datasetId: string;
  readonly role: 'terrain_horizon' | 'site_registry';
  /** Repository-relative path. */
  readonly path: string;
}

/** The two checked-in datasets every scenario evaluation reads. Order is fixed, never discovered. */
export const MANIFEST_DATASETS: readonly DatasetDescriptor[] = [
  { datasetId: 'LUNARMISSION_CURATED_HORIZONS', role: 'terrain_horizon', path: 'data/curated-horizons.json' },
  { datasetId: 'LUNARMISSION_SITES_REGISTRY', role: 'site_registry', path: 'data/sites-registry.json' },
];

/**
 * Locate a repository data file without assuming a cwd. Mirrors the resolution order used by the
 * horizon loader so the digest is taken from the same bytes the solver reads.
 */
export function resolveRepositoryDataPath(relativePath: string): string | null {
  const candidates = [
    join(process.cwd(), relativePath),
    join(process.cwd(), '..', '..', relativePath),
    join(__dirname, '..', '..', '..', '..', '..', relativePath),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function sha256OfFile(absolutePath: string): { sha256: string; bytes: number } {
  const bytes = readFileSync(absolutePath);
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: statSync(absolutePath).size,
  };
}

let cachedChecksums: readonly AnalysisRunDatasetChecksum[] | null = null;

/**
 * Content digests of the checked-in datasets, computed once per process and cached.
 *
 * A dataset that cannot be located or read is OMITTED rather than given a synthetic digest: an
 * invented checksum would defeat the entire point of the manifest. Callers therefore treat a
 * missing entry as "not verifiable in this environment", which is exactly what it is.
 */
export function getDatasetChecksums(): readonly AnalysisRunDatasetChecksum[] {
  if (cachedChecksums) return cachedChecksums;

  const checksums: AnalysisRunDatasetChecksum[] = [];
  for (const dataset of MANIFEST_DATASETS) {
    const absolutePath = resolveRepositoryDataPath(dataset.path);
    if (!absolutePath) continue;
    try {
      const { sha256, bytes } = sha256OfFile(absolutePath);
      checksums.push({
        datasetId: dataset.datasetId,
        role: dataset.role,
        path: dataset.path,
        sha256,
        bytes,
      });
    } catch {
      // Unreadable file: omit the entry rather than publish a fabricated digest.
    }
  }

  cachedChecksums = checksums.sort((a, b) => (a.datasetId < b.datasetId ? -1 : a.datasetId > b.datasetId ? 1 : 0));
  return cachedChecksums;
}

/** Test seam: forget the memoised digests so a fresh read can be observed. */
export function resetDatasetChecksumCache(): void {
  cachedChecksums = null;
}

/** Ephemeris, terrain, frame, time-scale and solver identifiers actually used by a run. */
export function buildKernelVersions(): AnalysisRunKernel[] {
  return [
    {
      role: 'ephemeris',
      identifier: EPHEMERIS_DATASET,
      provider: 'NASA JPL Horizons (ssd.jpl.nasa.gov/api/horizons.api)',
      note: `queried topocentrically at ${EPHEMERIS_SOURCE}`,
    },
    {
      role: 'terrain',
      identifier: TERRAIN_PRODUCT_ID,
      provider: 'NASA PDS / GSFC PGDA LOLA',
      note: `${TERRAIN_RESOLUTION_M} m/pixel, precomputed in data/curated-horizons.json`,
    },
    {
      role: 'frame',
      identifier: 'IAU_MOON_ME',
      provider: 'IAU/IAG lunar Mean Earth / Polar Axis',
      note: 'spherical reference radius 1737.4 km, flattening 0',
    },
    {
      role: 'time_scale',
      identifier: 'UTC_TO_TT_OFFSET_69.184_S',
      provider: 'IAU SOFA leap-second policy',
      note: 'fixed offset published in provenance.timeScaleOffsetTtMinusUtcSec',
    },
    {
      role: 'solver',
      identifier: SOLVER_ALGORITHM,
      provider: 'LunaMission',
      note: "four-stage Rolle's theorem event splitter with Brent root refinement",
    },
  ];
}

/**
 * Numerical resolutions a reproducer must match. Defaults come from the live modules, so a
 * change to the quadrature or to the bracket tolerance automatically moves the manifest.
 */
export function buildNumericalTolerances(args: {
  readonly ephemerisSampleIntervalSec?: number;
  readonly rootBracketToleranceSec?: number;
  readonly tangentialGrazeToleranceDeg?: number;
  readonly azimuthBins?: number;
  readonly solarDiskQuadratureStepDeg?: number;
  readonly limbDarkeningCoefficient?: number;
} = {}): AnalysisRunNumericalTolerances {
  const azimuthBins = args.azimuthBins ?? HORIZON_AZIMUTH_BINS;
  const tolerances: AnalysisRunNumericalTolerances = {
    rootBracketToleranceSec: args.rootBracketToleranceSec ?? ROOT_BRACKET_TOLERANCE_SEC,
    tangentialGrazeToleranceDeg: args.tangentialGrazeToleranceDeg ?? TANGENTIAL_GRAZE_TOLERANCE_DEG,
    azimuthBins,
    azimuthStepDeg: 360.0 / azimuthBins,
    solarDiskQuadrature: {
      azimuthStepDeg: args.solarDiskQuadratureStepDeg ?? DEFAULT_AZIMUTH_STEP_DEG,
      limbDarkeningCoefficient: args.limbDarkeningCoefficient ?? DEFAULT_LIMB_DARKENING_COEFF,
    },
  };
  if (args.ephemerisSampleIntervalSec !== undefined) {
    return { ...tolerances, ephemerisSampleIntervalSec: args.ephemerisSampleIntervalSec };
  }
  return tolerances;
}

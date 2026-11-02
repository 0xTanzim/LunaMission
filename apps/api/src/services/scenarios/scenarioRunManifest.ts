/**
 * Scenario Run Manifest Wiring
 * Governed by AGENTS.md § 5.1 (module ceiling) — keeps the evaluation service focused on the
 * scientific pipeline by owning the fixed provenance contract that feeds the C14 manifest.
 */

import type { ScenarioEvaluateRequest } from '@luna/contracts';
import { buildAnalysisRunManifest, type AnalysisRunOutput } from './analysisRunManifest';
import {
  ALGORITHM_VERSION,
  EPHEMERIS_DATASET,
  EPHEMERIS_SOURCE,
  HORIZON_AZIMUTH_BINS,
  SOLVER_CONFIG,
  TERRAIN_PRODUCT_ID,
  TERRAIN_RESOLUTION_M,
} from './engineIdentity';

/**
 * Published verbatim in `siteInfo.provenanceCitations` when the topocentric state came from the
 * analytical Meeus fallback instead of a JPL Horizons query.
 *
 * The decision trace (C13) reads this exact token to classify ephemeris evidence as
 * non-authoritative, so the string is declared once here rather than re-typed by any consumer:
 * a mismatch would silently upgrade fallback numbers to certified ones.
 */
export const EPHEMERIS_FALLBACK_CITATION = 'Meeus/DE421 Ephemeris (Horizons Outage Fallback)';

/**
 * Build the immutable manifest for a run. A pure function of (request, reported output) plus the
 * engine identity and the process-wide evidence (commit, dataset digests, tolerances), which is
 * why it can be re-derived for a cache hit without touching the solver.
 */
export function buildRunManifest(
  request: ScenarioEvaluateRequest,
  output: AnalysisRunOutput,
): ReturnType<typeof buildAnalysisRunManifest> {
  return buildAnalysisRunManifest({
    request,
    provenance: {
      algorithmVersion: ALGORITHM_VERSION,
      solverConfig: {
        ...SOLVER_CONFIG,
        ephemerisCadenceSec: request.sampleIntervalSec ?? 600,
      },
      ephemerisSource: EPHEMERIS_SOURCE,
      ephemerisDataset: EPHEMERIS_DATASET,
      terrainProductId: TERRAIN_PRODUCT_ID,
      terrainSpatialResolutionM: TERRAIN_RESOLUTION_M,
      horizonProfileAzimuthBins: HORIZON_AZIMUTH_BINS,
    },
    output,
  });
}

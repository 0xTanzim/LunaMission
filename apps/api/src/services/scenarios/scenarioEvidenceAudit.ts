/**
 * C13 Evidence Audit: what evidence exists for one candidate, and what its quality is.
 *
 * Split out of the constraint gate (AGENTS.md § 5.1) because auditing inputs is a different job
 * from applying limits: this module answers "is there a measurement, a bound, a nominal value or
 * nothing at all", and the gate decides what that means for a verdict.
 *
 * The audit never invents a value. Every `unavailable` classification below is a real absence in
 * the loaded data, and the previous silent defaults (`maxSlopeDeg ?? 7.5`) are exactly what it
 * replaces.
 */

import type {
  ConstraintName,
  DecisionEvidenceClass,
  DecisionTraceMetricId,
  ScenarioEvaluateResponse,
} from '@luna/contracts';
import { getScientificSiteInvestigation } from '../../data/scientificSiteData';
import { horizonProfileService } from '../celestial/horizonProfileService';
import {
  GATED_METRICS,
  unavailableCapabilitiesFor,
  type UnavailableCapability,
} from './decisionTraceEvidence';
import { EPHEMERIS_FALLBACK_CITATION } from './scenarioRunManifest';

export interface TerrainEvidenceAudit {
  readonly binsTotal: number;
  readonly binsNoData: number;
  readonly binsTruncated: number;
  readonly profileSource: string;
}

/**
 * Count the skyline bins that carry no value (`nodata`) and those that stop at the DEM range limit
 * (`incomplete_range_truncated`). The two are NOT equivalent: a truncated bin is a stated
 * one-sided bound, a nodata bin is no value at all (skill ref 07 § 3).
 */
export function auditTerrainEvidence(siteId: string, mastHeightMeters: number): TerrainEvidenceAudit | null {
  try {
    const profile = horizonProfileService.getHorizonProfileForSite(siteId, mastHeightMeters);
    let binsNoData = 0;
    let binsTruncated = 0;
    for (const status of profile.binStatus) {
      if (status === 'nodata') binsNoData += 1;
      else if (status === 'incomplete_range_truncated') binsTruncated += 1;
    }
    return {
      binsTotal: profile.binStatus.length,
      binsNoData,
      binsTruncated,
      profileSource: 'data/curated-horizons.json',
    };
  } catch {
    return null;
  }
}

export interface SlopeEvidence {
  readonly available: boolean;
  readonly value: number | null;
  readonly datasetId: string;
  readonly algorithm: string;
  readonly note: string;
}

/** Slope evidence with NO default: a missing profile stays missing. */
export function readSlopeEvidence(siteId: string): SlopeEvidence {
  const definition = GATED_METRICS.nominalPointSlopeDeg;
  const slope = getScientificSiteInvestigation(siteId)?.topography?.maxSlopeDeg;
  if (typeof slope === 'number' && Number.isFinite(slope)) {
    return {
      available: true,
      value: slope,
      datasetId: definition.datasetId,
      algorithm: definition.algorithm,
      note: definition.note,
    };
  }
  return {
    available: false,
    value: null,
    datasetId: definition.datasetId,
    algorithm: definition.algorithm,
    note: 'no topography profile is registered for this site in this data model',
  };
}

/** False when the topocentric state came from the analytical outage fallback. */
export function isEphemerisAuthoritative(evaluation: ScenarioEvaluateResponse): boolean {
  return !evaluation.siteInfo.provenanceCitations.includes(EPHEMERIS_FALLBACK_CITATION);
}

export interface EvidenceClassification {
  readonly evidenceClass: DecisionEvidenceClass;
  readonly note: string;
}

/**
 * Classify the evidence behind one gated metric.
 *  `measured`     all skyline bins valid, ephemeris queried;
 *  `bounded`      truncation or partial nodata: only a one-sided bound exists;
 *  `nominal_only` a single nominal point slope, no dispersion;
 *  `assumed`      analytical ephemeris fallback;
 *  `unavailable`  no value at all.
 */
export function classifyEvidence(args: {
  readonly metricId: DecisionTraceMetricId;
  readonly terrain: TerrainEvidenceAudit | null;
  readonly slope: SlopeEvidence;
  readonly ephemerisAuthoritative: boolean;
}): EvidenceClassification {
  const metric = GATED_METRICS[args.metricId];

  if (metric.datasetRole === 'site_topography') {
    return { evidenceClass: args.slope.available ? 'nominal_only' : 'unavailable', note: args.slope.note };
  }

  const parts: string[] = [metric.note];
  let evidenceClass: DecisionEvidenceClass = 'measured';

  if (args.terrain === null) {
    evidenceClass = 'unavailable';
    parts.push('the curated horizon profile could not be loaded, so no skyline exists');
  } else if (args.terrain.binsNoData > 0) {
    evidenceClass = 'bounded';
    parts.push(
      `${args.terrain.binsNoData}/${args.terrain.binsTotal} skyline bins are nodata, so the mask is undefined there`,
    );
  } else if (args.terrain.binsTruncated > 0) {
    evidenceClass = 'bounded';
    parts.push(
      `${args.terrain.binsTruncated}/${args.terrain.binsTotal} skyline bins are truncated at the DEM range limit: the mask is a conservative lower bound`,
    );
  }

  if (!args.ephemerisAuthoritative) {
    evidenceClass = 'assumed';
    parts.push('topocentric state came from the analytical Meeus fallback, not a JPL Horizons query');
  }

  return { evidenceClass, note: parts.join('; ') };
}

/**
 * Data gaps that exist for THIS candidate, on top of the model-wide capability registry. Each gap
 * names the constraints it disables, which is what makes "no data" visible at the decision level.
 */
export function auditMissingEvidence(args: {
  readonly terrain: TerrainEvidenceAudit | null;
  readonly slope: SlopeEvidence;
  readonly ephemerisAuthoritative: boolean;
  readonly evaluatedConstraints: readonly ConstraintName[];
}): UnavailableCapability[] {
  const horizonConstraints: ConstraintName[] = ['minContinuousSunlight', 'maxContinuousDarkness', 'minDte'];
  const gaps: UnavailableCapability[] = [];

  if (args.terrain === null || args.terrain.binsNoData === args.terrain.binsTotal) {
    gaps.push({
      capabilityId: 'skyline_terrain_data',
      label: 'LOLA skyline for this site and mast height',
      appliesToConstraints: horizonConstraints,
      consequence:
        'No usable terrain mask exists here, so no sunlight, shadow or Earth-contact verdict can be ' +
        'certified. A zero or nominal shadow duration would be an artefact of the gap.',
    });
  }
  if (!args.slope.available) {
    gaps.push({
      capabilityId: 'site_topography',
      label: 'Registered site topography profile',
      appliesToConstraints: ['maxLandingSlope'],
      consequence:
        'The slope limit cannot be checked, so the candidate must not be reported as meeting the ' +
        'vehicle tip-over limit.',
    });
  }
  if (!args.ephemerisAuthoritative) {
    gaps.push({
      capabilityId: 'authoritative_ephemeris',
      label: 'JPL Horizons topocentric state',
      appliesToConstraints: horizonConstraints,
      consequence:
        'The topocentric state came from the analytical fallback during a Horizons outage. Gate ' +
        'verdicts computed on it are not authoritative and must be re-run against queried states.',
    });
  }

  return [...gaps, ...unavailableCapabilitiesFor(args.evaluatedConstraints)];
}

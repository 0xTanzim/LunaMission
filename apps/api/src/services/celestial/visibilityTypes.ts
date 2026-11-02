/**
 * Visibility Solver Domain Types & Schema Contracts
 * Milestone M4: Rolle's Theorem & Brent's Method Event-Splitting Visibility Solver.
 * Governed by AGENTS.md § 1.1, § 4.4, § 5.1.
 */

import type { HorizonBinStatus } from '@luna/contracts';

export type VisibilityEventType = 'RISE' | 'SET' | 'TANGENTIAL_GRAZE';
export type CelestialTargetType = 'Sun' | 'Earth';
export type LimbCriterion = 'upper_limb' | 'center' | 'full_disk';
export type HorizonProfileType = 'nominal' | 'low' | 'high';

export interface VisibilityEvent {
  epochMs: number;
  timestampUtc: string;
  target: CelestialTargetType;
  criterion: LimbCriterion;
  type: VisibilityEventType;
  azimuthDeg: number;
  elevationDeg: number;
  horizonDeg: number;
  clearanceDeg: number;
  /** Crossing with a sign flip, or a no-flip tangential contact (skill ref 06 §7). */
  topology: 'crossing' | 'tangency';
  /** 1°-grid terrain bin the event azimuth falls in. */
  terrainBinIndex: number;
  /** Data-quality state of that bin; only `valid` is fully resolved. */
  terrainBinStatus: HorizonBinStatus;
  /** Root bracket tolerance actually used, seconds. Not physical event accuracy (ref 07 §4). */
  solverToleranceSeconds: number;
  /** d(clearance)/dt at the event, degrees per hour. */
  clearanceRateDegPerHour: number;
  /** 1/|rate|, hours per degree; null at tangency where time localisation is undefined. */
  timingSensitivityHoursPerDeg: number | null;
}

export interface VisibilityInterval {
  startEpochMs: number;
  endEpochMs: number;
  startDateUtc: string;
  endDateUtc: string;
  durationHours: number;
  target: CelestialTargetType | 'Sun_AND_Earth';
  state: 'visible' | 'blocked';
}

export interface VisibilitySummaryMetrics {
  totalEvaluationHours: number;
  totalSunlitHours: number;
  sunlightPercentage: number;
  continuousSunlightMaxHours: number;
  maxContinuousShadowHours: number;
  dteAvailabilityPercentage: number;
  maxDteOutageHours: number;
  combinedSunAndEarthHours: number;
  combinedSunAndEarthPercentage: number;
}

export interface SensitivityEnvelope {
  thetaLowMetrics: VisibilitySummaryMetrics;
  thetaHighMetrics: VisibilitySummaryMetrics;
}

export interface VisibilityReportProvenance {
  ephemerisSource: string;
  horizonSource: string;
  solverAlgorithm: string;
  bracketToleranceSeconds: number;
  tangentialGrazeToleranceDeg: number;
}

export interface VisibilityReport {
  siteId?: string;
  mastHeightMeters: number;
  events: VisibilityEvent[];
  /**
   * Full-disk Sun limb events (masterplan § 6.2, `El − R = max h` over the disk footprint).
   * They are the disk-fraction 1 ↔ <1 transitions, so interval partitioning that classifies
   * sub-intervals by `fractionalSolarDiskVisibility` needs them alongside `events`.
   */
  fullDiskSunEvents: VisibilityEvent[];
  sunlitIntervals: VisibilityInterval[];
  dteIntervals: VisibilityInterval[];
  combinedIntervals: VisibilityInterval[];
  nominalMetrics: VisibilitySummaryMetrics;
  sensitivityEnvelope: SensitivityEnvelope;
  provenance: VisibilityReportProvenance;
}

export interface SolverBenchmarkProofCase {
  id: number;
  case_name: string;
  stage: string;
  description: string;
  inputs: Record<string, unknown>;
  analytical_solution: Record<string, unknown>;
  solver_result: Record<string, unknown>;
  residuals: Record<string, number>;
  passed: boolean;
}

export interface SolverConvergenceMetrics {
  total_events_detected: number;
  max_event_time_residual_seconds: number;
  rms_event_time_residual_seconds: number;
  total_sunlit_hours_10m_hermite: number;
  total_sunlit_hours_1m_reference: number;
  total_duration_residual_hours: number;
  convergence_threshold_seconds: number;
}

export interface M4SolverProofArtifact {
  milestone: 'M4';
  timestamp: string;
  solver: string;
  governing_standards: string[];
  solver_configuration: {
    cadence_step_seconds: number;
    brent_bracket_tolerance_seconds: number;
    tangential_graze_threshold_deg: number;
    azimuth_bins_count: number;
    reference_frame: string;
  };
  analytical_proof_cases: SolverBenchmarkProofCase[];
  convergence_test: {
    target_site: string;
    site_id: string;
    epoch_start_utc: string;
    duration_hours: number;
    coarse_stepper: { cadence: string; step_seconds: number; method: string };
    fine_reference: { cadence: string; step_seconds: number; method: string };
    metrics: SolverConvergenceMetrics;
    sub_second_convergence_verified: boolean;
  };
  metrics: {
    total_benchmark_cases: number;
    passed_benchmark_cases: number;
    max_root_residual_seconds: number;
    root_bracket_tolerance_seconds: number;
    tangential_graze_tolerance_deg: number;
  };
  verified: boolean;
}

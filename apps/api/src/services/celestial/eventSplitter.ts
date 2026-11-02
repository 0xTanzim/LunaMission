/**
 * Four-Stage Rolle's Theorem & Brent Event-Splitting Engine
 * Milestone M4: Stages A-D trajectory step partitioner and event detector.
 * Governed by AGENTS.md § 4.4 and docs/SCIENCE_FEASIBILITY.md § 4.4.
 *
 * Stage B partitions on every azimuth at which the active skyline branch can change:
 * the 1° vertex grid for the centre criterion (AGENTS.md § 4.4 Stage B) plus, for the
 * finite-disk limb criteria of masterplan § 6.2, the shifted vertices Az_k ± δ where a
 * footprint end sweeps past a vertex and the branch intersections of the skyline-extremum
 * envelope. Each resulting panel then carries one affine skyline branch, so the clearance is
 * an exact cubic in time and Stages C and D isolate all of its roots.
 */

import type { HorizonProfile, TopocentricEphemerisPoint } from '@luna/contracts';
import { brentRoot } from './brentSolver';
import {
  centreAzimuthBranch,
  clampedFootprintHalfWidthDeg,
  evaluateSkylineBranch,
  extremumBreakpointsDeg,
  extremumBranchAt,
  extremumModeForLimb,
  limbSign,
  skylineCandidateBranches,
  terrainBinAt,
  type SkylineBranch,
} from './finiteDiskClearance';
import {
  computeHermiteCoeffs,
  evalHermite,
  evalHermiteDeriv,
  HermiteCoeffs,
  solveDerivativeRoots,
  solveHermiteValueCrossing,
  unwrapAzimuth,
} from './hermiteSpline';
import type {
  CelestialTargetType,
  HorizonProfileType,
  LimbCriterion,
  VisibilityEvent,
} from './visibilityTypes';

export interface SplitOptions {
  pt0: TopocentricEphemerisPoint;
  pt1: TopocentricEphemerisPoint;
  horizonProfile: HorizonProfile;
  target: CelestialTargetType;
  criterion?: LimbCriterion;
  profileType?: HorizonProfileType;
  bracketTolSec?: number;
  tangentialGrazeTolDeg?: number;
}

const TAU_EPS = 1e-8;

function normaliseAzimuth(azimuthDeg: number): number {
  return ((azimuthDeg % 360) + 360) % 360;
}

/** Interior roots of `Az(tau) = vertex + shift` for every 1° vertex in the swept range. */
function splitAtAzimuthTargets(
  cAz: HermiteCoeffs,
  tauLo: number,
  tauHi: number,
  halfWidthDeg: number,
): number[] {
  const azLo = evalHermite(cAz, tauLo);
  const azHi = evalHermite(cAz, tauHi);
  const low = Math.min(azLo, azHi);
  const high = Math.max(azLo, azHi);
  const taus: number[] = [];

  for (let vertex = Math.floor(low) - 1; vertex <= Math.ceil(high) + 1; vertex++) {
    for (const shift of [-halfWidthDeg, 0.0, halfWidthDeg]) {
      const target = vertex + shift;
      if (target <= low + TAU_EPS || target >= high - TAU_EPS) continue;
      const tau = solveHermiteValueCrossing(cAz, target, tauLo, tauHi);
      if (tau > tauLo + TAU_EPS && tau < tauHi - TAU_EPS) taus.push(tau);
    }
  }

  return taus;
}

/** Interior roots where the skyline-extremum envelope switches between candidate branches. */
function splitAtEnvelopeBranchSwitches(
  cAz: HermiteCoeffs,
  tauLo: number,
  tauHi: number,
  horizonProfile: HorizonProfile,
  halfWidthDeg: number,
  profileType: HorizonProfileType,
): number[] {
  const azLo = evalHermite(cAz, tauLo);
  const azHi = evalHermite(cAz, tauHi);
  const branches = skylineCandidateBranches(horizonProfile, 0.5 * (azLo + azHi), halfWidthDeg, profileType);
  const crossings = extremumBreakpointsDeg(branches, azLo, azHi);
  const taus: number[] = [];

  for (const crossingAz of crossings) {
    const tau = solveHermiteValueCrossing(cAz, crossingAz, tauLo, tauHi);
    if (tau > tauLo + TAU_EPS && tau < tauHi - TAU_EPS) taus.push(tau);
  }

  return taus;
}

function sortUnique(values: number[]): number[] {
  return values.sort((a, b) => a - b).filter((v, i, arr) => i === 0 || v - arr[i - 1]! > TAU_EPS);
}

export function splitStepEvents(options: SplitOptions): VisibilityEvent[] {
  const {
    pt0,
    pt1,
    horizonProfile,
    target,
    criterion = 'upper_limb',
    profileType = 'nominal',
    bracketTolSec = 1.0,
    tangentialGrazeTolDeg = 1e-7,
  } = options;

  const dtSec = (pt1.epochMs - pt0.epochMs) / 1000.0;
  if (dtSec <= 0) return [];
  const dtHr = dtSec / 3600.0;

  const cAz = computeHermiteCoeffs(
    pt0.azimuthDeg,
    unwrapAzimuth(pt0.azimuthDeg, pt1.azimuthDeg),
    pt0.azimuthRateDegHr,
    pt1.azimuthRateDegHr,
    dtHr,
  );
  const cEl = computeHermiteCoeffs(
    pt0.elevationDeg,
    pt1.elevationDeg,
    pt0.elevationRateDegHr,
    pt1.elevationRateDegHr,
    dtHr,
  );

  const r0 = pt0.angularRadiusDeg;
  const r1 = pt1.angularRadiusDeg;
  const cLimb = limbSign(criterion);
  const mode = extremumModeForLimb(criterion);

  // Stage A: split at stationary azimuth roots (dAz/dtau = 0) so Az(tau) is monotonic per segment
  const partA = [0.0, ...solveDerivativeRoots(cAz, 0.0, 1.0, TAU_EPS), 1.0].sort((a, b) => a - b);

  const events: VisibilityEvent[] = [];

  for (let a = 0; a < partA.length - 1; a++) {
    const segLo = partA[a]!;
    const segHi = partA[a + 1]!;
    const halfWidth = mode
      ? clampedFootprintHalfWidthDeg(evalHermite(cEl, 0.5 * (segLo + segHi)), 0.5 * (r0 + r1))
      : 0.0;

    // Stage B (vertices and shifted vertices) then Stage B2 (envelope branch switches)
    const stageBPanels = sortUnique([
      segLo,
      ...splitAtAzimuthTargets(cAz, segLo, segHi, halfWidth),
      segHi,
    ]);

    for (let p = 0; p < stageBPanels.length - 1; p++) {
      const panelLo = stageBPanels[p]!;
      const panelHi = stageBPanels[p + 1]!;
      const envelopeCuts = mode
        ? splitAtEnvelopeBranchSwitches(cAz, panelLo, panelHi, horizonProfile, halfWidth, profileType)
        : [];
      const microPanels = sortUnique([panelLo, ...envelopeCuts, panelHi]);

      for (let m = 0; m < microPanels.length - 1; m++) {
        const tLo = microPanels[m]!;
        const tHi = microPanels[m + 1]!;
        const azMid = evalHermite(cAz, 0.5 * (tLo + tHi));
        const branch: SkylineBranch = mode
          ? extremumBranchAt(skylineCandidateBranches(horizonProfile, azMid, halfWidth, profileType), azMid, mode)
          : centreAzimuthBranch(horizonProfile, azMid, profileType);

        const horizonAt = (tau: number): number =>
          evaluateSkylineBranch(branch, evalHermite(cAz, tau));

        // Clearance cubic: g(tau) = El(tau) + cLimb*radius(tau) - skyline(tau)
        const cClear: HermiteCoeffs = {
          c3: cEl.c3 - branch.slope * cAz.c3,
          c2: cEl.c2 - branch.slope * cAz.c2,
          c1: cEl.c1 + cLimb * (r1 - r0) - branch.slope * cAz.c1,
          c0: cEl.c0 + cLimb * r0 - branch.offset - branch.slope * cAz.c0,
        };

        // Stage C: Rolle extrema split `g` into strictly monotonic sections
        const extrema = solveDerivativeRoots(cClear, tLo, tHi, TAU_EPS);
        const monotone = [tLo, ...extrema, tHi].sort((p1, p2) => p1 - p2);

        for (const tauExt of extrema) {
          const gExt = evalHermite(cClear, tauExt);
          if (Math.abs(gExt) > tangentialGrazeTolDeg) continue;
          const epochMs = Math.round(pt0.epochMs + tauExt * dtSec * 1000.0);
          const azimuthDeg = normaliseAzimuth(evalHermite(cAz, tauExt));
          const bin = terrainBinAt(horizonProfile, azimuthDeg, profileType);
          const rateDegPerHour = evalHermiteDeriv(cClear, tauExt) / dtHr;
          events.push({
            epochMs,
            timestampUtc: new Date(epochMs).toISOString(),
            target,
            criterion,
            type: 'TANGENTIAL_GRAZE',
            azimuthDeg,
            elevationDeg: evalHermite(cEl, tauExt),
            horizonDeg: horizonAt(tauExt),
            clearanceDeg: gExt,
            topology: 'tangency',
            terrainBinIndex: bin.index,
            terrainBinStatus: bin.status,
            solverToleranceSeconds: bracketTolSec,
            clearanceRateDegPerHour: rateDegPerHour,
            timingSensitivityHoursPerDeg:
              Math.abs(rateDegPerHour) > 0 ? 1.0 / Math.abs(rateDegPerHour) : null,
          });
        }

        // Stage D: refine opposite-sign crossings with Brent inside each monotone section
        for (let k = 0; k < monotone.length - 1; k++) {
          const pLeft = monotone[k]!;
          const pRight = monotone[k + 1]!;
          const gLeft = evalHermite(cClear, pLeft);
          const gRight = evalHermite(cClear, pRight);
          if (gLeft * gRight >= 0) continue;

          const tolTau = Math.min(1e-6, bracketTolSec / dtSec);
          const tauRoot = brentRoot((t) => evalHermite(cClear, t), pLeft, pRight, tolTau);
          const epochMs = Math.round(pt0.epochMs + tauRoot * dtSec * 1000.0);
          const elevationDeg = evalHermite(cEl, tauRoot);
          const horizonDeg = horizonAt(tauRoot);
          const effRadius = (1.0 - tauRoot) * r0 + tauRoot * r1;
          const azimuthDeg = normaliseAzimuth(evalHermite(cAz, tauRoot));
          const bin = terrainBinAt(horizonProfile, azimuthDeg, profileType);
          const rateDegPerHour = evalHermiteDeriv(cClear, tauRoot) / dtHr;

          events.push({
            epochMs,
            timestampUtc: new Date(epochMs).toISOString(),
            target,
            criterion,
            type: gLeft < 0 ? 'RISE' : 'SET',
            azimuthDeg,
            elevationDeg,
            horizonDeg,
            clearanceDeg: elevationDeg + cLimb * effRadius - horizonDeg,
            topology: 'crossing',
            terrainBinIndex: bin.index,
            terrainBinStatus: bin.status,
            solverToleranceSeconds: bracketTolSec,
            clearanceRateDegPerHour: rateDegPerHour,
            timingSensitivityHoursPerDeg:
              Math.abs(rateDegPerHour) > 0 ? 1.0 / Math.abs(rateDegPerHour) : null,
          });
        }
      }
    }
  }

  return events.sort((a, b) => a.epochMs - b.epochMs);
}

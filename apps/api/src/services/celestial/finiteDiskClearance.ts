/**
 * Finite-Disk Limb Clearance Model
 * Masterplan §6.2 — any-limb and full-disk visibility are decided against the skyline
 * extrema over the apparent disk's azimuth footprint, not against a single azimuth ray.
 *
 * Observable contract, for a body centred at (Az_c, El_c) with apparent angular radius R:
 *   any-limb  (upper_limb) : visible ⇔ El_c + R ≥ min h(Az) over the footprint
 *   full-disk (full_disk)  : visible ⇔ El_c − R ≥ max h(Az) over the footprint
 *   centre    (center)     : visible ⇔ El_c     ≥ h(Az_c)                (unchanged)
 * The footprint is [Az_c − δ, Az_c + δ] with δ = asin(sin R / cos El_c).
 *
 * The skyline h is piecewise linear on 1° vertices, so an extremum over a footprint of
 * *fixed* half-width is attained either at a footprint end or at a vertex inside it. Both
 * are affine in the footprint-centre azimuth: an end carries the slope of its own bin, an
 * interior vertex is a constant. The extremum is therefore the lower (or upper) envelope of
 * a finitely many affine functions, affine between the shifted vertices Az_k ± δ and its own
 * branch intersections. `eventSplitter` partitions on exactly those azimuths; because
 * Az_c(t) is cubic, the clearance remains piecewise cubic in time and the Stage A–D root
 * isolation stays exact and complete.
 */

import type { HorizonBinStatus, HorizonProfile } from '@luna/contracts';
import { horizonProfileService } from './horizonProfileService';
import { azimuthFootprintHalfWidthDeg } from './solarDiskIntegration';
import type { HorizonProfileType, LimbCriterion } from './visibilityTypes';

export type SkylineExtremumMode = 'min' | 'max';

/** Affine skyline branch: `elevation(azimuth) = slope * azimuth + offset`. */
export interface SkylineBranch {
  readonly slope: number;
  readonly offset: number;
}

/**
 * Largest footprint half-width resolved by the branch envelope. δ > 5° requires a body
 * elevation above ~87°, where El ± R ≥ 87° against a south-polar skyline bounded by a few
 * degrees decides the predicate on the body elevation alone, so the footprint is capped
 * rather than expanded to a full 360-vertex candidate set.
 */
export const MAX_RESOLVED_HALF_WIDTH_DEG = 5.0;

export function limbSign(criterion: LimbCriterion): number {
  if (criterion === 'upper_limb') return 1.0;
  if (criterion === 'full_disk') return -1.0;
  return 0.0;
}

/** `null` for the centre criterion, which keeps the single-ray skyline model. */
export function extremumModeForLimb(criterion: LimbCriterion): SkylineExtremumMode | null {
  if (criterion === 'upper_limb') return 'min';
  if (criterion === 'full_disk') return 'max';
  return null;
}

export function clampedFootprintHalfWidthDeg(
  centerElevationDeg: number,
  angularRadiusDeg: number,
): number {
  const halfWidth = azimuthFootprintHalfWidthDeg(centerElevationDeg, angularRadiusDeg);
  return Math.min(MAX_RESOLVED_HALF_WIDTH_DEG, Math.max(0.0, halfWidth));
}

export function evaluateSkylineBranch(branch: SkylineBranch, azimuthDeg: number): number {
  return branch.slope * azimuthDeg + branch.offset;
}

export interface TerrainBin {
  readonly index: number;
  readonly status: HorizonBinStatus;
}

/** 1°-grid bin and data-quality state an azimuth falls in. */
export function terrainBinAt(
  profile: HorizonProfile,
  azimuthDeg: number,
  profileType: HorizonProfileType = 'nominal',
): TerrainBin {
  const span = horizonProfileService.getHorizonBinSpan(profile, azimuthDeg, profileType);
  return { index: span.binIndex, status: profile.binStatus[span.binIndex] ?? 'nodata' };
}

/** Single-ray branch used by the centre criterion. */
export function centreAzimuthBranch(
  profile: HorizonProfile,
  azimuthDeg: number,
  profileType: HorizonProfileType = 'nominal',
): SkylineBranch {
  const span = horizonProfileService.getHorizonBinSpan(profile, azimuthDeg, profileType);
  return { slope: span.slope, offset: span.thetaK - span.slope * span.azBase };
}

/**
 * Every skyline location that can be the extremum of a footprint of half-width
 * `halfWidthDeg` centred at `centerAzimuthDeg`, expressed as an affine function of that
 * centre azimuth. Azimuths are taken unwrapped, so callers may pass values outside [0, 360).
 */
export function skylineCandidateBranches(
  profile: HorizonProfile,
  centerAzimuthDeg: number,
  halfWidthDeg: number,
  profileType: HorizonProfileType = 'nominal',
): SkylineBranch[] {
  const halfWidth = Math.min(MAX_RESOLVED_HALF_WIDTH_DEG, Math.max(0.0, halfWidthDeg));
  const leftAz = centerAzimuthDeg - halfWidth;
  const rightAz = centerAzimuthDeg + halfWidth;

  const left = centreAzimuthBranch(profile, leftAz, profileType);
  const right = centreAzimuthBranch(profile, rightAz, profileType);
  const branches: SkylineBranch[] = [
    { slope: left.slope, offset: left.offset - left.slope * halfWidth },
    { slope: right.slope, offset: right.offset + right.slope * halfWidth },
  ];

  for (let vertex = Math.ceil(leftAz); vertex <= Math.floor(rightAz); vertex++) {
    const elevationDeg = horizonProfileService.evaluateHorizonAtAzimuth(profile, vertex, profileType);
    branches.push({ slope: 0.0, offset: elevationDeg });
  }

  return branches;
}

export function extremumBranchAt(
  branches: readonly SkylineBranch[],
  azimuthDeg: number,
  mode: SkylineExtremumMode,
): SkylineBranch {
  let best = branches[0]!;
  let bestValue = evaluateSkylineBranch(best, azimuthDeg);

  for (let i = 1; i < branches.length; i++) {
    const candidate = branches[i]!;
    const value = evaluateSkylineBranch(candidate, azimuthDeg);
    if (mode === 'min' ? value < bestValue : value > bestValue) {
      best = candidate;
      bestValue = value;
    }
  }

  return best;
}

/**
 * Azimuths strictly inside `(azLowDeg, azHighDeg)` where the extremum can switch branch.
 * Enumerating pairwise intersections is exhaustive: an envelope of affine functions changes
 * branch only where two branches cross.
 */
export function extremumBreakpointsDeg(
  branches: readonly SkylineBranch[],
  azLowDeg: number,
  azHighDeg: number,
): number[] {
  const low = Math.min(azLowDeg, azHighDeg);
  const high = Math.max(azLowDeg, azHighDeg);
  const breakpoints: number[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i]!;
      const b = branches[j]!;
      const slopeDelta = a.slope - b.slope;
      if (Math.abs(slopeDelta) < 1e-12) continue;
      const crossingAz = (b.offset - a.offset) / slopeDelta;
      if (crossingAz > low + 1e-9 && crossingAz < high - 1e-9) breakpoints.push(crossingAz);
    }
  }

  return breakpoints
    .sort((a, b) => a - b)
    .filter((value, index, arr) => index === 0 || value - arr[index - 1]! > 1e-9);
}

export interface HorizonResolutionOptions {
  readonly profile: HorizonProfile;
  readonly criterion: LimbCriterion;
  readonly centerAzimuthDeg: number;
  readonly centerElevationDeg: number;
  readonly angularRadiusDeg: number;
  readonly profileType?: HorizonProfileType;
  /**
   * Footprint half-width to use instead of the one implied by the instantaneous elevation
   * and angular radius. Passing a value frozen at an ephemeris-step midpoint keeps the state
   * evaluation identical to the clearance model the event partition was built on.
   */
  readonly halfWidthDeg?: number;
}

/**
 * Skyline elevation the visibility predicate must be compared against at a single instant.
 * For limb criteria this is the footprint extremum, so the sign of
 * `El + limbSign(criterion) * R − resolveHorizonDeg(...)` is the visibility predicate.
 */
export function resolveHorizonDeg(options: HorizonResolutionOptions): number {
  const { profile, criterion, centerAzimuthDeg, centerElevationDeg, angularRadiusDeg } = options;
  const profileType = options.profileType ?? 'nominal';
  const mode = extremumModeForLimb(criterion);

  if (!mode) {
    return horizonProfileService.evaluateHorizonAtAzimuth(profile, centerAzimuthDeg, profileType);
  }

  const halfWidth = options.halfWidthDeg ?? clampedFootprintHalfWidthDeg(centerElevationDeg, angularRadiusDeg);
  const branches = skylineCandidateBranches(profile, centerAzimuthDeg, halfWidth, profileType);
  return evaluateSkylineBranch(extremumBranchAt(branches, centerAzimuthDeg, mode), centerAzimuthDeg);
}

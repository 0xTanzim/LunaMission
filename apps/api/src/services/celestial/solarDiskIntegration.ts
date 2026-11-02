/**
 * Finite-Disk Solar Solid-Angle Integration
 * Masterplan §6.1: exact apparent-disk solid angle and 2D skyline occlusion.
 *
 * The apparent solar disk subtends ~0.52°, which is the same order as the 1° horizon
 * grid spacing. A single centre-azimuth clearance test therefore cannot resolve an
 * asymmetric ridge clipping half of the disk. This module integrates the visible
 * portion of the disk against the terrain skyline.
 *
 * Coordinate measure: the solid-angle element around the disk centre is
 *   dΩ = sin ρ dρ dφ  ==  cos(El) dAz dEl
 * so integrating in (ρ, φ) uses the exact spherical measure with no domain-sampling
 * bias, and reduces to analytic integrals in ρ. Only the azimuth sweep is discretised.
 */

import type { HorizonProfile } from '@luna/contracts';
import { horizonProfileService } from './horizonProfileService';
import type { HorizonProfileType } from './visibilityTypes';

const DEG = Math.PI / 180;

/** Masterplan §6.1: δAz ≤ 0.05° (≥ 11 rays across the apparent disk). */
export const DEFAULT_AZIMUTH_STEP_DEG = 0.05;

/** Eddington–Milne photometric limb-darkening coefficient. */
export const DEFAULT_LIMB_DARKENING_COEFF = 0.6;

const MIN_AZIMUTH_COLUMNS = 64;

export interface HorizonExtrema {
  readonly minDeg: number;
  readonly maxDeg: number;
  /** True when any covered bin is `nodata` or `incomplete_range_truncated`. */
  readonly dataGap: boolean;
}

export interface SolarDiskIntegrationOptions {
  readonly centerAzimuthDeg: number;
  readonly centerElevationDeg: number;
  readonly angularRadiusDeg: number;
  readonly horizonProfile: HorizonProfile;
  readonly profileType?: HorizonProfileType;
  readonly azimuthStepDeg?: number;
  readonly limbDarkeningCoeff?: number;
}

export interface SolarDiskIntegrationResult {
  /** Geometric visible fraction F_geom = Ω_vis / Ω_disk. */
  readonly geometricFraction: number;
  /** Limb-darkened irradiance fraction F_irrad. */
  readonly irradianceFraction: number;
  /** Exact apparent-disk solid angle of the spherical cap, steradians. */
  readonly diskSolidAngleSr: number;
  /** Integrated visible solid angle, steradians. */
  readonly visibleSolidAngleSr: number;
  readonly azimuthColumns: number;
  readonly azimuthStepDeg: number;
  /** True when the result rests on rasters marked nodata/truncated. */
  readonly dataGap: boolean;
}

function normaliseAzimuth(azimuthDeg: number): number {
  return ((azimuthDeg % 360) + 360) % 360;
}

function horizonArr(
  profile: HorizonProfile,
  profileType: HorizonProfileType,
): readonly number[] {
  if (profileType === 'low') return profile.thetaLowDeg;
  if (profileType === 'high') return profile.thetaHighDeg;
  return profile.elevationNominalDeg;
}

/**
 * Exact extrema of the piecewise-linear skyline over an azimuth interval.
 * The profile is linear between 1° vertices, so extrema occur at the interval
 * ends or at a vertex inside the interval.
 */
export function horizonExtremaOverAzimuth(
  profile: HorizonProfile,
  azStartDeg: number,
  azSpanDeg: number,
  profileType: HorizonProfileType = 'nominal',
): HorizonExtrema {
  const values = horizonArr(profile, profileType);
  const start = normaliseAzimuth(azStartDeg);
  const span = Math.max(0, azSpanDeg);
  const end = start + span;

  let minDeg = Infinity;
  let maxDeg = -Infinity;
  let dataGap = false;

  for (let bin = Math.floor(start); bin <= Math.floor(end); bin++) {
    const idx = ((bin % 360) + 360) % 360;
    const value = values[idx]!;
    if (value < minDeg) minDeg = value;
    if (value > maxDeg) maxDeg = value;
    const status = profile.binStatus[idx];
    if (status === 'nodata' || status === 'incomplete_range_truncated') dataGap = true;
  }

  for (const azimuth of [start, end]) {
    const value = horizonProfileService.evaluateHorizonAtAzimuth(profile, azimuth, profileType);
    if (value < minDeg) minDeg = value;
    if (value > maxDeg) maxDeg = value;
  }

  return { minDeg, maxDeg, dataGap };
}

/** Half-width of the disk's azimuth footprint, degrees. */
export function azimuthFootprintHalfWidthDeg(
  centerElevationDeg: number,
  angularRadiusDeg: number,
): number {
  const cosEl = Math.cos(centerElevationDeg * DEG);
  const sinR = Math.sin(angularRadiusDeg * DEG);
  if (cosEl <= sinR) return 180.0;
  return Math.asin(sinR / cosEl) / DEG;
}

interface SegmentIntegrals {
  readonly solidAngleSr: number;
  readonly irradianceSr: number;
}

/**
 * ∫ sin ρ dρ and ∫ I(cos ρ) sin ρ dρ over [ρ1, ρ2], I(μ) = 1 − u(1 − μ).
 */
function integrateSegment(rho1: number, rho2: number, limbDarkening: number): SegmentIntegrals {
  const deltaSinSq = Math.sin(rho2) ** 2 - Math.sin(rho1) ** 2;
  const deltaCos = Math.cos(rho1) - Math.cos(rho2);
  return {
    solidAngleSr: deltaCos,
    irradianceSr: (1.0 - limbDarkening) * deltaCos + (limbDarkening / 2.0) * deltaSinSq,
  };
}

export function integrateVisibleSolarDisk(
  options: SolarDiskIntegrationOptions,
): SolarDiskIntegrationResult {
  const { centerAzimuthDeg, centerElevationDeg, angularRadiusDeg, horizonProfile } = options;
  const profileType = options.profileType ?? 'nominal';
  const limbDarkening = options.limbDarkeningCoeff ?? DEFAULT_LIMB_DARKENING_COEFF;
  const stepDeg = options.azimuthStepDeg ?? DEFAULT_AZIMUTH_STEP_DEG;

  const radiusDeg = Math.abs(angularRadiusDeg);
  const radiusRad = radiusDeg * DEG;
  const diskSolidAngleSr = 2.0 * Math.PI * (1.0 - Math.cos(radiusRad));

  const horizonAt = (azimuthDeg: number): number =>
    horizonProfileService.evaluateHorizonAtAzimuth(horizonProfile, azimuthDeg, profileType);

  if (radiusRad < 1e-9) {
    const elevationDeg = centerElevationDeg;
    const visible = elevationDeg >= horizonAt(centerAzimuthDeg);
    return {
      geometricFraction: visible ? 1.0 : 0.0,
      irradianceFraction: visible ? 1.0 : 0.0,
      diskSolidAngleSr,
      visibleSolidAngleSr: visible ? diskSolidAngleSr : 0.0,
      azimuthColumns: 1,
      azimuthStepDeg: 0.0,
      dataGap: false,
    };
  }

  const halfFootprintDeg = azimuthFootprintHalfWidthDeg(centerElevationDeg, radiusDeg);
  const extrema = horizonExtremaOverAzimuth(
    horizonProfile,
    centerAzimuthDeg - halfFootprintDeg,
    2.0 * halfFootprintDeg,
    profileType,
  );

  const azimuthColumns = Math.max(MIN_AZIMUTH_COLUMNS, Math.ceil((2.0 * radiusDeg) / stepDeg));

  const base = {
    diskSolidAngleSr,
    azimuthColumns,
    azimuthStepDeg: (2.0 * radiusDeg) / azimuthColumns,
    dataGap: extrema.dataGap,
  } as const;

  // Unobstructed: the whole disk sits above the highest ridge across its footprint.
  if (centerElevationDeg - radiusDeg > extrema.maxDeg) {
    return {
      ...base,
      geometricFraction: 1.0,
      irradianceFraction: 1.0,
      visibleSolidAngleSr: diskSolidAngleSr,
    };
  }

  // Fully obstructed: the lowest ridge across the footprint clears the upper limb.
  if (centerElevationDeg + radiusDeg < extrema.minDeg) {
    return {
      ...base,
      geometricFraction: 0.0,
      irradianceFraction: 0.0,
      visibleSolidAngleSr: 0.0,
    };
  }

  const dPhi = (2.0 * Math.PI) / azimuthColumns;

  const azC = centerAzimuthDeg * DEG;
  const elC = centerElevationDeg * DEG;
  const cx = Math.cos(elC) * Math.cos(azC);
  const cy = Math.cos(elC) * Math.sin(azC);
  const cz = Math.sin(elC);
  const eastX = -Math.sin(azC);
  const eastY = Math.cos(azC);
  const northX = -Math.sin(elC) * Math.cos(azC);
  const northY = -Math.sin(elC) * Math.sin(azC);
  const northZ = Math.cos(elC);

  const directionAt = (rho: number, ux: number, uy: number, uz: number): { az: number; el: number } => {
    const cosRho = Math.cos(rho);
    const sinRho = Math.sin(rho);
    const qx = cx * cosRho + ux * sinRho;
    const qy = cy * cosRho + uy * sinRho;
    const qz = cz * cosRho + uz * sinRho;
    let az = Math.atan2(qy, qx) / DEG;
    while (az - centerAzimuthDeg > 180.0) az -= 360.0;
    while (az - centerAzimuthDeg < -180.0) az += 360.0;
    return { az, el: Math.asin(Math.max(-1.0, Math.min(1.0, qz))) / DEG };
  };

  let visibleSolidAngleSr = 0.0;
  let irradianceVisibleSr = 0.0;
  let irradianceTotalSr = 0.0;

  for (let column = 0; column < azimuthColumns; column++) {
    const phi = (column + 0.5) * dPhi;
    const ux = Math.cos(phi) * eastX + Math.sin(phi) * northX;
    const uy = Math.cos(phi) * eastY + Math.sin(phi) * northY;
    const uz = Math.sin(phi) * northZ;

    const inner = directionAt(0.0, ux, uy, uz);
    const outer = directionAt(radiusRad, ux, uy, uz);

    // Within one column the centre-to-limb track is affine in ρ to better than 1e-6°,
    // and the skyline is affine within a bin, so clearance is piecewise affine.
    const breakpoints: number[] = [0.0, radiusRad];
    const azDelta = outer.az - inner.az;
    if (Math.abs(azDelta) > 1e-12) {
      const lowAz = Math.min(inner.az, outer.az);
      const highAz = Math.max(inner.az, outer.az);
      for (let vertex = Math.ceil(lowAz); vertex <= Math.floor(highAz); vertex++) {
        const fraction = (vertex - inner.az) / azDelta;
        if (fraction > 0.0 && fraction < 1.0) breakpoints.push(fraction * radiusRad);
      }
    }
    breakpoints.sort((a, b) => a - b);

    irradianceTotalSr += integrateSegment(0.0, radiusRad, limbDarkening).irradianceSr * dPhi;

    for (let panel = 0; panel < breakpoints.length - 1; panel++) {
      const rho1 = breakpoints[panel]!;
      const rho2 = breakpoints[panel + 1]!;
      if (rho2 - rho1 < 1e-15) continue;

      const p1 = directionAt(rho1, ux, uy, uz);
      const p2 = directionAt(rho2, ux, uy, uz);
      const g1 = p1.el - horizonAt(p1.az);
      const g2 = p2.el - horizonAt(p2.az);

      let visibleFrom = rho1;
      let visibleTo = rho2;
      if (g1 < 0.0 && g2 < 0.0) continue;
      if (g1 < 0.0 || g2 < 0.0) {
        const crossing = rho1 + ((rho2 - rho1) * -g1) / (g2 - g1);
        if (g1 < 0.0) visibleFrom = crossing;
        else visibleTo = crossing;
      }
      if (visibleTo <= visibleFrom) continue;

      const segment = integrateSegment(visibleFrom, visibleTo, limbDarkening);
      visibleSolidAngleSr += segment.solidAngleSr * dPhi;
      irradianceVisibleSr += segment.irradianceSr * dPhi;
    }
  }

  const geometricFraction = diskSolidAngleSr > 0.0 ? visibleSolidAngleSr / diskSolidAngleSr : 0.0;
  const irradianceFraction =
    irradianceTotalSr > 0.0 ? irradianceVisibleSr / irradianceTotalSr : geometricFraction;

  return {
    geometricFraction: Math.max(0.0, Math.min(1.0, geometricFraction)),
    irradianceFraction: Math.max(0.0, Math.min(1.0, irradianceFraction)),
    diskSolidAngleSr,
    visibleSolidAngleSr,
    azimuthColumns,
    azimuthStepDeg: (2.0 * radiusDeg) / azimuthColumns,
    dataGap: extrema.dataGap,
  };
}

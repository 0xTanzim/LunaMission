/**
 * Curated Horizon Profile Service
 * Milestone M4: Horizon profile loading, mast height interpolation, and affine bin extraction.
 * Governed by AGENTS.md § 4.4 and packages/contracts/src/terrain.ts.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CURATED_HORIZONS } from '../../data/curatedHorizonsData';
import type { HorizonAsset, HorizonBinStatus, HorizonProfile } from '@luna/contracts';
import type { HorizonProfileResponse } from '@server/schemas/horizonSchemas';
import type { HorizonProfileType } from './visibilityTypes';

export interface HorizonBinSpan {
  readonly binIndex: number;
  readonly thetaK: number;
  readonly slope: number;
  readonly azBase: number;
}

export class HorizonProfileService {
  private cache: Record<string, HorizonAsset> | null = null;
  private readonly defaultHeights = [1.0, 2.0, 5.0, 10.0];

  private loadData(): Record<string, HorizonAsset> {
    if (this.cache) return this.cache;
    const typeOfHorizons = typeof CURATED_HORIZONS;
    const isObj = Boolean(CURATED_HORIZONS && typeof CURATED_HORIZONS === 'object');
    const keysCount = isObj ? Object.keys(CURATED_HORIZONS as any).length : -1;
    if (isObj && keysCount > 0) {
      this.cache = CURATED_HORIZONS as Record<string, HorizonAsset>;
      return this.cache;
    }
    const searchPaths = [
      join(process.cwd(), 'data/curated-horizons.json'),
      join(process.cwd(), '../../data/curated-horizons.json'),
      join(__dirname, '../../../data/curated-horizons.json'),
      join(__dirname, '../../../../../../data/curated-horizons.json'),
    ];
    for (const p of searchPaths) {
      if (existsSync(p)) {
        const raw = JSON.parse(readFileSync(p, 'utf-8'));
        this.cache = raw;
        return raw;
      }
    }
    throw new Error(`curated-horizons.json could not be located in workspace paths (type=${typeOfHorizons}, isObj=${isObj}, keys=${keysCount}).`);
  }

  /**
   * Task 4.1: additive blocker-metadata response for POST /api/v1/horizons.
   * Assembles the per-bin radar shape (azimuth sector, mask elevation, ridge
   * distance, status) directly from the offline asset — no on-demand compute.
   */
  getHorizonProfileResponse(siteId: string, mastHeightMeters = 2.0): HorizonProfileResponse {
    const data = this.loadData();
    const asset = data[siteId];
    if (!asset) {
      throw new Error(`Site ${siteId} not found in curated horizons asset.`);
    }
    const profile = this.getHorizonProfileForSite(siteId, mastHeightMeters);
    const step = asset.stepDeg;
    const bins = profile.elevationNominalDeg.map((maskElevationDeg, i) => ({
      azimuthDeg: i * step,
      azimuthSectorDeg: [i * step, (i + 1) * step] as [number, number],
      maskElevationDeg,
      ridgeDistanceKm: profile.blockerDistanceKm[i]!,
      blockerElevationMeters: profile.blockerElevationMeters[i]!,
      binStatus: profile.binStatus[i]!,
    }));

    const truncated = bins.filter((b) => b.binStatus !== 'valid').length;
    const coverageNote = asset.provenance?.['coverageNote'];
    const outOfDem = typeof coverageNote === 'string' && coverageNote.includes('outside');
    const status: HorizonProfileResponse['status'] = outOfDem
      ? 'approximate'
      : truncated > 0
        ? 'valid-with-limitations'
        : 'valid';
    const note = outOfDem
      ? 'Site outside the LOLA 80S DEM: geometric spherical horizon dip applied; no measured terrain blockers.'
      : truncated > 0
        ? `${truncated} of ${bins.length} bins truncated before the closed-form stopping distance.`
        : undefined;

    return {
      siteId,
      mastHeightMeters,
      azimuthBinsCount: asset.azimuthBinsCount,
      stepDeg: step,
      bins,
      provenance: {
        dataset: String(asset.provenance?.['dataset'] ?? 'NASA_LOLA_PGDA'),
        z0ObserverMeters: Number(asset.provenance?.['z0_observer_m'] ?? 0),
        rMaxMeters: Number(asset.provenance?.['r_max_m'] ?? 1_744_600),
        note,
      },
      status,
    };
  }

  getHorizonProfileForSite(siteId: string, mastHeightMeters = 2.0): HorizonProfile {
    const data = this.loadData();
    const asset = data[siteId];
    if (!asset) {
      throw new Error(`Site ${siteId} not found in curated horizons asset.`);
    }

    const clampedHeight = Math.max(1.0, Math.min(10.0, mastHeightMeters));
    const exactKey = clampedHeight.toFixed(1);
    if (asset.profiles[exactKey]) {
      return asset.profiles[exactKey]!;
    }

    // Bracket interpolation across available mast heights
    const heights = this.defaultHeights.slice().sort((a, b) => a - b);
    let lower = heights[0]!;
    let upper = heights[heights.length - 1]!;
    for (let i = 0; i < heights.length - 1; i++) {
      if (clampedHeight >= heights[i]! && clampedHeight <= heights[i + 1]!) {
        lower = heights[i]!;
        upper = heights[i + 1]!;
        break;
      }
    }

    const pLower = asset.profiles[lower.toFixed(1)]!;
    const pUpper = asset.profiles[upper.toFixed(1)]!;
    if (lower === upper) return pLower;

    const w = (clampedHeight - lower) / (upper - lower);
    return this.interpolateProfiles(pLower, pUpper, w);
  }

  private interpolateProfiles(p0: HorizonProfile, p1: HorizonProfile, w: number): HorizonProfile {
    const interp = (a0: readonly number[], a1: readonly number[]) =>
      a0.map((v0, i) => (1.0 - w) * v0 + w * a1[i]!);

    const binStatus = p0.binStatus.map((s0, i): HorizonBinStatus => {
      const s1 = p1.binStatus[i]!;
      if (s0 === 'nodata' || s1 === 'nodata') return 'nodata';
      if (s0 === 'incomplete_range_truncated' || s1 === 'incomplete_range_truncated') {
        return 'incomplete_range_truncated';
      }
      return 'valid';
    });

    return {
      elevationNominalDeg: interp(p0.elevationNominalDeg, p1.elevationNominalDeg),
      thetaLowDeg: interp(p0.thetaLowDeg, p1.thetaLowDeg),
      thetaHighDeg: interp(p0.thetaHighDeg, p1.thetaHighDeg),
      blockerDistanceKm: interp(p0.blockerDistanceKm, p1.blockerDistanceKm),
      blockerElevationMeters: interp(p0.blockerElevationMeters, p1.blockerElevationMeters),
      binStatus,
    };
  }

  getHorizonBinSpan(
    profile: HorizonProfile,
    azimuthDeg: number,
    profileType: HorizonProfileType = 'nominal',
  ): HorizonBinSpan {
    const normAz = ((((azimuthDeg % 360) + 360) % 360) % 360);
    const k = Math.floor(normAz);
    const kNext = (k + 1) % 360;

    const arr =
      profileType === 'low'
        ? profile.thetaLowDeg
        : profileType === 'high'
        ? profile.thetaHighDeg
        : profile.elevationNominalDeg;

    const thetaK = arr[k]!;
    const thetaNext = arr[kNext]!;
    const slope = thetaNext - thetaK; // bin width = 1.0 deg
    const azBase = azimuthDeg - (normAz - k);

    return { binIndex: k, thetaK, slope, azBase };
  }

  evaluateHorizonAtAzimuth(
    profile: HorizonProfile,
    azimuthDeg: number,
    profileType: HorizonProfileType = 'nominal',
  ): number {
    const span = this.getHorizonBinSpan(profile, azimuthDeg, profileType);
    const normAz = ((azimuthDeg % 360) + 360) % 360;
    return span.thetaK + span.slope * (normAz - span.binIndex);
  }
}

export const horizonProfileService = new HorizonProfileService();

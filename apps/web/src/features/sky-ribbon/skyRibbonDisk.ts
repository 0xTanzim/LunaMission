/**
 * Apparent-solar-disk geometry (plan §4 projection contract).
 *
 * Azimuth/elevation coordinates do not preserve angular distance uniformly, so a "circle" of
 * radius R drawn in an az/el panel is not the apparent disk — worst near the zenith. The disk is
 * therefore **never reconstructed here**. This module only consumes what the backend publishes:
 *
 *   1. `boundary` — disk boundary samples in the terrain horizon's own frame (az/el). Rendered
 *      verbatim; the upper/lower limbs are the extreme supplied elevations, found by comparison.
 *   2. `angularRadiusDeg` only — the elevation extent of the disk is exactly centre ± R, so the
 *      upper and lower limbs can be placed on the elevation axis. The azimuth footprint is *not*
 *      drawn, because it needs the boundary geometry (§4).
 *   3. neither — the disk is marked `unsupported`: centre and clearance only.
 *
 * The only arithmetic permitted here is `centre ± radius` on the elevation axis and min/max over
 * supplied samples. No trigonometry, no frame transform, no celestial reconstruction.
 */

import { finiteOrNull } from './skyRibbonFormat';

/** One boundary sample of the apparent disk, in the terrain horizon frame. */
export interface ApparentDiskBoundarySample {
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
}

/**
 * The plane-projection contract a backend must publish alongside boundary samples (§4).
 * Required so a reader can reproduce the geometry rather than trust the polygon.
 */
export interface ApparentDiskContract {
  readonly frame: string;
  readonly epochUtc: string;
  readonly angularRadiusDeg: number;
  readonly sampleCount: number;
  readonly samplingMethod: string;
  readonly maxAngularErrorDeg: number;
}

export interface ApparentDiskGeometry {
  readonly contract: ApparentDiskContract;
  readonly boundary: readonly ApparentDiskBoundarySample[];
}

export type SolarDiskModel =
  | {
      readonly kind: 'boundary';
      readonly geometry: ApparentDiskGeometry;
      readonly upperLimbDeg: number;
      readonly lowerLimbDeg: number;
      readonly azimuthWidthDeg: number;
    }
  | {
      readonly kind: 'limb-only';
      readonly angularRadiusDeg: number;
      readonly upperLimbDeg: number;
      readonly lowerLimbDeg: number;
    }
  | { readonly kind: 'unsupported'; readonly reason: string };

export const DISK_UNSUPPORTED_REASON =
  'the evaluation response publishes no apparent-disk boundary samples and no apparent angular radius';

function usableSamples(
  boundary: readonly ApparentDiskBoundarySample[],
): ApparentDiskBoundarySample[] {
  return boundary.filter(
    (sample) =>
      Number.isFinite(sample.azimuthDeg) && Number.isFinite(sample.elevationDeg),
  );
}

/**
 * Resolves how much of the apparent disk may be drawn. `centreElevationDeg` is a backend value;
 * it is used only for the plane-tangent limb offsets of the radius-only case.
 */
export function resolveSolarDiskModel(input: {
  readonly centreElevationDeg: number | null;
  readonly geometry?: ApparentDiskGeometry | null;
  readonly angularRadiusDeg?: number | null;
}): SolarDiskModel {
  const geometry = input.geometry ?? null;
  const boundary = geometry ? usableSamples(geometry.boundary) : [];
  if (geometry && boundary.length >= 3) {
    const elevations = boundary.map((sample) => sample.elevationDeg);
    const azimuths = boundary.map((sample) => sample.azimuthDeg);
    return {
      kind: 'boundary',
      geometry,
      upperLimbDeg: Math.max(...elevations),
      lowerLimbDeg: Math.min(...elevations),
      azimuthWidthDeg: Math.max(...azimuths) - Math.min(...azimuths),
    };
  }

  const centre = finiteOrNull(input.centreElevationDeg);
  const radius = finiteOrNull(input.angularRadiusDeg);
  if (centre !== null && radius !== null && radius > 0) {
    return {
      kind: 'limb-only',
      angularRadiusDeg: radius,
      upperLimbDeg: centre + radius,
      lowerLimbDeg: centre - radius,
    };
  }

  return { kind: 'unsupported', reason: DISK_UNSUPPORTED_REASON };
}

/** One-line provenance for the panel header. */
export function describeDiskProvenance(model: SolarDiskModel): string {
  if (model.kind === 'boundary') {
    const { contract } = model.geometry;
    return `boundary geometry · ${contract.sampleCount} samples · ${contract.frame} · ${contract.samplingMethod} · max error ${contract.maxAngularErrorDeg}°`;
  }
  if (model.kind === 'limb-only') {
    return 'limbs only · azimuth footprint not drawn (§4)';
  }
  return 'disk outline unavailable';
}

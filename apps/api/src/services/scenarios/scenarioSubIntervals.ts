/**
 * Scenario Sub-Interval Partitioning & Solar Disk Fraction
 * Milestone M5: Spatiotemporal Subsegment Partitioning
 * Governed by docs/phase-3/API_CONTRACT.md § 3.
 */

import type {
  BlockerMetadata,
  EarthIntervalStatus,
  EvaluatedSubInterval,
  HorizonProfile,
  OverlapIntervalStatus,
  SolarIntervalStatus,
  TopocentricTrajectory,
} from '@luna/contracts';
import { horizonProfileService } from '../celestial/horizonProfileService';
import { integrateVisibleSolarDisk } from '../celestial/solarDiskIntegration';
import type { VisibilityReport } from '../celestial/visibilityTypes';

export function interpolateTrajectoryAtEpoch(
  traj: TopocentricTrajectory,
  epochMs: number,
): { azimuthDeg: number; elevationDeg: number; angularRadiusDeg: number } {
  const pts = traj.points;
  if (pts.length === 0) return { azimuthDeg: 0, elevationDeg: 0, angularRadiusDeg: 0 };
  if (pts.length === 1 || epochMs <= pts[0]!.epochMs) {
    const p = pts[0]!;
    return { azimuthDeg: p.azimuthDeg, elevationDeg: p.elevationDeg, angularRadiusDeg: p.angularRadiusDeg };
  }
  if (epochMs >= pts[pts.length - 1]!.epochMs) {
    const p = pts[pts.length - 1]!;
    return { azimuthDeg: p.azimuthDeg, elevationDeg: p.elevationDeg, angularRadiusDeg: p.angularRadiusDeg };
  }

  let idx = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i]!.epochMs <= epochMs && pts[i + 1]!.epochMs >= epochMs) {
      idx = i;
      break;
    }
  }

  const p0 = pts[idx]!;
  const p1 = pts[idx + 1]!;
  const dt = p1.epochMs - p0.epochMs;
  const u = dt > 0 ? (epochMs - p0.epochMs) / dt : 0;

  let dAz = p1.azimuthDeg - p0.azimuthDeg;
  if (dAz > 180) dAz -= 360;
  if (dAz < -180) dAz += 360;
  const az = (((p0.azimuthDeg + u * dAz) % 360) + 360) % 360;
  const el = p0.elevationDeg + u * (p1.elevationDeg - p0.elevationDeg);
  const radius = p0.angularRadiusDeg + u * (p1.angularRadiusDeg - p0.angularRadiusDeg);

  return { azimuthDeg: az, elevationDeg: el, angularRadiusDeg: radius };
}

export interface BuildSubIntervalsOptions {
  sunTrajectory: TopocentricTrajectory;
  earthTrajectory: TopocentricTrajectory;
  horizonProfile: HorizonProfile;
  dipAngleDeg: number;
  report: VisibilityReport;
}

export interface SubIntervalBuildResult {
  readonly intervals: EvaluatedSubInterval[];
  /** True when an evaluated solar-disk footprint crossed a nodata/truncated bin. */
  readonly horizonDataGap: boolean;
}

export function buildSubIntervals(options: BuildSubIntervalsOptions): SubIntervalBuildResult {
  const { sunTrajectory, earthTrajectory, horizonProfile, dipAngleDeg, report } = options;
  const sunPts = sunTrajectory.points;
  const earthPts = earthTrajectory.points;
  if (sunPts.length === 0 || earthPts.length === 0) {
    return { intervals: [], horizonDataGap: false };
  }

  const tStartMs = Math.max(sunPts[0]!.epochMs, earthPts[0]!.epochMs);
  const tEndMs = Math.min(sunPts[sunPts.length - 1]!.epochMs, earthPts[earthPts.length - 1]!.epochMs);
  if (tEndMs <= tStartMs) {
    return { intervals: [], horizonDataGap: false };
  }

  const rawEpochs = [
    tStartMs,
    tEndMs,
    ...report.events.map((e) => e.epochMs),
    // Disk-fraction 0↔>0 (`upper_limb`) and <1↔1 (`full_disk`) transitions are exactly the
    // event epochs, so both sets must bound the sub-intervals that carry a disk fraction.
    ...report.fullDiskSunEvents.map((e) => e.epochMs),
    ...sunPts.map((p) => p.epochMs).filter((t) => t >= tStartMs && t <= tEndMs),
  ].sort((a, b) => a - b);

  const partition: number[] = [];
  for (const ep of rawEpochs) {
    if (partition.length === 0 || ep - partition[partition.length - 1]! >= 500) {
      partition.push(ep);
    }
  }

  const rawSegments: EvaluatedSubInterval[] = [];
  let horizonDataGap = false;

  for (let i = 0; i < partition.length - 1; i++) {
    const sMs = partition[i]!;
    const eMs = partition[i + 1]!;
    const midMs = (sMs + eMs) / 2.0;
    const durHours = (eMs - sMs) / 3600000.0;

    const sunState = interpolateTrajectoryAtEpoch(sunTrajectory, midMs);
    const earthState = interpolateTrajectoryAtEpoch(earthTrajectory, midMs);

    const sunMask = horizonProfileService.evaluateHorizonAtAzimuth(horizonProfile, sunState.azimuthDeg, 'nominal');
    const earthMask = horizonProfileService.evaluateHorizonAtAzimuth(horizonProfile, earthState.azimuthDeg, 'nominal');

    const sunClearance = sunState.elevationDeg - sunMask;
    const earthClearance = earthState.elevationDeg - earthMask;
    const disk = integrateVisibleSolarDisk({
      centerAzimuthDeg: sunState.azimuthDeg,
      centerElevationDeg: sunState.elevationDeg,
      angularRadiusDeg: sunState.angularRadiusDeg,
      horizonProfile,
    });
    const diskFrac = disk.geometricFraction;
    if (disk.dataGap) horizonDataGap = true;

    let sunStatus: SolarIntervalStatus;
    if (sunState.elevationDeg <= dipAngleDeg) {
      sunStatus = 'sub_horizon';
    } else if (diskFrac >= 0.9999 && sunState.elevationDeg > 0.0) {
      sunStatus = 'full_sun';
    } else if (diskFrac > 0.0) {
      sunStatus = 'partial_limb';
    } else {
      sunStatus = 'terrain_shadow';
    }

    let earthStatus: EarthIntervalStatus;
    if (earthState.elevationDeg <= dipAngleDeg) {
      earthStatus = 'sub_horizon';
    } else if (earthClearance >= 0.0) {
      earthStatus = 'visible';
    } else {
      earthStatus = 'terrain_blocked';
    }

    let overlapStatus: OverlapIntervalStatus;
    const isSunActive = sunStatus === 'full_sun' || sunStatus === 'partial_limb';
    const isEarthActive = earthStatus === 'visible';

    if (isSunActive && isEarthActive) {
      overlapStatus = 'sun_and_earth';
    } else if (isSunActive) {
      overlapStatus = 'sun_only';
    } else if (isEarthActive) {
      overlapStatus = 'earth_only';
    } else {
      overlapStatus = 'dark_and_blocked';
    }

    const span = horizonProfileService.getHorizonBinSpan(horizonProfile, sunState.azimuthDeg, 'nominal');
    const blocker: BlockerMetadata | null =
      sunClearance < 0.0
        ? {
            azimuthDeg: Number(sunState.azimuthDeg.toFixed(2)),
            distanceKm: Number((horizonProfile.blockerDistanceKm[span.binIndex] ?? 10.0).toFixed(2)),
            elevationMeters: Number((horizonProfile.blockerElevationMeters[span.binIndex] ?? 0.0).toFixed(1)),
          }
        : null;

    rawSegments.push({
      startEpochMs: sMs,
      endEpochMs: eMs,
      startDateUtc: new Date(sMs).toISOString(),
      endDateUtc: new Date(eMs).toISOString(),
      durationHours: Number(durHours.toFixed(4)),
      sun: {
        status: sunStatus,
        fractionalSolarDiskVisibility: Number(diskFrac.toFixed(4)),
        irradianceWeightedDiskFraction: Number(disk.irradianceFraction.toFixed(4)),
        meanElevationDeg: Number(sunState.elevationDeg.toFixed(3)),
        meanAzimuthDeg: Number(sunState.azimuthDeg.toFixed(2)),
        meanHorizonMaskDeg: Number(sunMask.toFixed(3)),
        clearanceDeg: Number(sunClearance.toFixed(3)),
        blocker,
      },
      earth: {
        status: earthStatus,
        meanElevationDeg: Number(earthState.elevationDeg.toFixed(3)),
        meanAzimuthDeg: Number(earthState.azimuthDeg.toFixed(2)),
        meanHorizonMaskDeg: Number(earthMask.toFixed(3)),
        clearanceDeg: Number(earthClearance.toFixed(3)),
      },
      overlap: {
        status: overlapStatus,
        isMissionCriticalWindow: sunStatus === 'full_sun' && earthStatus === 'visible',
      },
    });
  }

  const merged: EvaluatedSubInterval[] = [];
  for (const seg of rawSegments) {
    if (merged.length === 0) {
      merged.push({ ...seg });
      continue;
    }
    const last = merged[merged.length - 1]!;
    if (
      last.sun.status === seg.sun.status &&
      last.earth.status === seg.earth.status &&
      last.overlap.status === seg.overlap.status &&
      last.endEpochMs === seg.startEpochMs
    ) {
      last.endEpochMs = seg.endEpochMs;
      last.endDateUtc = seg.endDateUtc;
      last.durationHours = Number(((last.endEpochMs - last.startEpochMs) / 3600000.0).toFixed(4));
    } else {
      merged.push({ ...seg });
    }
  }

  return { intervals: merged, horizonDataGap };
}

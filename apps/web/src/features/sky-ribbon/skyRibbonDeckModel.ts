/**
 * Presentation model for the Dual-Panel Sky-Ribbon.
 *
 * Pure: every figure is a backend value, a selection over backend values, or a bounded
 * derivation documented at its site. No ephemeris evaluation, no frame transform, no horizon
 * interpolation and no window integration happen here — those live in `apps/api` (AGENTS.md § 1).
 */

import type { EvaluatedSubInterval } from '@luna/contracts';
import {
  buildEarthReadout,
  buildMissionEventReadout,
  buildRateReadouts,
  buildSolarReadout,
  type EarthReadout,
  type MissionEventReadout,
  type RateReadouts,
  type SkyCelestialGeometry,
  type SolarReadout,
} from './skyRibbonAnalysis';
import {
  buildSkylineTopology,
  horizonBinsFromIntervals,
  toSkylineSamples,
  type SkylineSample,
  type SkylineSource,
  type SkylineTopology,
} from './skyRibbonSkyline';
import {
  buildGrazingWindows,
  resolveActiveIntervalIndex,
  type GrazingWindow,
} from './skyRibbonTableModel';
import { buildTrajectory, type TrajectorySeries } from './skyRibbonTrajectory';
import { resolveSolarDiskModel, type ApparentDiskGeometry, type SolarDiskModel } from './skyRibbonDisk';
import { buildSkyOverlays, type LiveCelestialState } from './skyRibbonOverlays';
import type { CelestialBodySpec, ClearanceGaugeSpec } from './skyRibbonCelestialRenderer';
import type { HorizonProfileBin } from './skyRibbonRenderer';
import { formatUtcMinute } from './skyRibbonFormat';

export interface SkyDeckModelInput {
  readonly intervals: EvaluatedSubInterval[];
  readonly horizonProfile?: readonly HorizonProfileBin[];
  readonly playheadUtc?: string;
  readonly geometry?: SkyCelestialGeometry;
  /** Backend apparent-disk boundary geometry for the current instant (plan §4). */
  readonly diskGeometry?: ApparentDiskGeometry | null;
  readonly solarCriterion: 'upperLimb' | 'fullDisk';
  /** Latest backend-computed state from the shared playhead buffer. */
  readonly live?: LiveCelestialState | null;
}

/** Human label for the clearance criterion; `full-disk` is a bound, not exact geometry. */
export const SOLAR_CRITERION_LABEL = {
  upperLimb: 'upper-limb',
  fullDisk: 'full-disk bound',
} as const;

export interface SkyDeckModel {
  readonly skyline: SkylineSample[];
  readonly skylineTopology: SkylineTopology;
  readonly skylineSource: SkylineSource;
  readonly activeIndex: number;
  readonly activeInterval: EvaluatedSubInterval | null;
  readonly solar: SolarReadout;
  readonly earth: EarthReadout;
  readonly missionEvent: MissionEventReadout;
  readonly rates: RateReadouts;
  readonly disk: SolarDiskModel;
  readonly trajectories: TrajectorySeries[];
  readonly grazingWindows: GrazingWindow[];
  readonly sun: CelestialBodySpec | null;
  readonly earthBody: CelestialBodySpec | null;
  readonly gauge: ClearanceGaugeSpec | null;
  readonly contact: { azimuthDeg: number; horizonDeg: number } | null;
  readonly grazingMarkers: { azimuthDeg: number; elevationDeg: number; isActive: boolean }[];
  readonly playheadMarker: { azimuthDeg: number; elevationDeg: number; label: string } | null;
  readonly windowLabel: string | null;
  readonly solarCriterionLabel: string;
  readonly limbScaleFromApi: boolean;
}

export function buildSkyDeckModel(input: SkyDeckModelInput): SkyDeckModel {
  const { intervals, horizonProfile, playheadUtc, geometry, diskGeometry, live } = input;
  const solarCriterionLabel = SOLAR_CRITERION_LABEL[input.solarCriterion];

  const hasHorizonBins = (horizonProfile?.length ?? 0) > 0;
  const skylineSource: SkylineSource = hasHorizonBins ? 'horizon-bin' : 'interval-mean';
  const skyline = toSkylineSamples(
    hasHorizonBins ? horizonProfile : horizonBinsFromIntervals(intervals),
    skylineSource,
  );

  const activeIndex = resolveActiveIntervalIndex(intervals, playheadUtc);
  const activeInterval = intervals[activeIndex] ?? null;
  const solar = buildSolarReadout(activeInterval);
  const earth = buildEarthReadout(activeInterval);
  const missionEvent = buildMissionEventReadout(activeInterval);
  const rates = buildRateReadouts(intervals, activeIndex, geometry);
  const trajectories = [buildTrajectory(intervals, 'sun'), buildTrajectory(intervals, 'earth')];
  const grazingWindows = buildGrazingWindows(intervals, activeIndex);
  const overlays = buildSkyOverlays(solar, earth, { geometry, live, criterionLabel: solarCriterionLabel });

  const disk = resolveSolarDiskModel({
    centreElevationDeg: solar.elevationDeg,
    geometry: diskGeometry,
    angularRadiusDeg: geometry?.sunAngularRadiusDeg,
  });

  const contact =
    solar.azimuthDeg === null || solar.horizonMaskDeg === null
      ? null
      : { azimuthDeg: solar.azimuthDeg, horizonDeg: solar.horizonMaskDeg };

  const grazingMarkers = grazingWindows
    .filter((marker) => marker.azimuthDeg !== null && marker.elevationDeg !== null)
    .map((marker) => ({
      azimuthDeg: marker.azimuthDeg as number,
      elevationDeg: marker.elevationDeg as number,
      isActive: marker.isActive,
    }));

  const windowLabel =
    activeInterval === null
      ? null
      : `${formatUtcMinute(activeInterval.startDateUtc)} → ${formatUtcMinute(activeInterval.endDateUtc)}`;

  const sunAzimuthDeg = overlays.sun?.azimuthDeg;
  const sunElevationDeg = overlays.sun?.elevationDeg;
  const playheadMarker =
    typeof sunAzimuthDeg !== 'number' || typeof sunElevationDeg !== 'number'
      ? null
      : {
          azimuthDeg: sunAzimuthDeg,
          elevationDeg: sunElevationDeg,
          label: playheadUtc ? formatUtcMinute(playheadUtc) : (windowLabel ?? ''),
        };

  return {
    skyline,
    skylineTopology: buildSkylineTopology(skyline),
    skylineSource,
    activeIndex,
    activeInterval,
    solar,
    earth,
    missionEvent,
    rates,
    disk,
    trajectories,
    grazingWindows,
    windowLabel,
    solarCriterionLabel,
    limbScaleFromApi:
      overlays.sun?.angularRadiusDeg !== null && overlays.sun?.angularRadiusDeg !== undefined,
    sun: overlays.sun,
    earthBody: overlays.earth,
    gauge: overlays.gauge,
    contact,
    grazingMarkers,
    playheadMarker,
  };
}

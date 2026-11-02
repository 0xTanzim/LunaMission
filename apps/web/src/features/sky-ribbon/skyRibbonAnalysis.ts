/**
 * Dual-Panel Sky-Ribbon 2.0 — readout derivations.
 *
 * EVERYTHING here is selection, formatting, or a finite difference of values the
 * backend already returned on `EvaluatedSubInterval`. There is no ephemeris
 * evaluation, no reference-frame transform, no horizon interpolation and no
 * visibility-window integration: those live exclusively in `apps/api`
 * (AGENTS.md § 1.1).
 *
 * Observable discipline (science skill, scientific invariants):
 *  - `fractionalSolarDiskVisibility` is the backend's geometric disk fraction.
 *    It is NOT irradiance-weighted and NOT generated electrical power.
 *  - `earth.status` is geometric line-of-sight, NOT an RF link closure.
 *  - `clearanceDeg` is criterion-dependent (upper-limb vs full-disk) and the UI
 *    must always label which criterion produced it.
 */

import type { EvaluatedSubInterval } from '@luna/contracts';
import { finiteOrNull } from './skyRibbonFormat';

/** Display thresholds only — rounding of the backend's own fraction, not physics. */
export const DISK_FULL_THRESHOLD = 0.999;
export const DISK_NONE_THRESHOLD = 0.001;

/** Optional analytic geometry the API owns but does not yet publish per interval. */
export interface SkyCelestialGeometry {
  readonly sunAngularRadiusDeg?: number;
  readonly earthAngularRadiusDeg?: number;
  readonly sunAzimuthRateDegPerHour?: number;
  readonly sunElevationRateDegPerHour?: number;
  readonly earthAzimuthRateDegPerHour?: number;
  readonly earthElevationRateDegPerHour?: number;
}

export type DiskVisibilityClass = 'full' | 'partial' | 'none' | 'unknown';
export type SolarState = DiskVisibilityClass;
export type EarthState = 'visible' | 'terrain-blocked' | 'below-horizon' | 'unknown';

export interface SolarReadout {
  readonly state: SolarState;
  readonly badge: string;
  readonly glyph: string;
  readonly statusLabel: string;
  readonly clearanceDeg: number | null;
  readonly diskFraction: number | null;
  readonly diskPercent: number | null;
  /** Limb-darkened visible irradiance fraction — a different observable from the area fraction. */
  readonly irradianceFraction: number | null;
  readonly irradiancePercent: number | null;
  readonly elevationDeg: number | null;
  readonly azimuthDeg: number | null;
  readonly horizonMaskDeg: number | null;
  readonly blockerLabel: string | null;
  readonly blockerAzimuthDeg: number | null;
}

export type MissionEventState = 'critical-overlap' | 'overlap' | 'sun-only' | 'earth-only' | 'none' | 'unknown';

export interface MissionEventReadout {
  readonly state: MissionEventState;
  readonly badge: string;
  readonly glyph: string;
  readonly statusLabel: string;
}

export interface EarthReadout {
  readonly state: EarthState;
  readonly badge: string;
  readonly glyph: string;
  readonly statusLabel: string;
  readonly clearanceDeg: number | null;
  readonly elevationDeg: number | null;
  readonly azimuthDeg: number | null;
  readonly horizonMaskDeg: number | null;
}

export type RateProvenance = 'api' | 'interval-mean' | 'unavailable';

export interface RateReadout {
  readonly valueDegPerHour: number | null;
  readonly provenance: RateProvenance;
}

export const PROVENANCE_LABELS: Record<RateProvenance, string> = {
  api: 'API',
  'interval-mean': 'Δ/Δt',
  unavailable: 'N/A',
};

export function classifyDisk(fraction: number | null, status: string): DiskVisibilityClass {
  if (fraction !== null) {
    if (fraction >= DISK_FULL_THRESHOLD) return 'full';
    if (fraction <= DISK_NONE_THRESHOLD) return 'none';
    return 'partial';
  }
  if (status === 'full_sun') return 'full';
  if (status === 'partial_limb') return 'partial';
  if (status === 'terrain_shadow' || status === 'sub_horizon') return 'none';
  return 'unknown';
}

const SOLAR_BADGES: Record<SolarState, { badge: string; glyph: string; label: string }> = {
  full: { badge: 'FULL DISK', glyph: '◉', label: 'full disk visible' },
  partial: { badge: 'PARTIAL LIMB', glyph: '◐', label: 'partially occluded disk' },
  none: { badge: 'OCCLUDED', glyph: '✕', label: 'no disk visible' },
  unknown: { badge: 'NO DATA', glyph: '?', label: 'no solar telemetry' },
};

const EARTH_BADGES: Record<EarthState, { badge: string; glyph: string; label: string }> = {
  visible: { badge: 'LoS CLEAR', glyph: '◉', label: 'geometric line-of-sight clear' },
  'terrain-blocked': {
    badge: 'TERRAIN BLOCKED',
    glyph: '✕',
    label: 'terrain blocks geometric line-of-sight',
  },
  'below-horizon': { badge: 'BELOW HORIZON', glyph: '▽', label: 'below the smooth horizon' },
  unknown: { badge: 'NO DATA', glyph: '?', label: 'no Earth telemetry' },
};

export function earthStateFromStatus(status: string): EarthState {
  if (status === 'visible' || status === 'earth_direct') return 'visible';
  if (status === 'terrain_blocked' || status === 'earth_occluded') return 'terrain-blocked';
  if (status === 'sub_horizon' || status === 'earth_sub_horizon') return 'below-horizon';
  return 'unknown';
}

export function earthBadgeFor(state: EarthState): string {
  return EARTH_BADGES[state].badge;
}

export function buildSolarReadout(interval: EvaluatedSubInterval | null): SolarReadout {
  if (!interval) {
    const meta = SOLAR_BADGES.unknown;
    return {
      state: 'unknown',
      badge: meta.badge,
      glyph: meta.glyph,
      statusLabel: meta.label,
      clearanceDeg: null,
      diskFraction: null,
      diskPercent: null,
      irradianceFraction: null,
      irradiancePercent: null,
      elevationDeg: null,
      azimuthDeg: null,
      horizonMaskDeg: null,
      blockerLabel: null,
      blockerAzimuthDeg: null,
    };
  }

  const diskFraction = finiteOrNull(interval.sun.fractionalSolarDiskVisibility);
  const irradianceFraction = finiteOrNull(interval.sun.irradianceWeightedDiskFraction);
  const state = classifyDisk(diskFraction, interval.sun.status);
  const meta = SOLAR_BADGES[state];
  const percent = (fraction: number | null) =>
    fraction === null ? null : Math.min(100, Math.max(0, fraction * 100));

  return {
    state,
    badge: meta.badge,
    glyph: meta.glyph,
    statusLabel: meta.label,
    clearanceDeg: finiteOrNull(interval.sun.clearanceDeg),
    diskFraction,
    diskPercent: percent(diskFraction),
    irradianceFraction,
    irradiancePercent: percent(irradianceFraction),
    elevationDeg: finiteOrNull(interval.sun.meanElevationDeg),
    azimuthDeg: finiteOrNull(interval.sun.meanAzimuthDeg),
    horizonMaskDeg: finiteOrNull(interval.sun.meanHorizonMaskDeg),
    blockerLabel:
      interval.sun.blocker?.featureName ??
      (interval.sun.status === 'terrain_shadow' ? 'Unnamed terrain' : null),
    blockerAzimuthDeg: finiteOrNull(interval.sun.blocker?.azimuthDeg),
  };
}

const MISSION_EVENT_BADGES: Record<MissionEventState, { badge: string; glyph: string; label: string }> = {
  'critical-overlap': {
    badge: 'CRITICAL WINDOW',
    glyph: '◆',
    label: 'concurrent geometric Sun and Earth access, flagged mission-critical by the backend',
  },
  overlap: { badge: 'SUN∩EARTH', glyph: '◈', label: 'concurrent geometric Sun and Earth access' },
  'sun-only': { badge: 'SUN ONLY', glyph: '☀', label: 'only solar access in this sub-interval' },
  'earth-only': { badge: 'EARTH ONLY', glyph: '◐', label: 'only Earth line-of-sight in this sub-interval' },
  none: { badge: 'NO ACCESS', glyph: '◇', label: 'neither solar nor Earth access' },
  unknown: { badge: 'NO DATA', glyph: '?', label: 'no evaluated sub-interval at this playhead' },
};

/**
 * Operational status of the active sub-interval. This is the backend's own overlap classification
 * plus its `isMissionCriticalWindow` flag — never an inference from the solar or Earth badge.
 */
export function buildMissionEventReadout(interval: EvaluatedSubInterval | null): MissionEventReadout {
  if (!interval) {
    const meta = MISSION_EVENT_BADGES.unknown;
    return { state: 'unknown', badge: meta.badge, glyph: meta.glyph, statusLabel: meta.label };
  }
  const status = interval.overlap.status;
  const concurrent = status === 'sun_and_earth' || status === 'overlap_active';
  const state: MissionEventState = concurrent
    ? interval.overlap.isMissionCriticalWindow
      ? 'critical-overlap'
      : 'overlap'
    : status === 'sun_only'
      ? 'sun-only'
      : status === 'earth_only'
        ? 'earth-only'
        : 'none';
  const meta = MISSION_EVENT_BADGES[state];
  return { state, badge: meta.badge, glyph: meta.glyph, statusLabel: meta.label };
}

export function buildEarthReadout(interval: EvaluatedSubInterval | null): EarthReadout {
  if (!interval) {
    const meta = EARTH_BADGES.unknown;
    return {
      state: 'unknown',
      badge: meta.badge,
      glyph: meta.glyph,
      statusLabel: meta.label,
      clearanceDeg: null,
      elevationDeg: null,
      azimuthDeg: null,
      horizonMaskDeg: null,
    };
  }
  const state = earthStateFromStatus(interval.earth.status);
  const meta = EARTH_BADGES[state];
  return {
    state,
    badge: meta.badge,
    glyph: meta.glyph,
    statusLabel: meta.label,
    clearanceDeg: finiteOrNull(interval.earth.clearanceDeg),
    elevationDeg: finiteOrNull(interval.earth.meanElevationDeg),
    azimuthDeg: finiteOrNull(interval.earth.meanAzimuthDeg),
    horizonMaskDeg: finiteOrNull(interval.earth.meanHorizonMaskDeg),
  };
}

function meanIntervalRate(
  intervals: readonly EvaluatedSubInterval[],
  index: number,
  pick: (interval: EvaluatedSubInterval) => number,
  treatAsBearing: boolean,
): number | null {
  const current = intervals[index];
  const next = intervals[index + 1];
  if (!current || !next) return null;
  const deltaMs = next.startEpochMs - current.startEpochMs;
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return null;
  const deltaValue = pick(next) - pick(current);
  if (!Number.isFinite(deltaValue)) return null;
  // A bearing step beyond 180° means the sub-interval boundary crossed the 0°/360°
  // seam: refuse rather than fabricate a wrapped rate.
  if (treatAsBearing && Math.abs(deltaValue) > 180) return null;
  return deltaValue / (deltaMs / 3_600_000);
}

export interface RateReadouts {
  readonly sunAzimuth: RateReadout;
  readonly sunElevation: RateReadout;
  readonly earthAzimuth: RateReadout;
  readonly earthElevation: RateReadout;
}

/**
 * Topocentric rates. Rendered verbatim when the API supplies them; otherwise an
 * explicitly-labelled mean rate between adjacent sub-interval samples; otherwise
 * explicitly unavailable. Never silently replaced by zero.
 */
export function buildRateReadouts(
  intervals: readonly EvaluatedSubInterval[],
  index: number,
  geometry?: SkyCelestialGeometry,
): RateReadouts {
  const resolve = (apiValue: number | undefined, derived: number | null): RateReadout => {
    const api = finiteOrNull(apiValue);
    if (api !== null) return { valueDegPerHour: api, provenance: 'api' };
    return derived === null
      ? { valueDegPerHour: null, provenance: 'unavailable' }
      : { valueDegPerHour: derived, provenance: 'interval-mean' };
  };

  return {
    sunAzimuth: resolve(
      geometry?.sunAzimuthRateDegPerHour,
      meanIntervalRate(intervals, index, (i) => i.sun.meanAzimuthDeg, true),
    ),
    sunElevation: resolve(
      geometry?.sunElevationRateDegPerHour,
      meanIntervalRate(intervals, index, (i) => i.sun.meanElevationDeg, false),
    ),
    earthAzimuth: resolve(
      geometry?.earthAzimuthRateDegPerHour,
      meanIntervalRate(intervals, index, (i) => i.earth.meanAzimuthDeg, true),
    ),
    earthElevation: resolve(
      geometry?.earthElevationRateDegPerHour,
      meanIntervalRate(intervals, index, (i) => i.earth.meanElevationDeg, false),
    ),
  };
}

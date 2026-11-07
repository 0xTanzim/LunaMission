import React from 'react';
import type { EarthReadout, MissionEventReadout, RateReadout, SolarReadout } from './skyRibbonAnalysis';
import { PROVENANCE_LABELS } from './skyRibbonAnalysis';
import type { SolarDiskModel } from './skyRibbonDisk';
import { formatDegPerHour, formatPercent, formatSignedDeg } from './skyRibbonFormat';

/**
 * The three read-out groups, one per kind of claim.
 *
 * Kept apart from `SkyAnalyticalReadout` because that component's responsibility is the *separation*
 * between measurement, interpretation, confidence and operational status — a file that also carried
 * every row's markup could not show that separation clearly.
 */

export const GROUP_LABEL =
  'font-mono text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-primary)]';
export const GROUP_KIND =
  'font-mono text-[length:var(--lm-text-micro)] uppercase tracking-wide text-[var(--lm-color-text-muted)]';
export const ROW = 'flex items-baseline justify-between gap-3 font-mono text-[length:var(--lm-text-micro)]';
export const ROW_LABEL = 'text-[var(--lm-color-text-muted)]';
export const ROW_VALUE = 'tabular-nums text-[var(--lm-color-text-secondary)]';
export const GROUP_BASE = 'flex min-w-0 flex-col gap-1.5 rounded-[var(--lm-radius-sm)] border p-2.5';

export const SOLAR_TONE = {
  full: 'border-[var(--lm-color-success-border)] bg-[var(--lm-color-success-surface)]',
  partial: 'border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)]',
  none: 'border-[var(--lm-color-danger-border)] bg-[var(--lm-color-danger-surface)]',
  unknown: 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)]',
} as const;

export const EARTH_TONE = {
  visible: 'border-[var(--lm-color-info-border)] bg-[var(--lm-color-info-surface)]',
  'terrain-blocked': 'border-[var(--lm-color-danger-border)] bg-[var(--lm-color-danger-surface)]',
  'below-horizon': 'border-[var(--lm-color-border-strong)] bg-[var(--lm-color-surface-raised)]',
  unknown: 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)]',
} as const;

export const EVENT_TONE = {
  'critical-overlap': 'border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)]',
  overlap: 'border-[var(--lm-color-success-border)] bg-[var(--lm-color-success-surface)]',
  'sun-only': 'border-[var(--lm-color-border-strong)] bg-[var(--lm-color-surface-raised)]',
  'earth-only': 'border-[var(--lm-color-border-strong)] bg-[var(--lm-color-surface-raised)]',
  none: 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)]',
  unknown: 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)]',
} as const;

export function GroupBadge({ glyph, label }: { glyph: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-strong)] bg-[var(--lm-color-surface)] px-1.5 py-0.5 font-mono text-[length:var(--lm-text-micro)] font-bold uppercase tracking-wide text-[var(--lm-color-text-primary)]">
      <span aria-hidden="true">{glyph}</span>
      <span>{label}</span>
    </span>
  );
}

export function ReadoutRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={ROW}>
      <span className={ROW_LABEL}>{label}</span>
      <span className={ROW_VALUE}>{value}</span>
    </div>
  );
}

export interface SolarGroupProps {
  readonly solar: SolarReadout;
  readonly disk: SolarDiskModel;
  readonly solarCriterionLabel: string;
}

export const SolarGroup: React.FC<SolarGroupProps> = ({ solar, disk, solarCriterionLabel }) => (
  <div data-testid="readout-group-solar" className={`${GROUP_BASE} ${SOLAR_TONE[solar.state]}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={GROUP_LABEL}>Solar visibility</span>
      <GroupBadge glyph={solar.glyph} label={solar.badge} />
    </div>
    <p className={GROUP_KIND}>Geometric measurement · upper-limb criterion</p>
    <ReadoutRow label="Visible disk (area)" value={formatPercent(solar.diskFraction)} />
    <ReadoutRow
      label={`Disk clearance (${solarCriterionLabel})`}
      value={formatSignedDeg(solar.clearanceDeg)}
    />
    <ReadoutRow
      label="Skyline / sun centre"
      value={`${formatSignedDeg(solar.horizonMaskDeg)} / ${formatSignedDeg(solar.elevationDeg)}`}
    />
    <div className="mt-1 flex flex-col gap-1 border-t border-[var(--lm-color-border-subtle)] pt-1.5">
      <p className={GROUP_KIND}>Engineering interpretation · not power</p>
      <ReadoutRow
        label="Irradiance-weighted"
        value={solar.irradianceFraction === null ? 'unavailable' : formatPercent(solar.irradianceFraction)}
      />
      <p className="font-mono text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
        Limb-darkened solid-angle fraction from the finite-disk integrator. Not generated electrical
        power.
      </p>
    </div>
    {disk.kind === 'unsupported' && (
      <p className="font-mono text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
        Sun-disk outline unavailable for this epoch: the Sun is drawn as a point marker, and
        clearance values use centre-of-disk geometry.
      </p>
    )}
  </div>
);

export interface EarthGroupProps {
  readonly earth: EarthReadout;
  readonly earthCriterionLabel: string;
}

export const EarthGroup: React.FC<EarthGroupProps> = ({ earth, earthCriterionLabel }) => (
  <div data-testid="readout-group-earth" className={`${GROUP_BASE} ${EARTH_TONE[earth.state]}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={GROUP_LABEL}>Earth communications geometry</span>
      <GroupBadge glyph={earth.glyph} label={earth.badge} />
    </div>
    <p className={GROUP_KIND}>Geometric line-of-sight · not an RF link closure</p>
    <ReadoutRow label="Criterion" value={earthCriterionLabel} />
    <ReadoutRow label="Clearance" value={formatSignedDeg(earth.clearanceDeg)} />
    <ReadoutRow
      label="Elevation / skyline"
      value={`${formatSignedDeg(earth.elevationDeg)} / ${formatSignedDeg(earth.horizonMaskDeg)}`}
    />
    <p className="mt-1 border-t border-[var(--lm-color-border-subtle)] pt-1.5 font-mono text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
      Line-of-sight against the published horizon bins. A clear sightline is not link closure; RF
      budget, antenna gain and data rate are separate models.
    </p>
  </div>
);

function RateRow({ label, rate }: { label: string; rate: RateReadout }) {
  const tone =
    rate.provenance === 'api'
      ? 'text-[var(--lm-color-success)]'
      : rate.provenance === 'interval-mean'
        ? 'text-[var(--lm-color-warning)]'
        : 'text-[var(--lm-color-text-muted)]';
  return (
    <div className={ROW}>
      <span className={ROW_LABEL}>{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className={ROW_VALUE}>{formatDegPerHour(rate.valueDegPerHour)}</span>
        <span data-provenance={rate.provenance} className={`uppercase ${tone}`}>
          {PROVENANCE_LABELS[rate.provenance]}
        </span>
      </span>
    </div>
  );
}

export interface EventGroupProps {
  readonly missionEvent: MissionEventReadout;
  readonly rates: {
    sunAzimuth: RateReadout;
    sunElevation: RateReadout;
    earthAzimuth: RateReadout;
    earthElevation: RateReadout;
  };
  readonly windowLabel: string | null;
}

export const EventGroup: React.FC<EventGroupProps> = ({ missionEvent, rates, windowLabel }) => (
  <div data-testid="readout-group-event" className={`${GROUP_BASE} ${EVENT_TONE[missionEvent.state]}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={GROUP_LABEL}>Mission event status</span>
      <GroupBadge glyph={missionEvent.glyph} label={missionEvent.badge} />
    </div>
    <p className={GROUP_KIND}>Operational classification from the solver</p>
    <ReadoutRow label="Active window" value={windowLabel ?? 'no active sub-interval'} />
    <ReadoutRow label="Overlap track" value={missionEvent.statusLabel} />
    <div className="mt-1 flex flex-col gap-1 border-t border-[var(--lm-color-border-subtle)] pt-1.5">
      <p className={GROUP_KIND}>Topocentric rates</p>
      <RateRow label="Sun dAz/dt" rate={rates.sunAzimuth} />
      <RateRow label="Sun dEl/dt" rate={rates.sunElevation} />
      <RateRow label="Earth dAz/dt" rate={rates.earthAzimuth} />
      <RateRow label="Earth dEl/dt" rate={rates.earthElevation} />
    </div>
  </div>
);

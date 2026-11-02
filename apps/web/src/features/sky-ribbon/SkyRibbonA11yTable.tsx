import React, { useMemo } from 'react';
import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';
import { buildRidgeContacts } from './skyRibbonTableModel';
import type { EarthReadout, MissionEventReadout, SolarReadout } from './skyRibbonAnalysis';
import type { SkylineSample, SkylineTopology } from './skyRibbonSkyline';
import type { SolarDiskModel } from './skyRibbonDisk';
import { describeDiskProvenance } from './skyRibbonDisk';
import type { TrajectorySeries } from './skyRibbonTrajectory';
import { formatDeg, formatPercent, formatSignedDeg } from './skyRibbonFormat';
import { EventTable, GrazingTable } from './SkyRibbonTables';

export interface SkyRibbonA11yTableProps {
  siteName: string;
  intervals: readonly EvaluatedSubInterval[];
  eventWhiskers: readonly EventWhisker[];
  skyline: readonly SkylineSample[];
  skylineTopology: SkylineTopology;
  activeIndex: number;
  solar: SolarReadout;
  earth: EarthReadout;
  missionEvent: MissionEventReadout;
  disk: SolarDiskModel;
  trajectories: readonly TrajectorySeries[];
  solarCriterionLabel: string;
  windowLabel: string | null;
}

/**
 * Accessible companion for both canvases (WCAG 1.1.1).
 *
 * The canvases are `aria-hidden`; this region is their non-visual equivalent and carries every
 * decision value the drawings encode: signed clearance, geometric and irradiance-weighted disk
 * fractions, Earth geometric LoS, mission event state, apparent-disk availability, the published
 * skyline samples (with the count of interpolated segments between them), blocking ridge azimuths
 * and rise/set times.
 *
 * The tables it renders live in `SkyRibbonTables`; this component states what the values mean.
 */
export const SkyRibbonA11yTable: React.FC<SkyRibbonA11yTableProps> = ({
  siteName,
  intervals,
  eventWhiskers,
  skyline,
  skylineTopology,
  activeIndex,
  solar,
  earth,
  missionEvent,
  disk,
  trajectories,
  solarCriterionLabel,
  windowLabel,
}) => {
  const contacts = useMemo(
    () => buildRidgeContacts(skyline, solar.elevationDeg, 8),
    [skyline, solar.elevationDeg],
  );
  const samples = useMemo(
    () => trajectories.map((series) => ({
      body: series.body,
      count: series.samples.length,
      seamBreaks: series.seamBreaks,
    })),
    [trajectories],
  );
  const binCount = skylineTopology.runs.reduce((total, run) => total + run.samples.length, 0);
  const segments = Math.max(0, binCount - skylineTopology.runs.length);

  return (
    <section
      role="region"
      aria-label={`Accessible sky-ribbon companion for ${siteName}: solar clearance, visible disk fractions, Earth line-of-sight, mission event state, apparent-disk availability, blocking ridge azimuths and rise or set times`}
      data-testid="sky-ribbon-a11y-table"
      className="flex min-w-0 flex-col gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3 text-[var(--lm-color-text-secondary)]"
    >
      <h3 className="text-[length:var(--lm-text-h3)] font-semibold text-[var(--lm-color-text-primary)]">
        Sky-Ribbon accessible companion
      </h3>

      <p data-testid="sky-ribbon-a11y-summary" className="text-[length:var(--lm-text-label)]">
        Site {siteName}. Solar {solar.badge} — visible disk {formatPercent(solar.diskFraction)}{' '}
        (area), irradiance-weighted{' '}
        {solar.irradianceFraction === null ? 'unavailable' : formatPercent(solar.irradianceFraction)},
        clearance {formatSignedDeg(solar.clearanceDeg)} against the {solarCriterionLabel} criterion.
        Earth geometric line-of-sight {earth.badge} at {formatSignedDeg(earth.elevationDeg)}{' '}
        elevation. Mission event: {missionEvent.badge}. Active sub-interval{' '}
        {windowLabel ?? 'none'}.
      </p>

      <div className="grid min-w-0 grid-cols-1 gap-2 font-mono text-[length:var(--lm-text-micro)] sm:grid-cols-2">
        <p data-testid="sky-ribbon-a11y-disk">
          <span className="text-[var(--lm-color-text-muted)]">Apparent solar disk: </span>
          {disk.kind === 'unsupported'
            ? `outline unsupported — ${disk.reason}. Centre and clearance only.`
            : describeDiskProvenance(disk)}
        </p>
        <p data-testid="sky-ribbon-a11y-samples">
          <span className="text-[var(--lm-color-text-muted)]">Measured vs drawn: </span>
          {binCount} published skyline bin{binCount === 1 ? '' : 's'} and {segments} interpolated
          segment{segments === 1 ? '' : 's'} between them
          {skylineTopology.gaps > 0 ? `, ${skylineTopology.gaps} azimuth gap(s) left unjoined` : ''}.
          {samples.map((sample) => ` ${sample.body === 'sun' ? 'Sun' : 'Earth'}: ${sample.count} published sample(s), ${sample.seamBreaks} path break(s).`)}
        </p>
      </div>

      <GrazingTable intervals={intervals} activeIndex={activeIndex} />
      <EventTable eventWhiskers={eventWhiskers} />

      <p data-testid="sky-ribbon-a11y-contacts" className="text-[length:var(--lm-text-micro)] leading-snug">
        Terrain sectors at or above the current solar elevation:
        {contacts.length === 0
          ? ' none in the supplied horizon samples.'
          : ` ${contacts
              .map(
                (contact) =>
                  `AZ ${formatDeg(contact.azimuthDeg, 1)} at ${formatSignedDeg(contact.nominalDeg)}`,
              )
              .join('; ')}.`}
      </p>

      <p className="text-[length:var(--lm-text-micro)] leading-relaxed text-[var(--lm-color-text-muted)]">
        Observables: the visible disk fraction is the backend geometric (area) fraction of the
        apparent solar disk. The irradiance-weighted fraction is a limb-darkened solid-angle
        integral — a different observable, and still not generated electrical power. Earth status is
        geometric line-of-sight, not an RF link closure. Disk clearance is computed for the{' '}
        {solarCriterionLabel} criterion and must not be compared with a clearance computed for a
        different limb criterion. A "full-disk bound" is a conservative upper bound on occlusion: it
        subtracts the apparent angular radius from the body centre and compares against the highest
        skyline sample across the disk footprint, so it can report occlusion that an exact
        finite-disk/terrain intersection would not. Skyline values are published horizon bins; the
        browser sorts and groups them but never interpolates a missing bin or bridges a gap. The
        sensitivity window is a deterministic terrain-perturbation span, not a confidence interval.
      </p>
    </section>
  );
};

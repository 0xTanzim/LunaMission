import React from 'react';
import type { EarthReadout, MissionEventReadout, RateReadout, SolarReadout } from './skyRibbonAnalysis';
import type { SolarDiskModel } from './skyRibbonDisk';
import { describeCursor, type SkyCursor } from './skyRibbonCursor';
import { EarthGroup, EventGroup, ROW, ROW_LABEL, ROW_VALUE, SolarGroup } from './SkyReadoutGroups';
import { formatPercent, formatSignedDeg } from './skyRibbonFormat';

export interface SkyAnalyticalReadoutProps {
  solar: SolarReadout;
  earth: EarthReadout;
  missionEvent: MissionEventReadout;
  disk: SolarDiskModel;
  rates: {
    sunAzimuth: RateReadout;
    sunElevation: RateReadout;
    earthAzimuth: RateReadout;
    earthElevation: RateReadout;
  };
  cursor: SkyCursor | null;
  solarCriterionLabel: string;
  earthCriterionLabel: string;
  windowLabel: string | null;
}

/**
 * Grouped read-out strip: Solar visibility · Earth communications geometry · Mission event
 * status, each with exactly one status badge.
 *
 * The separation is the point. Group 1 is a *geometric* measurement (area fraction of the
 * apparent disk) next to the *engineering interpretation* (irradiance-weighted, and explicitly
 * not power). Group 2 is geometric line-of-sight, not an RF link. Group 3 carries the backend's
 * own operational classification. No single badge implies all four of measurement,
 * interpretation, confidence and operational status.
 *
 * Every figure is either a backend value rendered verbatim or an explicitly labelled finite
 * difference between two backend sub-interval means (provenance `Δ/Δt`).
 *
 * The groups themselves live in `SkyReadoutGroups`; this component only assembles them.
 */
export const SkyAnalyticalReadout: React.FC<SkyAnalyticalReadoutProps> = ({
  solar,
  earth,
  missionEvent,
  disk,
  rates,
  cursor,
  solarCriterionLabel,
  earthCriterionLabel,
  windowLabel,
}) => (
  <section
    data-testid="sky-analytical-readout"
    aria-label="Grouped analytical readout: solar visibility, Earth communications geometry, mission event status"
    className="flex min-w-0 flex-col gap-2 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3"
  >
    <p role="status" aria-live="polite" className="sr-only">
      {`Solar ${solar.badge}, disk clearance ${formatSignedDeg(solar.clearanceDeg)}, visible disk ${formatPercent(
        solar.diskFraction,
      )}. Earth line of sight ${earth.badge}. Mission event ${missionEvent.badge}. ${describeCursor(
        cursor,
      )}.`}
    </p>

    <div className="grid min-w-0 grid-cols-1 gap-2.5 lg:grid-cols-3">
      <SolarGroup solar={solar} disk={disk} solarCriterionLabel={solarCriterionLabel} />
      <EarthGroup earth={earth} earthCriterionLabel={earthCriterionLabel} />
      <EventGroup missionEvent={missionEvent} rates={rates} windowLabel={windowLabel} />
    </div>

    <div data-testid="readout-cursor" className={ROW}>
      <span className={ROW_LABEL}>Cursor</span>
      <span className={ROW_VALUE}>{describeCursor(cursor)}</span>
    </div>
  </section>
);

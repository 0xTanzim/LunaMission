import React from 'react';
import type { EventWhisker } from '@luna/contracts';
import { buildEventRows, buildGrazingRows, type GrazingIntervalRow, type EventRow } from './skyRibbonTableModel';
import type { EvaluatedSubInterval } from '@luna/contracts';
import { formatDeg, formatPercent, formatSignedDeg } from './skyRibbonFormat';

/**
 * The two tables the accessible companion renders.
 *
 * Split from `SkyRibbonA11yTable` because a table's job is to present rows, while the companion's
 * job is to state what the drawing means. Keeping them together pushed the component past the
 * AGENTS.md §5.1 presentation cap and mixed two responsibilities in one file.
 */

const TH =
  'border-b border-[var(--lm-color-border)] bg-[var(--lm-color-canvas)] px-2 py-1 text-left text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]';

const TD =
  'border-b border-[var(--lm-color-border-subtle)] px-2 py-1 align-top text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-secondary)]';

const ROW_HEAD =
  'border-b border-[var(--lm-color-border-subtle)] px-2 py-1 align-top text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-secondary)] text-left font-semibold text-[var(--lm-color-text-primary)]';

const DISK_CLASS_LABEL = {
  full: 'FULL',
  partial: 'PARTIAL',
  none: 'OCCLUDED',
  unknown: 'NO DATA',
} as const;

export interface GrazingTableProps {
  readonly intervals: readonly EvaluatedSubInterval[];
  readonly activeIndex: number;
}

export const GrazingTable: React.FC<GrazingTableProps> = ({ intervals, activeIndex }) => {
  const rows: readonly GrazingIntervalRow[] = buildGrazingRows(intervals, activeIndex, 8);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="pb-1 text-left text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          Solar geometry of the most constraining evaluated sub-intervals (lowest visible disk
          first). A negative clearance means terrain blocks the solar centre.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>Sub-interval (UTC)</th>
            <th scope="col" className={TH}>Sun AZ</th>
            <th scope="col" className={TH}>Sun EL</th>
            <th scope="col" className={TH}>Skyline</th>
            <th scope="col" className={TH}>Disk clearance</th>
            <th scope="col" className={TH}>Visible disk</th>
            <th scope="col" className={TH}>Earth LoS</th>
            <th scope="col" className={TH}>Blocking ridge AZ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={TD} colSpan={8} data-testid="sky-ribbon-a11y-rows-empty">
                No evaluated sub-intervals were returned for this scenario, so no solar geometry rows
                exist.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.key}
                className={row.isActive ? 'bg-[var(--lm-color-info-surface)]' : undefined}
              >
                <th scope="row" className={ROW_HEAD}>
                  {row.isActive ? 'ACTIVE · ' : ''}
                  {row.windowLabel}
                </th>
                <td className={TD}>{formatDeg(row.azimuthDeg, 1)}</td>
                <td className={TD}>{formatSignedDeg(row.elevationDeg)}</td>
                <td className={TD}>{formatSignedDeg(row.skylineDeg)}</td>
                <td className={TD}>{formatSignedDeg(row.clearanceDeg)}</td>
                <td className={TD}>
                  {formatPercent(row.diskPercent === null ? null : row.diskPercent / 100)} [
                  {DISK_CLASS_LABEL[row.diskClass]}]
                </td>
                <td className={TD}>{row.earthBadge}</td>
                <td className={TD}>
                  {row.blockingRidgeAzimuthDeg === null
                    ? '—'
                    : formatDeg(row.blockingRidgeAzimuthDeg, 1)}
                  {row.blockingFeature ? ` (${row.blockingFeature})` : ''}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export interface EventTableProps {
  readonly eventWhiskers: readonly EventWhisker[];
}

export const EventTable: React.FC<EventTableProps> = ({ eventWhiskers }) => {
  const events: readonly EventRow[] = buildEventRows(eventWhiskers, 12);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <caption className="pb-1 text-left text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          Sunrise, sunset and Earth rise or set events with their deterministic terrain sensitivity
          window.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>Event</th>
            <th scope="col" className={TH}>Nominal (UTC)</th>
            <th scope="col" className={TH}>Sensitivity window (UTC)</th>
            <th scope="col" className={TH}>Azimuth</th>
            <th scope="col" className={TH}>Rating</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td className={TD} colSpan={5} data-testid="sky-ribbon-a11y-events-empty">
                No rise or set event was returned for this window (the body may stay continuously
                above or below the terrain horizon).
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <tr key={event.key}>
                <th scope="row" className={ROW_HEAD}>{event.type}</th>
                <td className={TD}>{event.timeLabel}</td>
                <td className={TD}>{event.windowLabel}</td>
                <td className={TD}>{formatDeg(event.azimuthDeg, 1)}</td>
                <td className={TD}>
                  {event.sensitivity}
                  {event.spanHours === null ? '' : ` (±${event.spanHours.toFixed(1)} h)`}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

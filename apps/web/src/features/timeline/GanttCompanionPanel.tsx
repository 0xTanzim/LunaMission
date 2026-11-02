import React from 'react';
import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';
import { GANTT_TRACKS, STATUS_ORDER, type GanttCell, type TimelineViewWindow } from './ganttModel';
import { STATUS_LABEL, paintFor } from './ganttTrackRenderer';
import { formatUtcMinute } from '../sky-ribbon/skyRibbonFormat';

export interface GanttHoverReadoutProps {
  readonly interval: EvaluatedSubInterval | null;
  readonly eventWhiskers: readonly EventWhisker[];
  readonly view: TimelineViewWindow;
  readonly hoveredEpochMs: number | null;
}

const row = 'flex min-w-0 items-baseline justify-between gap-3';

/** Exact UTC start/end plus the two observables for whatever the pointer is over. */
export const GanttHoverReadout: React.FC<GanttHoverReadoutProps> = ({
  interval,
  eventWhiskers,
  view,
  hoveredEpochMs,
}) => {
  if (hoveredEpochMs === null) {
    return (
      <p
        data-testid="gantt-hover-readout"
        data-state="idle"
        className="font-mono text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]"
      >
        Hover or drag across the tracks to read the exact UTC start and end of a sub-interval.
        Visible window {formatUtcMinute(new Date(view.startEpochMs).toISOString())} →{' '}
        {formatUtcMinute(new Date(view.endEpochMs).toISOString())}.
      </p>
    );
  }

  const inside = eventWhiskers.filter(
    (whisker) => Math.abs(whisker.eventEpochMs - hoveredEpochMs) <= 1_800_000,
  );
  return (
    <div
      data-testid="gantt-hover-readout"
      data-state={interval ? 'interval' : 'gap'}
      className="flex min-w-0 flex-col gap-1 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)] px-2 py-1.5 font-mono text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-secondary)]"
    >
      <div className={row}>
        <span className="text-[var(--lm-color-text-muted)]">Hovered instant</span>
        <span>{formatUtcMinute(new Date(hoveredEpochMs).toISOString())}</span>
      </div>
      {interval ? (
        <>
          <div className={row}>
            <span className="text-[var(--lm-color-text-muted)]">Sub-interval (UTC)</span>
            <span>
              {formatUtcMinute(interval.startDateUtc)} → {formatUtcMinute(interval.endDateUtc)}
            </span>
          </div>
          <div className={row}>
            <span className="text-[var(--lm-color-text-muted)]">Duration</span>
            <span>{interval.durationHours.toFixed(2)} h</span>
          </div>
          {GANTT_TRACKS.map((track, index) => {
            const status =
              track.id === 'sun'
                ? interval.sun.status
                : track.id === 'earth'
                  ? interval.earth.status
                  : interval.overlap.status;
            return (
              <div key={track.id} className={row}>
                <span className="text-[var(--lm-color-text-muted)]">{track.label}</span>
                <span>{paintFor(index, status).label}</span>
              </div>
            );
          })}
        </>
      ) : (
        <p className="leading-snug text-[var(--lm-color-text-muted)]">
          No evaluated sub-interval covers this instant — the boundary is between published
          intervals, so no status is claimed here.
        </p>
      )}
      {inside.length > 0 && (
        <p className="leading-snug text-[var(--lm-color-warning)]">
          Solved event: {inside[0]!.eventType} at {formatUtcMinute(inside[0]!.tNominalDateUtc)},
          sensitivity window {formatUtcMinute(inside[0]!.tLowDateUtc)} →{' '}
          {formatUtcMinute(inside[0]!.tHighDateUtc)} (±{inside[0]!.whiskerSpanHours.toFixed(1)} h).
        </p>
      )}
    </div>
  );
};

export interface GanttA11yTableProps {
  readonly siteName: string;
  readonly intervals: readonly EvaluatedSubInterval[];
  readonly eventWhiskers: readonly EventWhisker[];
  readonly activeIndex: number;
}

const TH =
  'border-b border-[var(--lm-color-border)] bg-[var(--lm-color-canvas)] px-2 py-1 text-left text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]';
const TD =
  'border-b border-[var(--lm-color-border-subtle)] px-2 py-1 align-top text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-secondary)]';

/**
 * WCAG 1.1.1 companion for the Gantt canvas: the same three tracks as rows, with exact UTC bounds,
 * the pattern each cell uses, and the solved events with their sensitivity spans.
 */
export const GanttA11yTable: React.FC<GanttA11yTableProps> = ({
  siteName,
  intervals,
  eventWhiskers,
  activeIndex,
}) => (
  <section
    role="region"
    aria-label={`Accessible mission timeline companion for ${siteName}: solar disk visibility, Earth line-of-sight and concurrent overlap sub-intervals with exact UTC bounds`}
    data-testid="gantt-a11y-table"
    className="flex min-w-0 flex-col gap-2 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3 text-[var(--lm-color-text-secondary)]"
  >
    <h3 className="text-[length:var(--lm-text-h3)] font-semibold text-[var(--lm-color-text-primary)]">
      Timeline accessible companion
    </h3>
    <p className="text-[length:var(--lm-text-label)]">
      {intervals.length} evaluated sub-interval{intervals.length === 1 ? '' : 's'} across three
      tracks. Cell patterns: solid = observable holds, stipple = partial, diagonal hatch = blocked by
      terrain, dots = below the smooth horizon. Durations are geometric; they are not generated
      electrical energy and not RF link closure.
    </p>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="pb-1 text-left text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          Playback-ordered sub-intervals. The ACTIVE row contains the canonical playhead.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>Sub-interval (UTC)</th>
            <th scope="col" className={TH}>Duration</th>
            {GANTT_TRACKS.map((track) => (
              <th key={track.id} scope="col" className={TH}>
                {track.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {intervals.length === 0 ? (
            <tr>
              <td className={TD} colSpan={5} data-testid="gantt-a11y-empty">
                No evaluated sub-intervals were returned for this window.
              </td>
            </tr>
          ) : (
            intervals.map((interval, index) => (
              <tr
                key={`${interval.startEpochMs}-${index}`}
                className={index === activeIndex ? 'bg-[var(--lm-color-info-surface)]' : undefined}
              >
                <th
                  scope="row"
                  className={`${TD} text-left font-semibold text-[var(--lm-color-text-primary)]`}
                >
                  {index === activeIndex ? 'ACTIVE · ' : ''}
                  {formatUtcMinute(interval.startDateUtc)} → {formatUtcMinute(interval.endDateUtc)}
                </th>
                <td className={TD}>{interval.durationHours.toFixed(2)} h</td>
                <td className={TD}>
                  {STATUS_LABEL[interval.sun.status] ?? interval.sun.status}
                </td>
                <td className={TD}>
                  {STATUS_LABEL[interval.earth.status] ?? interval.earth.status}
                </td>
                <td className={TD}>
                  {STATUS_LABEL[interval.overlap.status] ?? interval.overlap.status}
                  {interval.overlap.isMissionCriticalWindow ? ' (mission-critical)' : ''}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <caption className="pb-1 text-left text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          Solved events with their deterministic terrain sensitivity span — not a confidence
          interval.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={TH}>Event</th>
            <th scope="col" className={TH}>Nominal (UTC)</th>
            <th scope="col" className={TH}>Sensitivity window (UTC)</th>
            <th scope="col" className={TH}>Span (±h)</th>
            <th scope="col" className={TH}>Rating</th>
          </tr>
        </thead>
        <tbody>
          {eventWhiskers.length === 0 ? (
            <tr>
              <td className={TD} colSpan={5} data-testid="gantt-a11y-events-empty">
                No rise or set event was solved for this window.
              </td>
            </tr>
          ) : (
            eventWhiskers.map((whisker, index) => (
              <tr key={`${whisker.eventType}-${whisker.eventEpochMs}-${index}`}>
                <th
                  scope="row"
                  className={`${TD} text-left font-semibold text-[var(--lm-color-text-primary)]`}
                >
                  {whisker.eventType}
                </th>
                <td className={TD}>{formatUtcMinute(whisker.tNominalDateUtc)}</td>
                <td className={TD}>
                  {formatUtcMinute(whisker.tLowDateUtc)} → {formatUtcMinute(whisker.tHighDateUtc)}
                </td>
                <td className={TD}>{whisker.whiskerSpanHours.toFixed(2)}</td>
                <td className={TD}>{whisker.sensitivityRating}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    <p className="text-[length:var(--lm-text-micro)] leading-relaxed text-[var(--lm-color-text-muted)]">
      Track definitions: solar disk visibility is the geometric visible fraction of the apparent
      solar disk; Earth line-of-sight is geometric visibility of the Earth, not an RF link closure;
      overlap is concurrent geometric access to both, which is not by itself a mission feasibility
      window. Root-solver tolerance is not physical event-time accuracy, which is why every event
      carries its own terrain sensitivity span.
    </p>
    <p className="sr-only">{STATUS_ORDER.join(', ')}.</p>
  </section>
);

export type { GanttCell };

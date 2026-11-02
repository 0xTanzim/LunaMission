import React from 'react';
import { GANTT_TRACKS, type CriticalWindow } from './ganttModel';
import { formatUtcMinute } from '../sky-ribbon/skyRibbonFormat';

export interface GanttTrackLegendProps {
  readonly criticalWindows: readonly CriticalWindow[];
}

const SWATCH = 'inline-block h-2.5 w-4 shrink-0 rounded-[2px] border';

/**
 * Track names and the non-colour encodings beside the canvas. The observable statement under each
 * name is what stops a green Earth cell from reading as a completed communications link.
 */
export const GanttTrackLegend: React.FC<GanttTrackLegendProps> = ({ criticalWindows }) => (
  <div className="flex min-w-0 flex-col gap-2">
    <ul
      data-testid="gantt-track-legend"
      className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-1.5 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-secondary)]"
    >
      {GANTT_TRACKS.map((track, index) => (
        <li key={track.id} className="flex min-w-0 items-start gap-1.5">
          <span
            aria-hidden="true"
            className={`${SWATCH} mt-1 ${
              index === 0
                ? 'border-[var(--lm-color-border-strong)] bg-[var(--lm-color-success)]'
                : index === 1
                  ? 'border-[var(--lm-color-border-strong)] bg-[var(--lm-color-info)]'
                  : 'border-[var(--lm-color-border-strong)] bg-[var(--lm-color-sun)]'
            }`}
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-[var(--lm-color-text-primary)]">{track.label}</span>
            <span className="text-[var(--lm-color-text-muted)]">{track.observable}</span>
          </span>
        </li>
      ))}
      <li className="flex min-w-0 items-start gap-1.5">
        <span
          aria-hidden="true"
          className={`${SWATCH} mt-1 border-[var(--lm-color-danger-border)]`}
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--lm-color-danger) 0 1px, transparent 1px 4px)',
          }}
        />
        <span className="flex min-w-0 flex-col">
          <span className="text-[var(--lm-color-text-primary)]">Hatched / dotted cell</span>
          <span className="text-[var(--lm-color-text-muted)]">
            blocked or below-horizon — never colour-only
          </span>
        </span>
      </li>
    </ul>
    {criticalWindows.length > 0 && (
      <p className="font-mono text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-warning)]">
        Critical short windows (▾ above the tracks):{' '}
        {criticalWindows
          .slice(0, 4)
          .map(
            (window) =>
              `${formatUtcMinute(new Date(window.startEpochMs).toISOString())} (${window.durationHours.toFixed(1)} h)`,
          )
          .join('; ')}
        {criticalWindows.length > 4 ? `; +${criticalWindows.length - 4} more` : ''}
      </p>
    )}
  </div>
);

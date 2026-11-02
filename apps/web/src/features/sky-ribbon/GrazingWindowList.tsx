import React from 'react';
import type { GrazingWindow } from './skyRibbonTableModel';
import { formatPercent, formatSignedDeg } from './skyRibbonFormat';

export interface GrazingWindowListProps {
  readonly windows: readonly GrazingWindow[];
  readonly hasIntervals: boolean;
}

/**
 * Critical grazing intervals — the sub-intervals where part of the apparent disk is above the
 * ridge. Listed rather than only drawn, so the set is readable without decoding the canvas, and
 * so an empty set states why it is empty instead of leaving a blank strip.
 */
export const GrazingWindowList: React.FC<GrazingWindowListProps> = ({ windows, hasIntervals }) => (
  <section
    data-testid="grazing-window-list"
    aria-label="Critical grazing intervals: sub-intervals with a partially visible solar disk"
    className="flex min-w-0 flex-col gap-1.5"
  >
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="font-mono text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-primary)]">
        Critical grazing intervals
      </h4>
      <span className="font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
        partial disk · 0% &lt; visible &lt; 100%
      </span>
    </div>
    {windows.length === 0 ? (
      <p
        data-testid="grazing-window-list-empty"
        className="font-mono text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]"
      >
        {hasIntervals
          ? 'No evaluated sub-interval has a partially visible disk in this window: the Sun is either fully above or fully below the ridge throughout.'
          : 'No evaluated sub-intervals were returned, so no grazing interval can be identified.'}
      </p>
    ) : (
      <ul className="flex min-w-0 flex-col gap-1">
        {windows.map((window) => (
          <li
            key={window.key}
            data-testid="grazing-window-row"
            data-active={window.isActive ? 'true' : 'false'}
            className={`flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-[var(--lm-radius-xs)] border px-2 py-1 font-mono text-[length:var(--lm-text-micro)] tabular-nums ${
              window.isActive
                ? 'border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-text-primary)]'
                : 'border-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-secondary)]'
            }`}
          >
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span aria-hidden="true" className="text-[var(--lm-color-danger)]">
                ▾
              </span>
              <span className="truncate">{window.windowLabel}</span>
              {window.isActive && (
                <span className="uppercase text-[var(--lm-color-warning)]">active</span>
              )}
            </span>
            <span className="flex shrink-0 items-baseline gap-3 text-[var(--lm-color-text-muted)]">
              <span>disk {formatPercent(window.diskPercent === null ? null : window.diskPercent / 100)}</span>
              <span>clr {formatSignedDeg(window.clearanceDeg)}</span>
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

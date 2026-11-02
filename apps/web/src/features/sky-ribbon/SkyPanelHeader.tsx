import React from 'react';

export interface SkyPanelHeaderProps {
  readonly title: string;
  readonly subtitle: string;
  /** Axis / scale policy for the panel. */
  readonly meta: string;
  /** Right-aligned small count or state. */
  readonly aside?: string;
  readonly playheadLabel?: string | null;
}

/**
 * Panel title block. The subtitle states the panel's job (docs/ui/INSTRUMENTS.md) so the reader
 * does not have to infer what the instrument is for from the drawing alone.
 */
export const SkyPanelHeader: React.FC<SkyPanelHeaderProps> = ({
  title,
  subtitle,
  meta,
  aside,
  playheadLabel,
}) => (
  <header className="flex min-w-0 flex-wrap items-start justify-between gap-2">
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 flex-wrap items-baseline gap-2">
        <h3 className="text-[length:var(--lm-text-h3)] font-semibold leading-tight text-[var(--lm-color-text-primary)]">
          {title}
        </h3>
        <span className="font-mono text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]">
          {meta}
        </span>
      </div>
      <p className="text-[length:var(--lm-text-label)] text-[var(--lm-color-text-muted)]">
        {subtitle}
      </p>
    </div>
    <div className="flex shrink-0 flex-col items-end gap-0.5 font-mono text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-muted)]">
      {aside && <span>{aside}</span>}
      {playheadLabel && (
        <span className="text-[var(--lm-color-focus)]">PLAYHEAD {playheadLabel}</span>
      )}
    </div>
  </header>
);

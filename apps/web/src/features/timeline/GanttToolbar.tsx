import React from 'react';
import { SegmentedControl } from '../../shared/ui/SegmentedControl';
import { GANTT_ZOOM_PRESETS, type GanttZoomPreset, type ZoomPresetId } from './ganttModel';

export interface GanttToolbarProps {
  readonly preset: ZoomPresetId;
  readonly onPresetChange: (preset: ZoomPresetId) => void;
  readonly viewLabel: string;
  readonly zoomed: boolean;
  readonly onReset: () => void;
  readonly criticalCount: number;
  readonly activePresetDisabled: boolean;
}

const BUTTON =
  'inline-flex min-h-[28px] items-center justify-center rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-2.5 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]';

/** Header row: what the three tracks assert, the visible window, and the zoom presets. */
export const GanttToolbar: React.FC<GanttToolbarProps> = ({
  preset,
  onPresetChange,
  viewLabel,
  zoomed,
  onReset,
  criticalCount,
  activePresetDisabled,
}) => {
  const options = GANTT_ZOOM_PRESETS.map((entry: GanttZoomPreset) => ({
    value: entry.id,
    label: entry.label,
    disabled: entry.id === 'active' && activePresetDisabled,
  }));
  return (
    <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-[length:var(--lm-text-h3)] font-semibold leading-tight text-[var(--lm-color-text-primary)]">
          Mission timeline
        </h3>
        <p className="text-[length:var(--lm-text-label)] text-[var(--lm-color-text-muted)]">
          When does each observable hold, and how certain is the boundary?
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-mono text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-muted)]">
          {viewLabel}
        </span>
        {criticalCount > 0 && (
          <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)] px-1.5 py-0.5 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-warning)]">
            {criticalCount} critical window{criticalCount === 1 ? '' : 's'}
          </span>
        )}
        <SegmentedControl
          label="Timeline zoom"
          options={options}
          value={preset}
          onChange={onPresetChange}
          size="sm"
        />
        {zoomed && (
          <button type="button" onClick={onReset} className={BUTTON}>
            Reset zoom
          </button>
        )}
      </div>
    </div>
  );
};

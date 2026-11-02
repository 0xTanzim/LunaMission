import React from 'react';

interface LaunchSlipSliderProps {
  launchSlipOffsetDays: number;
  onLaunchSlipChange: (offsetDays: number) => void;
  nominalStartUtc: string;
  nominalStopUtc: string;
  className?: string;
}

export const LaunchSlipSlider: React.FC<LaunchSlipSliderProps> = ({
  launchSlipOffsetDays,
  onLaunchSlipChange,
  nominalStartUtc,
  nominalStopUtc,
  className = '',
}) => {
  const effectiveStart = new Date(new Date(nominalStartUtc).getTime() + launchSlipOffsetDays * 86400000);
  const effectiveStop = new Date(new Date(nominalStopUtc).getTime() + launchSlipOffsetDays * 86400000);

  return (
    <div
      role="group"
      aria-label="Mission Launch-Slip Window Adjustment"
      className={`bg-[var(--lm-color-canvas)] p-2.5 rounded-lg border border-[var(--lm-color-border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="timeline-slip-slider" className="text-[var(--lm-color-text-muted)] font-semibold uppercase text-[11px] flex items-center gap-1.5">
          <span>Launch Slip (Δt):</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            launchSlipOffsetDays > 0 ? 'bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning-border)]' : 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)]'
          }`}>
            +{launchSlipOffsetDays.toFixed(1)} Days
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3 flex-1 max-w-xs min-h-[32px]">
        <input
          id="timeline-slip-slider"
          type="range"
          min="0"
          max="28"
          step="0.5"
          value={launchSlipOffsetDays}
          onChange={(e) => onLaunchSlipChange(parseFloat(e.target.value))}
          aria-label="Adjust launch slip offset from 0 to 28 days"
          data-testid="gantt-launch-slip-slider"
          className="w-full accent-[var(--lm-color-info)] cursor-pointer h-2 bg-[var(--lm-color-surface-strong)] rounded min-h-[32px]"
        />
        {launchSlipOffsetDays > 0 && (
          <button
            type="button"
            onClick={() => onLaunchSlipChange(0)}
            aria-label="Reset launch slip to 0.0 days"
            className="px-2 py-1 text-[11px] rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[32px]"
          >
            Reset
          </button>
        )}
      </div>

      <div className="text-[11px] text-[var(--lm-color-text-muted)]">
        Effective: <span className="text-[var(--lm-color-info)] font-semibold">{effectiveStart.toISOString().slice(0, 10)}</span> to{' '}
        <span className="text-[var(--lm-color-info)] font-semibold">{effectiveStop.toISOString().slice(0, 10)}</span>
      </div>
    </div>
  );
};

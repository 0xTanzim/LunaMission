import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Table as TableIcon,
} from 'lucide-react';

import { TIME_WINDOW_OPTIONS, type TimeWindowHours } from '@/features/time/hooks/useTimeExplorerWindow';

const GROUP_BASE =
  'flex items-center gap-0.5 bg-[var(--lm-color-surface-raised)] p-0.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] shadow-xs';
const WINDOW_BUTTON_BASE =
  'px-2.5 py-1 text-xs font-mono rounded-[var(--lm-radius-xs)] transition-colors';
const STEP_BUTTON_BASE =
  'p-1.5 rounded-[var(--lm-radius-xs)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]';
const SPEED_BUTTON_BASE =
  'inline-flex min-h-6 min-w-6 items-center justify-center px-1.5 py-0.5 text-[11px] font-mono rounded-[var(--lm-radius-xs)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-info)]';

export interface TimeExplorerControlsProps {
  windowHours: TimeWindowHours;
  onWindowHoursChange: (hours: TimeWindowHours) => void;
  stepHours: number;
  onStepBackward: () => void;
  onStepForward: () => void;
  isPlaying: boolean;
  onTogglePlaying: () => void;
  playbackSpeed: 1 | 2 | 5;
  onSpeedChange: (speed: 1 | 2 | 5) => void;
  onResetToSelectedEpoch: () => void;
  showDataTable: boolean;
  onToggleDataTable: () => void;
}

/** Header, visible-interval selector and the transport row for the Time Explorer. */
export function TimeExplorerControls({
  windowHours,
  onWindowHoursChange,
  stepHours,
  onStepBackward,
  onStepForward,
  isPlaying,
  onTogglePlaying,
  playbackSpeed,
  onSpeedChange,
  onResetToSelectedEpoch,
  showDataTable,
  onToggleDataTable,
}: TimeExplorerControlsProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--lm-color-border-subtle)]">
      <div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--lm-color-sun)]" />
          <h2 className="text-sm font-semibold text-[var(--lm-color-text-primary)]">
            Time Explorer
          </h2>
          <span className="text-[11px] font-mono text-[var(--lm-color-selected-site)] bg-[var(--lm-color-surface-strong)] px-2 py-0.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-selected-site)]/40 font-semibold">
            Canonical UTC
          </span>
        </div>
        <p className="text-xs text-[var(--lm-color-text-muted)] mt-0.5 font-mono">
          Continuous Sun &amp; Earth topocentric elevation series • Scrub or step to inspect
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className={GROUP_BASE}>
          {TIME_WINDOW_OPTIONS.map(({ label, hours }) => (
            <button
              key={hours}
              type="button"
              onClick={() => onWindowHoursChange(hours)}
              className={`${WINDOW_BUTTON_BASE} ${
                windowHours === hours
                  ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] font-semibold shadow-xs'
                  : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-[var(--lm-color-surface-raised)] p-0.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] shadow-xs">
          <button
            type="button"
            onClick={onStepBackward}
            title={`Step back ${stepHours} hour(s)`}
            aria-label={`Step backward ${stepHours} hours`}
            className={STEP_BUTTON_BASE}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlaying}
            title={isPlaying ? 'Pause Simulation' : 'Play Continuous Simulation'}
            aria-label={isPlaying ? 'Pause Simulation' : 'Play Continuous Simulation'}
            className={`px-3 py-1 rounded-[var(--lm-radius-xs)] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border border-[var(--lm-color-success)]/50'
                : 'text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-[var(--lm-color-success)]" /> : <Play className="w-3.5 h-3.5 text-[var(--lm-color-sun)]" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={onStepForward}
            title={`Step forward ${stepHours} hour(s)`}
            aria-label={`Step forward ${stepHours} hours`}
            className={STEP_BUTTON_BASE}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className={GROUP_BASE}>
          {([1, 2, 5] as const).map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onSpeedChange(spd)}
              title={`Playback speed ${spd}x`}
              className={`${SPEED_BUTTON_BASE} ${
                playbackSpeed === spd
                  ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-primary)] font-bold'
                  : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onResetToSelectedEpoch}
          title="Center time window on selected epoch"
          aria-label="Center on selected epoch"
          className="p-1.5 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleDataTable}
          title="Toggle Accessible Synchronized Data Table"
          aria-label="Toggle Data Table"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-[var(--lm-radius-sm)] border transition-colors ${
            showDataTable
              ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border-[var(--lm-color-selected-site)] font-semibold'
              : 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border)] hover:text-[var(--lm-color-text-primary)]'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Table</span>
        </button>
      </div>
    </div>
  );
}

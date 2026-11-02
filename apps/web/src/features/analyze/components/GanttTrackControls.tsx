import React from 'react';
import { Play, Pause } from 'lucide-react';

interface GanttTrackControlsProps {
  currentDateUtc: string;
  elapsedHours: number;
  totalHours: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  className?: string;
}

export const GanttTrackControls: React.FC<GanttTrackControlsProps> = ({
  currentDateUtc,
  elapsedHours,
  totalHours,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between bg-[var(--lm-color-canvas)] p-2.5 rounded-t-lg border-b border-[var(--lm-color-border-subtle)] text-xs font-mono ${className}`}>
      {/* Playback & Step Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStepBackward}
          aria-label="Step backward 1 hour"
          className="px-2.5 py-1.5 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] rounded focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[36px] min-w-[36px] flex items-center justify-center"
        >
          ⏮ -1h
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause timeline playback' : 'Play timeline forward'}
          className="px-3.5 py-1.5 bg-[var(--lm-color-info-surface-strong)] border border-[var(--lm-color-info)]/60 text-[var(--lm-color-info)] hover:bg-[var(--lm-color-info-surface-strong)] rounded font-bold focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[36px] min-w-[44px] flex items-center justify-center"
        >
          {isPlaying ? (
            <span className="inline-flex items-center gap-1">
              <Pause size={12} aria-hidden="true" />
              PAUSE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Play size={12} aria-hidden="true" />
              PLAY
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onStepForward}
          aria-label="Step forward 1 hour"
          className="px-2.5 py-1.5 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] rounded focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[36px] min-w-[36px] flex items-center justify-center"
        >
          +1h ⏭
        </button>
      </div>

      {/* Synchronized Playhead Telemetry */}
      <div className="flex items-center gap-4">
        <div className="text-[var(--lm-color-text-muted)]">
          EPOCH: <span className="text-[var(--lm-color-text-primary)] font-bold">{currentDateUtc}</span>
        </div>
        <div className="text-[var(--lm-color-text-muted)]">
          ELAPSED: <span className="text-[var(--lm-color-warning)] font-bold">{elapsedHours.toFixed(1)}</span> / {totalHours.toFixed(1)} h
        </div>
      </div>
    </div>
  );
};

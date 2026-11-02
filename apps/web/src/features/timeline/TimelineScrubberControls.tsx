import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { sharedPlayheadController } from '../../shared/animation/sharedPlayheadRef';

interface TimelineScrubberControlsProps {
  currentEpochMs: number;
  startEpochMs: number;
  endEpochMs: number;
  onEpochChange: (epochMs: number) => void;
  className?: string;
}

export const TimelineScrubberControls: React.FC<TimelineScrubberControlsProps> = ({
  currentEpochMs,
  startEpochMs,
  endEpochMs,
  onEpochChange,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        const next = currentEpochMs + 3600000 > endEpochMs ? startEpochMs : currentEpochMs + 3600000;
        sharedPlayheadController.write({ epochMs: next });
        onEpochChange(next);
      }, 250);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, currentEpochMs, startEpochMs, endEpochMs, onEpochChange]);

  const stepEpoch = (deltaMs: number) => {
    const next = Math.max(startEpochMs, Math.min(endEpochMs, currentEpochMs + deltaMs));
    sharedPlayheadController.write({ epochMs: next });
    onEpochChange(next);
  };

  const currentIso = new Date(currentEpochMs).toISOString().replace('.000Z', 'Z');

  return (
    <div
      role="toolbar"
      aria-label="Timeline Scrubber Playback Controls"
      className={`flex flex-wrap items-center justify-between gap-3 bg-[var(--lm-color-canvas)] p-2 rounded-lg border border-[var(--lm-color-border-subtle)] text-xs font-mono ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause Playhead Animation' : 'Play Timeline Playhead Animation'}
          data-testid="timeline-play-btn"
          className="px-3 py-1.5 rounded bg-[var(--lm-color-info-fill)] hover:bg-[var(--lm-color-info-fill-hover)] text-[var(--lm-color-text-primary)] font-bold transition-colors min-h-[36px] min-w-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
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
          onClick={() => stepEpoch(-3600000)}
          aria-label="Step Backward 1 Hour"
          className="px-2.5 py-1.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
        >
          −1h
        </button>
        <button
          type="button"
          onClick={() => stepEpoch(-600000)}
          aria-label="Step Backward 10 Minutes"
          className="px-2.5 py-1.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
        >
          −10m
        </button>
        <button
          type="button"
          onClick={() => stepEpoch(600000)}
          aria-label="Step Forward 10 Minutes"
          className="px-2.5 py-1.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
        >
          +10m
        </button>
        <button
          type="button"
          onClick={() => stepEpoch(3600000)}
          aria-label="Step Forward 1 Hour"
          className="px-2.5 py-1.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] min-h-[36px] min-w-[36px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
        >
          +1h
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[var(--lm-color-text-muted)] font-semibold uppercase text-[11px]">Playhead:</span>
        <span className="text-[var(--lm-color-warning)] font-bold bg-[var(--lm-color-surface)] px-2.5 py-1 rounded border border-[var(--lm-color-border-subtle)]">
          {currentIso}
        </span>
      </div>
    </div>
  );
};

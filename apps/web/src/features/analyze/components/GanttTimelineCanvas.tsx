import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';
import { sharedPlayheadController } from '../../../shared/animation/sharedPlayheadRef';

interface GanttTimelineCanvasProps {
  intervals: EvaluatedSubInterval[];
  eventWhiskers?: EventWhisker[];
  startEpochMs: number;
  stopEpochMs: number;
  currentPlayheadEpochMs: number;
  onPlayheadChange: (epochMs: number) => void;
  className?: string;
}

export const GanttTimelineCanvas: React.FC<GanttTimelineCanvasProps> = ({
  intervals,
  eventWhiskers = [],
  startEpochMs,
  stopEpochMs,
  currentPlayheadEpochMs,
  onPlayheadChange,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const totalSpanMs = Math.max(1, stopEpochMs - startEpochMs);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#07090E';
    ctx.fillRect(0, 0, width, height);

    // Track 1: solar-disk visibility (y: 10, h: 28)
    // Track 2: Earth geometric LoS (y: 44, h: 28)
    // Track 3: concurrent geometric overlap (y: 78, h: 28)
    for (const int of intervals) {
      const sMs = new Date(int.startDateUtc).getTime();
      const eMs = new Date(int.endDateUtc).getTime();
      const xStart = Math.max(0, ((sMs - startEpochMs) / totalSpanMs) * width);
      const xEnd = Math.min(width, ((eMs - startEpochMs) / totalSpanMs) * width);
      const w = Math.max(1, xEnd - xStart);

      // Track 1: Sun
      if (int.sun.status === 'full_sun') ctx.fillStyle = '#F59E0B';
      else if (int.sun.status === 'partial_limb') ctx.fillStyle = '#D97706';
      else if (int.sun.status === 'terrain_shadow') ctx.fillStyle = '#1E293B';
      else ctx.fillStyle = '#020617';
      ctx.fillRect(xStart, 10, w, 28);

      // Track 2: Earth
      if (int.earth.status === 'visible' || int.earth.status === 'earth_direct') ctx.fillStyle = '#10B981';
      else if (int.earth.status === 'terrain_blocked' || int.earth.status === 'earth_occluded') ctx.fillStyle = '#881337';
      else ctx.fillStyle = '#0B0F19';
      ctx.fillRect(xStart, 44, w, 28);

      // Track 3: Overlap
      if (int.overlap.status === 'sun_and_earth') {
        ctx.fillStyle = '#06B6D4';
        ctx.fillRect(xStart, 78, w, 28);
      }
    }

    // Terrain sensitivity whiskers on event boundaries
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2;
    for (const whisker of eventWhiskers) {
      const nomX = ((whisker.eventEpochMs - startEpochMs) / totalSpanMs) * width;
      const lowMs = new Date(whisker.tLowDateUtc).getTime();
      const highMs = new Date(whisker.tHighDateUtc).getTime();
      const lowX = ((lowMs - startEpochMs) / totalSpanMs) * width;
      const highX = ((highMs - startEpochMs) / totalSpanMs) * width;

      ctx.beginPath();
      ctx.moveTo(lowX, 24);
      ctx.lineTo(highX, 24);
      // Whiskers end caps
      ctx.moveTo(lowX, 20); ctx.lineTo(lowX, 28);
      ctx.moveTo(highX, 20); ctx.lineTo(highX, 28);
      ctx.stroke();
    }

    // Playhead Scrubber Line
    const cursorX = Math.max(0, Math.min(width, ((currentPlayheadEpochMs - startEpochMs) / totalSpanMs) * width));
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();

    // Scrubber Head
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(cursorX - 5, 0);
    ctx.lineTo(cursorX + 5, 0);
    ctx.lineTo(cursorX, 8);
    ctx.closePath();
    ctx.fill();
  }, [intervals, eventWhiskers, startEpochMs, stopEpochMs, currentPlayheadEpochMs, totalSpanMs]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;
    const epochMs = startEpochMs + ratio * totalSpanMs;
    sharedPlayheadController.write({ epochMs });
    onPlayheadChange(epochMs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    let deltaMs = 0;
    if (e.key === 'ArrowRight') deltaMs = e.shiftKey ? 3600000 : 600000;
    else if (e.key === 'ArrowLeft') deltaMs = e.shiftKey ? -3600000 : -600000;
    else if (e.key === 'PageUp') deltaMs = 86400000;
    else if (e.key === 'PageDown') deltaMs = -86400000;
    else if (e.key === 'Home') deltaMs = startEpochMs - currentPlayheadEpochMs;
    else if (e.key === 'End') deltaMs = stopEpochMs - currentPlayheadEpochMs;
    else return;

    e.preventDefault();
    const nextEpoch = Math.max(startEpochMs, Math.min(stopEpochMs, currentPlayheadEpochMs + deltaMs));
    sharedPlayheadController.write({ epochMs: nextEpoch });
    onPlayheadChange(nextEpoch);
  };

  return (
    <div className={`relative bg-[var(--lm-color-canvas)] rounded-b-lg border border-[var(--lm-color-border-subtle)] overflow-hidden select-none ${className}`}>
      {/* Track Labels */}
      <div className="absolute top-2 left-2 z-10 space-y-5 text-[11px] font-mono font-bold tracking-wider pointer-events-none text-[var(--lm-color-text-muted)]">
        <div className="text-[var(--lm-color-warning)]">TRACK 1: SOLAR DISK</div>
        <div className="text-[var(--lm-color-success)]">TRACK 2: EARTH GEOM LoS</div>
        <div className="text-[var(--lm-color-info)]">TRACK 3: GEOM OVERLAP</div>
      </div>

      <canvas
        ref={canvasRef}
        width={1080}
        height={116}
        tabIndex={0}
        role="slider"
        aria-label="Interactive Multi-Track Gantt Timeline Scrubber (Use Arrow keys to scrub)"
        aria-valuemin={startEpochMs}
        aria-valuemax={stopEpochMs}
        aria-valuenow={currentPlayheadEpochMs}
        aria-valuetext={`Epoch: ${new Date(currentPlayheadEpochMs).toISOString()}`}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => { setIsDragging(true); handlePointer(e); }}
        onPointerMove={(e) => { if (isDragging) handlePointer(e); }}
        onPointerUp={() => setIsDragging(false)}
        className="w-full h-[116px] block cursor-ew-resize touch-none focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
      />
    </div>
  );
};

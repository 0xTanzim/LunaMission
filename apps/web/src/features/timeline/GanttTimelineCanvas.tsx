import React, { useRef, useEffect, useCallback } from 'react';
import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';
import {
  TOTAL_TIMELINE_HEIGHT_PX,
  pixelXToEpoch,
  drawTimelineHeader,
  drawIntervalTracks,
  drawEventWhiskers,
  drawPlayheadScrubber,
} from './ganttTrackRenderer';
import { sharedPlayheadController } from '../../shared/animation/sharedPlayheadRef';
import { useScenarioState } from '../../app/state/useScenarioState';
import { TimelineScrubberControls } from './TimelineScrubberControls';
import { LaunchSlipSlider } from './LaunchSlipSlider';

interface GanttTimelineCanvasProps {
  intervals?: EvaluatedSubInterval[];
  eventWhiskers?: EventWhisker[];
  startUtc: string;
  stopUtc: string;
  className?: string;
}

export const GanttTimelineCanvas: React.FC<GanttTimelineCanvasProps> = ({
  intervals = [],
  eventWhiskers = [],
  startUtc,
  stopUtc,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const { state, setPlayheadUtc, setLaunchSlip } = useScenarioState();

  const startEpochMs = new Date(startUtc).getTime();
  const endEpochMs = new Date(stopUtc).getTime();
  const currentEpochMs = new Date(state.activePlayheadUtc).getTime();

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dim = {
      width: canvas.width,
      startEpochMs,
      endEpochMs,
    };

    ctx.clearRect(0, 0, dim.width, TOTAL_TIMELINE_HEIGHT_PX);
    drawTimelineHeader(ctx, dim);
    drawIntervalTracks(ctx, dim, intervals);
    drawEventWhiskers(ctx, dim, eventWhiskers);
    drawPlayheadScrubber(ctx, dim, currentEpochMs);
  }, [intervals, eventWhiskers, startEpochMs, endEpochMs, currentEpochMs]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = TOTAL_TIMELINE_HEIGHT_PX;
        renderFrame();
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [renderFrame]);

  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    handlePointerMove(e);
  };

  const syncPlayheadTelemetry = (epochMs: number) => {
    sharedPlayheadController.write({ epochMs });
    const activeInt = intervals.find((int) => epochMs >= int.startEpochMs && epochMs <= int.endEpochMs);
    if (activeInt) {
      sharedPlayheadController.write({
        sunAzimuthDeg: activeInt.sun.meanAzimuthDeg,
        sunElevationDeg: activeInt.sun.meanElevationDeg,
        earthAzimuthDeg: activeInt.earth.meanAzimuthDeg,
        earthElevationDeg: activeInt.earth.meanElevationDeg,
        blockerAzimuthDeg: activeInt.sun.blocker?.azimuthDeg ?? -1,
        blockerDistanceKm: activeInt.sun.blocker?.distanceKm ?? 0,
      });
    }
    setPlayheadUtc(new Date(epochMs).toISOString());
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current && e.type !== 'click') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dim = { width: canvas.width, startEpochMs, endEpochMs };
    const epochMs = pixelXToEpoch(x, dim);
    syncPlayheadTelemetry(epochMs);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    let deltaMs = 0;
    if (e.key === 'ArrowRight') deltaMs = e.shiftKey ? 3600000 : 600000;
    else if (e.key === 'ArrowLeft') deltaMs = e.shiftKey ? -3600000 : -600000;
    else if (e.key === 'PageUp') deltaMs = 86400000;
    else if (e.key === 'PageDown') deltaMs = -86400000;
    else if (e.key === 'Home') deltaMs = startEpochMs - currentEpochMs;
    else if (e.key === 'End') deltaMs = endEpochMs - currentEpochMs;
    else return;

    e.preventDefault();
    const nextEpoch = Math.max(startEpochMs, Math.min(endEpochMs, currentEpochMs + deltaMs));
    syncPlayheadTelemetry(nextEpoch);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-3 w-full rounded-lg bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] p-3 shadow-md ${className}`}
    >
      <div className="flex items-center justify-between pb-1 border-b border-[var(--lm-color-border-subtle)]/80">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--lm-color-text-primary)] text-sm font-mono tracking-wider">
            OPERATIONAL MULTI-TRACK GANTT TIMELINE
          </h3>
          <span className="text-[11px] text-[var(--lm-color-info)] font-mono px-1.5 py-0.5 rounded bg-[var(--lm-color-info-surface-strong)] border border-[var(--lm-color-info-border)]">
            TERRAIN SENSITIVITY WHISKERS
          </span>
        </div>
        <div className="text-[11px] font-mono text-[var(--lm-color-text-muted)]">
          Solar Disk Visibility • Earth Geometric LoS • Concurrent Overlap
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)] cursor-ew-resize">
        <canvas
          ref={canvasRef}
          height={TOTAL_TIMELINE_HEIGHT_PX}
          tabIndex={0}
          role="slider"
          aria-label="Interactive Multi-Track Gantt Timeline Scrubber (Use Arrow keys to scrub)"
          aria-valuemin={startEpochMs}
          aria-valuemax={endEpochMs}
          aria-valuenow={currentEpochMs}
          aria-valuetext={`Epoch: ${state.activePlayheadUtc}`}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          data-testid="gantt-timeline-canvas"
          className="w-full block touch-none focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
        />
      </div>

      <TimelineScrubberControls
        currentEpochMs={currentEpochMs}
        startEpochMs={startEpochMs}
        endEpochMs={endEpochMs}
        onEpochChange={syncPlayheadTelemetry}
      />

      <LaunchSlipSlider
        launchSlipOffsetDays={state.launchSlipOffsetDays}
        onLaunchSlipChange={setLaunchSlip}
        nominalStartUtc={startUtc}
        nominalStopUtc={stopUtc}
      />
    </div>
  );
};

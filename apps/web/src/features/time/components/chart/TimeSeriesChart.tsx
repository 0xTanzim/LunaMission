import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import type { TimelineDataPoint } from '@/domain/celestial/timeline';

import { TimeChartTooltip } from '@/features/time/components/chart/TimeChartTooltip';
import { TimeEpochCursor } from '@/features/time/components/chart/TimeEpochCursor';
import { TimeSeriesPlot } from '@/features/time/components/chart/TimeSeriesPlot';
import {
  epochFromClientX,
  nextHoveredIndex,
  TIME_CHART_HEIGHT,
  TIME_CHART_WIDTH,
} from '@/features/time/model/chart/timeChartGeometry';

export interface TimeSeriesChartProps {
  points: TimelineDataPoint[];
  windowHours: number;
  stepHours: number;
  currentEpochMs: number;
  currentIsoUtc: string;
  instantSunElevationDeg: number | null;
  instantEarthElevationDeg: number | null;
  onScrubToEpoch: (epochMs: number) => void;
}

/**
 * Scrubbable Sun/Earth elevation chart. The axis maths lives in
 * `timeChartGeometry.ts` and the markup in `TimeSeriesPlot`, `TimeEpochCursor`
 * and `TimeChartTooltip`; this component owns the svg frame, the pointer
 * gestures, and the hover highlight they drive.
 */
export function TimeSeriesChart({
  points,
  windowHours,
  stepHours,
  currentEpochMs,
  currentIsoUtc,
  instantSunElevationDeg,
  instantEarthElevationDeg,
  onScrubToEpoch,
}: TimeSeriesChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const firstPointMs = points.length > 0 ? points[0].epochMs : currentEpochMs;
  const lastPointMs = points.length > 0 ? points[points.length - 1].epochMs : currentEpochMs;
  const activeTooltipPoint = hoveredIndex !== null ? points[hoveredIndex] ?? null : null;

  const scrubToClientX = (clientX: number, rect: DOMRect) =>
    onScrubToEpoch(
      epochFromClientX(clientX, rect.left, rect.width, firstPointMs, lastPointMs, stepHours),
    );

  const handlePointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    setIsScrubbing(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) scrubToClientX(e.clientX, rect);
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredIndex((previous) =>
      nextHoveredIndex(e.clientX, rect.left, rect.width, points.length, previous),
    );
    if (isScrubbing) scrubToClientX(e.clientX, rect);
  };

  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    setIsScrubbing(false);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="relative w-full bg-[var(--lm-color-canvas)] rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] p-2 overflow-x-auto shadow-inner">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${TIME_CHART_WIDTH} ${TIME_CHART_HEIGHT}`}
        className="w-full min-w-[540px] h-48 sm:h-52 select-none cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setIsScrubbing(false);
          setHoveredIndex(null);
        }}
      >
        <TimeSeriesPlot points={points} windowHours={windowHours} hoveredIndex={hoveredIndex} />

        <TimeEpochCursor
          currentEpochMs={currentEpochMs}
          firstPointMs={firstPointMs}
          lastPointMs={lastPointMs}
          cursorDate={currentIsoUtc.substring(0, 10)}
          cursorClock={currentIsoUtc.substring(11, 19)}
          instantSunElevationDeg={instantSunElevationDeg}
          instantEarthElevationDeg={instantEarthElevationDeg}
        />
      </svg>

      {activeTooltipPoint && (
        <TimeChartTooltip
          point={activeTooltipPoint}
          firstPointMs={firstPointMs}
          lastPointMs={lastPointMs}
        />
      )}
    </div>
  );
}

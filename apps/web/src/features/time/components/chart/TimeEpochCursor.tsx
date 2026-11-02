import {
  cursorXForEpoch,
  elevationToY,
  PLOT_BOTTOM,
  PLOT_LEFT,
  PLOT_RIGHT,
  PLOT_TOP,
} from '@/features/time/model/chart/timeChartGeometry';
import {
  CURSOR_BADGE_CLAMP,
  CURSOR_BADGE_FILL,
  CURSOR_BADGE_HALF_WIDTH,
  CURSOR_MARKER_RADIUS,
} from '@/features/time/model/chart/timeChartStyles';

const BADGE_WIDTH = CURSOR_BADGE_HALF_WIDTH * 2;
const BADGE_HEIGHT = 18;
const BADGE_Y = -10;
const BADGE_BASELINE = 3;
const BADGE_FONT_SIZE = 11;
const CURSOR_LINE_TOP_OFFSET = 6;
const BADGE_TOP_OFFSET = 14;

export interface TimeEpochCursorProps {
  currentEpochMs: number;
  firstPointMs: number;
  lastPointMs: number;
  /** `YYYY-MM-DD` and `HH:MM:SS` halves of the canonical instant. */
  cursorDate: string;
  cursorClock: string;
  instantSunElevationDeg: number | null;
  instantEarthElevationDeg: number | null;
}

/** Vertical scanner marking the canonical epoch, with its glowing sample dots. */
export function TimeEpochCursor({
  currentEpochMs,
  firstPointMs,
  lastPointMs,
  cursorDate,
  cursorClock,
  instantSunElevationDeg,
  instantEarthElevationDeg,
}: TimeEpochCursorProps) {
  const x = cursorXForEpoch(currentEpochMs, firstPointMs, lastPointMs);
  const badgeX = Math.max(
    PLOT_LEFT + CURSOR_BADGE_CLAMP,
    Math.min(PLOT_RIGHT - CURSOR_BADGE_CLAMP, x),
  );

  return (
    <g className="cursor-line-group pointer-events-none">
      <line
        x1={x}
        y1={PLOT_TOP - CURSOR_LINE_TOP_OFFSET}
        x2={x}
        y2={PLOT_BOTTOM}
        stroke="var(--lm-color-selected-site)"
        strokeWidth="1.8"
        strokeDasharray="4 2"
      />

      {instantSunElevationDeg !== null && (
        <circle
          cx={x}
          cy={elevationToY(instantSunElevationDeg)}
          r={CURSOR_MARKER_RADIUS}
          fill="var(--lm-color-sun)"
          stroke="#ffffff"
          strokeWidth="2"
        />
      )}
      {instantEarthElevationDeg !== null && (
        <circle
          cx={x}
          cy={elevationToY(instantEarthElevationDeg)}
          r={CURSOR_MARKER_RADIUS}
          fill="var(--lm-color-earth)"
          stroke="#ffffff"
          strokeWidth="2"
        />
      )}

      <g transform={`translate(${badgeX}, ${PLOT_TOP - BADGE_TOP_OFFSET})`}>
        <rect
          x={-CURSOR_BADGE_HALF_WIDTH}
          y={BADGE_Y}
          width={BADGE_WIDTH}
          height={BADGE_HEIGHT}
          rx="3"
          fill={CURSOR_BADGE_FILL}
          stroke="var(--lm-color-selected-site)"
          strokeWidth="1.2"
        />
        <text
          x="0"
          y={BADGE_BASELINE}
          textAnchor="middle"
          fill="var(--lm-color-selected-site)"
          fontSize={BADGE_FONT_SIZE}
          fontWeight="bold"
          fontFamily="monospace"
        >
          {cursorDate} {cursorClock}
        </text>
      </g>
    </g>
  );
}

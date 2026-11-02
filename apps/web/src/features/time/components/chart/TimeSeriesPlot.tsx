import type { TimelineDataPoint } from '@/domain/celestial/timeline';

import {
  elevationToY,
  indexToX,
  PLOT_BOTTOM,
  PLOT_TOP,
  PLOT_LEFT,
  PLOT_RIGHT,
  PLOT_WIDTH,
  seriesPath,
  showTickAt,
  tickLabel,
  TIME_CHART_GRID_ELEV_DEG,
} from '@/features/time/model/chart/timeChartGeometry';
import {
  HOVERED_SAMPLE_RADIUS,
  SAMPLE_RADIUS,
  SAMPLE_STROKE_COLOR,
  SUB_HORIZON_FILL,
  ZERO_HORIZON_COLOR,
} from '@/features/time/model/chart/timeChartStyles';

const GRID_FONT_SIZE = 11;
const AXIS_LABEL_OFFSET = 8;
const AXIS_LABEL_BASELINE = 3.5;
const TICK_LINE_LENGTH = 5;
const TICK_LABEL_OFFSET = 18;

export interface TimeSeriesPlotProps {
  points: TimelineDataPoint[];
  windowHours: number;
  hoveredIndex: number | null;
}

/** Everything that follows from the samples: axis, series lines, points, ticks. */
export function TimeSeriesPlot({ points, windowHours, hoveredIndex }: TimeSeriesPlotProps) {
  const zeroY = elevationToY(0);
  const sunPath = seriesPath(points, (p) => p.sunElevationDeg);
  const earthPath = seriesPath(points, (p) => p.earthElevationDeg);

  return (
    <>
      {/* 1. Solar Operational Power Zone (>0°) tint */}
      <rect
        x={PLOT_LEFT}
        y={PLOT_TOP}
        width={PLOT_WIDTH}
        height={Math.max(0, zeroY - PLOT_TOP)}
        fill="#f59e0b"
        opacity="0.04"
      />

      {/* 2. Sub-Horizon Polar Darkness (<0°) background */}
      <rect
        x={PLOT_LEFT}
        y={zeroY}
        width={PLOT_WIDTH}
        height={Math.max(0, PLOT_BOTTOM - zeroY)}
        fill={SUB_HORIZON_FILL}
        opacity="0.90"
      />

      {TIME_CHART_GRID_ELEV_DEG.map((elev) => {
        const y = elevationToY(elev);
        const isZero = elev === 0;
        return (
          <g key={elev}>
            <line
              x1={PLOT_LEFT}
              y1={y}
              x2={PLOT_RIGHT}
              y2={y}
              stroke={isZero ? ZERO_HORIZON_COLOR : '#334155'}
              strokeWidth={isZero ? 1.8 : 0.75}
              strokeDasharray={isZero ? '6 4' : '3 3'}
              strokeOpacity={isZero ? 0.95 : 0.55}
            />
            <text
              x={PLOT_LEFT - AXIS_LABEL_OFFSET}
              y={y + AXIS_LABEL_BASELINE}
              textAnchor="end"
              fill={isZero ? ZERO_HORIZON_COLOR : '#cbd5e1'}
              fontSize="11"
              fontWeight={isZero ? 'bold' : '600'}
              fontFamily="monospace"
            >
              {elev > 0 ? `+${elev}°` : `${elev}°`}
            </text>
          </g>
        );
      })}

      <text
        x={PLOT_RIGHT - AXIS_LABEL_OFFSET}
        y={zeroY - 6}
        textAnchor="end"
        fill={ZERO_HORIZON_COLOR}
        fontSize="11"
        fontWeight="bold"
        fontFamily="monospace"
        opacity="0.95"
      >
        0° Local Horizon (Sun &amp; Earth geometric LoS threshold)
      </text>

      <path
        d={sunPath}
        fill="none"
        stroke="var(--lm-color-sun)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <path
        d={earthPath}
        fill="none"
        stroke="var(--lm-color-earth)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((p, idx) => {
        const x = indexToX(idx, points.length);
        const isHovered = hoveredIndex === idx;
        const radius = isHovered ? HOVERED_SAMPLE_RADIUS : SAMPLE_RADIUS;
        const strokeWidth = isHovered ? 1.5 : 0.8;
        return (
          <g key={p.timestampUtc}>
            {p.sunElevationDeg !== null && (
              <circle
                cx={x}
                cy={elevationToY(p.sunElevationDeg)}
                r={radius}
                fill="var(--lm-color-sun)"
                stroke={SAMPLE_STROKE_COLOR}
                strokeWidth={strokeWidth}
                className="transition-all"
              />
            )}
            {p.earthElevationDeg !== null && (
              <circle
                cx={x}
                cy={elevationToY(p.earthElevationDeg)}
                r={radius}
                fill="var(--lm-color-earth)"
                stroke={SAMPLE_STROKE_COLOR}
                strokeWidth={strokeWidth}
                className="transition-all"
              />
            )}

            {showTickAt(idx, points.length, windowHours) && (
              <g>
                <line
                  x1={x}
                  y1={PLOT_BOTTOM}
                  x2={x}
                  y2={PLOT_BOTTOM + TICK_LINE_LENGTH}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <text
                  x={x}
                  y={PLOT_BOTTOM + TICK_LABEL_OFFSET}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {tickLabel(p, windowHours)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </>
  );
}

import React from 'react';
import { DEFAULT_PROJECTION_CONFIG } from '@/domain/coordinates/projection';

export interface MapGridLayerProps {
  showGrid: boolean;
  zoom: number;
  /** Layer opacity from the compositor; the graticule defaults to a recessive 0.85. */
  opacity?: number;
}

/**
 * Selenographic Coordinate Graticule for the Lunar South Pole (83°S–90°S).
 * Conforms to IAU/IAG mean Earth/polar axis reference convention.
 * Concentric circles: 88°S, 86°S, 84°S.
 * Radial spokes: 0° (To Earth/Prime Meridian), 90°E, 180°, 270°E.
 */
export function MapGridLayer({ showGrid, zoom, opacity = 0.85 }: MapGridLayerProps) {
  if (!showGrid) return null;

  const { center: CENTER, maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;
  const DEG_SPAN = 7; // From 90°S to 83°S

  return (
    <g className="map-grid-layer select-none pointer-events-none" opacity={opacity}>
      {/* Concentric Latitude Rings */}
      <g className="grid-latitudes" stroke="var(--lm-color-border-subtle)" strokeDasharray="3 4" fill="none">
        {/* 88°S */}
        <circle cx={CENTER} cy={CENTER} r={(2 / DEG_SPAN) * MAX_RADIUS} strokeWidth="0.8" />
        <text
          x={CENTER + 4}
          y={CENTER - (2 / DEG_SPAN) * MAX_RADIUS + 9}
          fill="#94a3b8"
          fontSize="11"
          fontWeight="500"
          fontFamily="monospace"
        >
          88°S
        </text>

        {/* 86°S */}
        <circle cx={CENTER} cy={CENTER} r={(4 / DEG_SPAN) * MAX_RADIUS} strokeWidth="0.8" />
        <text
          x={CENTER + 4}
          y={CENTER - (4 / DEG_SPAN) * MAX_RADIUS + 9}
          fill="#94a3b8"
          fontSize="11"
          fontWeight="500"
          fontFamily="monospace"
        >
          86°S
        </text>

        {/* 84°S */}
        <circle cx={CENTER} cy={CENTER} r={(6 / DEG_SPAN) * MAX_RADIUS} strokeWidth="0.8" />
        <text
          x={CENTER + 4}
          y={CENTER - (6 / DEG_SPAN) * MAX_RADIUS + 9}
          fill="#94a3b8"
          fontSize="11"
          fontWeight="500"
          fontFamily="monospace"
        >
          84°S
        </text>

        {/* 83.0°S Polar Map Sheet Limit */}
        <circle cx={CENTER} cy={CENTER} r={MAX_RADIUS} stroke="var(--lm-color-border-subtle)" strokeWidth="0.8" />
        <text
          x={CENTER + 4}
          y={CENTER - MAX_RADIUS + 10}
          fill="#38bdf8"
          fontSize="11"
          fontWeight="600"
          fontFamily="monospace"
          opacity={0.85}
        >
          83.0°S (Polar Map Limit)
        </text>
      </g>

      {/* Meridian Spokes */}
      <g className="grid-meridians" stroke="var(--lm-color-border-subtle)" strokeWidth="0.75" strokeDasharray="2 4">
        {/* 0° Prime Meridian (Pointing UP towards Earth) */}
        <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - MAX_RADIUS} />
        <text
          x={CENTER + 4}
          y={CENTER - MAX_RADIUS + 12}
          fill="#cbd5e1"
          fontSize="11"
          fontWeight="600"
          fontFamily="monospace"
        >
          0° (To Earth)
        </text>

        {/* 90° East */}
        <line x1={CENTER} y1={CENTER} x2={CENTER + MAX_RADIUS} y2={CENTER} />
        <text
          x={CENTER + MAX_RADIUS - 28}
          y={CENTER - 5}
          fill="#94a3b8"
          fontSize="11"
          fontFamily="monospace"
        >
          90°E
        </text>

        {/* 180° Meridian (Far Side) */}
        <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER + MAX_RADIUS} />
        <text
          x={CENTER + 4}
          y={CENTER + MAX_RADIUS - 6}
          fill="#94a3b8"
          fontSize="11"
          fontFamily="monospace"
        >
          180°
        </text>

        {/* 270° East (90° West) */}
        <line x1={CENTER} y1={CENTER} x2={CENTER - MAX_RADIUS} y2={CENTER} />
        <text
          x={CENTER - MAX_RADIUS + 6}
          y={CENTER - 5}
          fill="#94a3b8"
          fontSize="11"
          fontFamily="monospace"
        >
          270°E
        </text>
      </g>

      {/* Exact South Pole (90.0°S) Datum Marker */}
      <circle cx={CENTER} cy={CENTER} r="2.5" fill="#ffffff" opacity="0.9" />
      <text
        x={CENTER + 5}
        y={CENTER + 3}
        fill="#ffffff"
        fontSize="11"
        fontWeight="600"
        fontFamily="monospace"
      >
        90.0°S
      </text>
    </g>
  );
}

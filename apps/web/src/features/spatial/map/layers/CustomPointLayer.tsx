import React from 'react';
import { ProjectedPoint } from '@/domain/coordinates/projection';

export interface CustomPointLayerProps {
  customPos: ProjectedPoint | null;
  selectedSitePos: ProjectedPoint;
  distanceKm: number | null;
}

/**
 * Visual indicator for custom-clicked coordinates on the polar stereographic map.
 */
export function CustomPointLayer({
  customPos,
  selectedSitePos,
  distanceKm,
}: CustomPointLayerProps) {
  if (!customPos) return null;

  return (
    <g className="custom-point-layer select-none pointer-events-none">
      {/* Target Reticle Pin */}
      <circle
        cx={customPos.x}
        cy={customPos.y}
        r="11"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />
      <circle
        cx={customPos.x}
        cy={customPos.y}
        r="3.5"
        fill="#f59e0b"
        stroke="#ffffff"
        strokeWidth="1.0"
      />

      {/* Geodesic Distance Baseline to Selected Candidate */}
      {distanceKm !== null && (
        <g className="distance-baseline">
          <line
            x1={selectedSitePos.x}
            y1={selectedSitePos.y}
            x2={customPos.x}
            y2={customPos.y}
            stroke="#f59e0b"
            strokeWidth="1.0"
            strokeDasharray="2 3"
            opacity="0.7"
          />
          <text
            x={(selectedSitePos.x + customPos.x) / 2}
            y={(selectedSitePos.y + customPos.y) / 2 - 3}
            textAnchor="middle"
            fill="#f59e0b"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {distanceKm > 250 ? `${distanceKm.toFixed(1)} km (Geodesic)` : `${distanceKm.toFixed(1)} km`}
          </text>
        </g>
      )}
    </g>
  );
}

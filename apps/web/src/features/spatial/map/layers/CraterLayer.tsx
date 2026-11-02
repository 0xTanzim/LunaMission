import React from 'react';
import { projectLatLon, DEFAULT_PROJECTION_CONFIG } from '@/domain/coordinates/projection';

export interface CraterFeature {
  name: string;
  lat: number;
  lon: number;
  diameterKm: number;
  hasPsr: boolean;
  isMajor: boolean;
}

export const CRATERS: CraterFeature[] = [
  { name: 'Shackleton', lat: -89.9, lon: 0, diameterKm: 21, hasPsr: true, isMajor: true },
  { name: 'de Gerlache', lat: -88.5, lon: 271.4, diameterKm: 32, hasPsr: true, isMajor: true },
  { name: 'Shoemaker', lat: -88.1, lon: 45, diameterKm: 50, hasPsr: true, isMajor: false },
  { name: 'Faustini', lat: -87.3, lon: 77, diameterKm: 39, hasPsr: true, isMajor: false },
  { name: 'Haworth', lat: -87.4, lon: 355, diameterKm: 35, hasPsr: true, isMajor: false },
  { name: 'Nobile', lat: -85.2, lon: 53.5, diameterKm: 73, hasPsr: true, isMajor: false },
  { name: 'Amundsen', lat: -84.5, lon: 82.8, diameterKm: 105, hasPsr: true, isMajor: true },
  { name: 'Malapert', lat: -84.9, lon: 12.9, diameterKm: 69, hasPsr: false, isMajor: true },
];

const { maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;
const DEG_SPAN = 7;
const KM_PER_DEG = 30.3;

/** Rim radius in viewBox units for a crater footprint. Shared with the PSR overlay. */
export function craterRadiusUnits(diameterKm: number): number {
  return Math.max(7, (diameterKm / 2 / KM_PER_DEG / DEG_SPAN) * MAX_RADIUS);
}

export interface CraterLayerProps {
  visible: boolean;
  zoom: number;
  opacity?: number;
}

/**
 * Crater rim footprints and names. Draws only rims: the permanently shadowed terrain
 * inside a floor is the `psr` overlay, so either can be switched without the other.
 *
 * Progressive disclosure: secondary crater labels appear once the view is close enough
 * to read them.
 */
export function CraterLayer({ visible, zoom, opacity = 1 }: CraterLayerProps) {
  if (!visible) return null;

  return (
    <g className="craters-layer select-none pointer-events-none" opacity={opacity}>
      {CRATERS.map((crater) => {
        const pos = projectLatLon(crater.lat, crater.lon);
        const radiusPx = craterRadiusUnits(crater.diameterKm);
        const showLabel = crater.isMajor || zoom >= 1.3;

        return (
          <g key={crater.name} className="crater-feature">
            <circle
              cx={pos.x}
              cy={pos.y}
              r={radiusPx}
              fill="none"
              stroke="#1b2a3d"
              strokeWidth="0.75"
              strokeOpacity="0.75"
            />

            {showLabel && (
              <text
                x={pos.x}
                y={pos.y + radiusPx + 8}
                textAnchor="middle"
                fill="#8fa2b8"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="500"
                letterSpacing="0.04em"
                opacity={crater.isMajor ? 0.92 : 0.75}
                className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              >
                {crater.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

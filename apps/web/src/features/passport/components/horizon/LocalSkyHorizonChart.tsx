import React from 'react';
import type { CalculationMode } from '@/domain/celestial/calculationMode';
import {
  COMPACT_TERRAIN_STEPS,
  HORIZON_ELEV_GRID_DEG,
  compactFrame,
  terrainSilhouettePath,
} from '@/features/passport/model/localSkyGeometry';
import { type LocalSkyReadouts, type SkyMarker } from '@/features/passport/model/localSkyReadouts';
import { LocalSkyHorizonMarkers } from '@/features/passport/components/horizon/LocalSkyHorizonMarkers';

/**
 * Compact azimuth/elevation strip shown inside the Passport card. Same topocentric
 * frame as the inspector, drawn at a smaller extent.
 */

const AZIMUTH_TICKS = [
  { label: 'N (0°)', az: 0 },
  { label: 'E (90°)', az: 90 },
  { label: 'S (180°)', az: 180 },
  { label: 'W (270°)', az: 270 },
  { label: 'N (360°)', az: 360 },
] as const;

const ZERO_HORIZON_COLOR = '#70D6C5';

interface LocalSkyHorizonChartProps {
  readouts: LocalSkyReadouts;
  calculationMode: CalculationMode;
  selectedMarker: SkyMarker | null;
  onSelectMarker: (marker: SkyMarker) => void;
}

export function LocalSkyHorizonChart({
  readouts,
  calculationMode,
  selectedMarker,
  onSelectMarker,
}: LocalSkyHorizonChartProps) {
  const terrainPath = terrainSilhouettePath(compactFrame, {
    mode: calculationMode,
    meanTerrainHorizonDeg: readouts.meanTerrainHorizonDeg,
    maxTerrainObstructionDeg: readouts.maxTerrainObstructionDeg,
    steps: COMPACT_TERRAIN_STEPS,
  });

  return (
    <div className="w-full overflow-hidden bg-[var(--lm-color-canvas)] rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] p-1">
      <svg
        viewBox={`0 0 ${compactFrame.viewBoxW} ${compactFrame.viewBoxH}`}
        className="w-full h-auto select-none overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="local-terrain-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e2c3f" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0d1420" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb830" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#ffb830" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffb830" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="earth-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8ccbff" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#8ccbff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8ccbff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Elevation Horizontal Grid Lines */}
        {HORIZON_ELEV_GRID_DEG.map((deg) => {
          const y = compactFrame.elevToY(deg);
          const isZero = deg === 0;
          return (
            <g key={deg}>
              <line
                x1={compactFrame.padLeft}
                y1={y}
                x2={compactFrame.plotRight}
                y2={y}
                stroke={isZero ? ZERO_HORIZON_COLOR : 'var(--lm-color-border-subtle)'}
                strokeWidth={isZero ? 1.2 : 0.8}
                strokeDasharray={isZero ? '4 3' : '2 3'}
                strokeOpacity={isZero ? 0.75 : 0.4}
              />
              <text
                x={compactFrame.padLeft - 6}
                y={y + 3}
                textAnchor="end"
                fill={isZero ? ZERO_HORIZON_COLOR : 'var(--lm-color-text-muted)'}
                fontSize="11"
                fontFamily="monospace"
              >
                {deg > 0 ? `+${deg}°` : `${deg}°`}
              </text>
            </g>
          );
        })}

        {/* 0° Spherical Horizon Label */}
        <text
          x={compactFrame.plotRight - 6}
          y={compactFrame.zeroY - 4}
          textAnchor="end"
          fill={ZERO_HORIZON_COLOR}
          fontSize="11"
          fontFamily="monospace"
          opacity="0.8"
        >
          Ideal 0° Spherical Horizon
        </text>

        {/* Shaded Subsurface / Terrain Silhouette */}
        <path d={terrainPath} fill="url(#local-terrain-grad)" />

        {/* Azimuth Vertical Grid Lines & Cardinal Labels */}
        {AZIMUTH_TICKS.map(({ label, az }) => {
          const x = compactFrame.azToX(az);
          return (
            <g key={label}>
              <line
                x1={x}
                y1={compactFrame.padTop}
                x2={x}
                y2={compactFrame.plotBottom}
                stroke="var(--lm-color-border-subtle)"
                strokeWidth="0.8"
                strokeDasharray="2 2"
                strokeOpacity="0.4"
              />
              <text
                x={x}
                y={compactFrame.plotBottom + 14}
                textAnchor="middle"
                fill="var(--lm-color-text-muted)"
                fontSize="11"
                fontFamily="monospace"
              >
                {label}
              </text>
            </g>
          );
        })}

        <LocalSkyHorizonMarkers
          readouts={readouts}
          selectedMarker={selectedMarker}
          onSelectMarker={onSelectMarker}
        />
      </svg>
    </div>
  );
}

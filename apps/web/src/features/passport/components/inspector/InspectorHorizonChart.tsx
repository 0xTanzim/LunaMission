import React, { type CSSProperties } from 'react';
import type { CalculationMode } from '@/domain/celestial/calculationMode';
import {
  EXPANDED_TERRAIN_STEPS,
  HORIZON_ELEV_GRID_DEG,
  expandedFrame,
  terrainSilhouettePath,
} from '@/features/passport/model/localSkyGeometry';
import { type LocalSkyReadouts, type SkyMarker } from '@/features/passport/model/localSkyReadouts';
import { InspectorHorizonMarkers } from '@/features/passport/components/inspector/InspectorHorizonMarkers';

/**
 * Expanded horizon plot: elevation grid, terrain silhouette, azimuth ticks and the
 * clickable Sun/Earth markers. Zoom and pan are applied by the inspector viewport.
 */

const AZIMUTH_TICKS = [
  { label: 'N (0°)', az: 0 },
  { label: 'NE (45°)', az: 45 },
  { label: 'E (90°)', az: 90 },
  { label: 'SE (135°)', az: 135 },
  { label: 'S (180°)', az: 180 },
  { label: 'SW (225°)', az: 225 },
  { label: 'W (270°)', az: 270 },
  { label: 'NW (315°)', az: 315 },
  { label: 'N (360°)', az: 360 },
] as const;

const ZERO_HORIZON_COLOR = '#70D6C5';
const SUB_HORIZON_FILL = '#070c14';

interface InspectorHorizonChartProps {
  readouts: LocalSkyReadouts;
  calculationMode: CalculationMode;
  selectedTarget: SkyMarker | null;
  onSelectTarget: (marker: SkyMarker) => void;
  style: CSSProperties;
}

export function InspectorHorizonChart({
  readouts,
  calculationMode,
  selectedTarget,
  onSelectTarget,
  style,
}: InspectorHorizonChartProps) {
  const terrainPath = terrainSilhouettePath(expandedFrame, {
    mode: calculationMode,
    meanTerrainHorizonDeg: readouts.meanTerrainHorizonDeg,
    maxTerrainObstructionDeg: readouts.maxTerrainObstructionDeg,
    steps: EXPANDED_TERRAIN_STEPS,
  });

  return (
    <svg
      viewBox={`0 0 ${expandedFrame.viewBoxW} ${expandedFrame.viewBoxH}`}
      className="w-full h-auto min-h-[260px] select-none"
      style={style}
    >
      <defs>
        <linearGradient id="modal-terrain-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e2c3f" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#0a121c" stopOpacity="0.98" />
        </linearGradient>
        <radialGradient id="modal-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb830" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#ffb830" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffb830" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="modal-earth-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8ccbff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#8ccbff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8ccbff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sub-horizon Region Shading */}
      <rect
        x={expandedFrame.padLeft}
        y={expandedFrame.zeroY}
        width={expandedFrame.chartW}
        height={expandedFrame.plotBottom - expandedFrame.zeroY}
        fill={SUB_HORIZON_FILL}
        opacity="0.8"
      />

      {/* Elevation Horizontal Grid Lines */}
      {HORIZON_ELEV_GRID_DEG.map((deg) => {
        const y = expandedFrame.elevToY(deg);
        const isZero = deg === 0;
        return (
          <g key={deg}>
            <line
              x1={expandedFrame.padLeft}
              y1={y}
              x2={expandedFrame.plotRight}
              y2={y}
              stroke={isZero ? ZERO_HORIZON_COLOR : 'var(--lm-color-border-subtle)'}
              strokeWidth={isZero ? 1.5 : 0.8}
              strokeDasharray={isZero ? '5 3' : '2 3'}
              strokeOpacity={isZero ? 0.85 : 0.35}
            />
            <text
              x={expandedFrame.padLeft - 8}
              y={y + 3.5}
              textAnchor="end"
              fill={isZero ? ZERO_HORIZON_COLOR : 'var(--lm-color-text-muted)'}
              fontSize="11"
              fontWeight={isZero ? '600' : '400'}
              fontFamily="monospace"
            >
              {deg > 0 ? `+${deg}°` : `${deg}°`}
            </text>
          </g>
        );
      })}

      {/* 0° Reference Annotation */}
      <text
        x={expandedFrame.plotRight - 8}
        y={expandedFrame.zeroY - 5}
        textAnchor="end"
        fill={ZERO_HORIZON_COLOR}
        fontSize="11"
        fontWeight="bold"
        fontFamily="monospace"
      >
        0° Reference Horizon Plane
      </text>

      {/* Topographic Terrain Obstruction Silhouette */}
      <path d={terrainPath} fill="url(#modal-terrain-grad)" />

      {/* Azimuth Vertical Grid Lines & Cardinal Direction Labels */}
      {AZIMUTH_TICKS.map(({ label, az }) => {
        const x = expandedFrame.azToX(az);
        const isMajor = az % 90 === 0;
        return (
          <g key={label}>
            <line
              x1={x}
              y1={expandedFrame.padTop}
              x2={x}
              y2={expandedFrame.plotBottom}
              stroke="var(--lm-color-border-subtle)"
              strokeWidth={isMajor ? 1 : 0.6}
              strokeDasharray={isMajor ? '3 3' : '1 3'}
              strokeOpacity={isMajor ? 0.5 : 0.25}
            />
            <text
              x={x}
              y={expandedFrame.plotBottom + 18}
              textAnchor="middle"
              fill={isMajor ? 'var(--lm-color-text-primary)' : 'var(--lm-color-text-muted)'}
              fontSize={isMajor ? '11' : '11'}
              fontWeight={isMajor ? '600' : '400'}
              fontFamily="monospace"
            >
              {label}
            </text>
          </g>
        );
      })}

      <InspectorHorizonMarkers
        readouts={readouts}
        selectedTarget={selectedTarget}
        onSelectTarget={onSelectTarget}
      />
    </svg>
  );
}

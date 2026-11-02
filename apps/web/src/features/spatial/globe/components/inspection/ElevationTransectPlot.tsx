import React from 'react';
import { ElevationProfilePoint } from '@/domain/sites/scientificSiteInvestigation';

export interface ElevationTransectPlotProps {
  width: number;
  height: number;
  padLeft: number;
  plotW: number;
  plotH: number;
  padTop: number;
  maxD: number;
  maxE: number;
  minE: number;
  gridLevels: number[];
  polyPoints: string;
  pathD: string;
  profile: ElevationProfilePoint[];
  hoveredIdx: number | null;
  activePoint: ElevationProfilePoint | null;
  getX: (d: number) => number;
  getY: (e: number) => number;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerLeave: () => void;
}

export function ElevationTransectPlot({
  width,
  height,
  padLeft,
  plotW,
  plotH,
  padTop,
  maxD,
  maxE,
  minE,
  gridLevels,
  polyPoints,
  pathD,
  profile,
  hoveredIdx,
  activePoint,
  getX,
  getY,
  onPointerMove,
  onPointerLeave,
}: ElevationTransectPlotProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto text-[11px] font-mono overflow-visible cursor-crosshair select-none touch-none"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-label="Interactive Altimetric Transect Profile"
    >
      <defs>
        <linearGradient id="transectGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
          <stop offset="65%" stopColor="#0284c7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.10" />
        </linearGradient>
      </defs>

      {/* Elevation Grid Lines */}
      {gridLevels.map((lvl) => {
        const y = getY(lvl);
        const isZero = lvl === 0;
        return (
          <g key={lvl}>
            <line
              x1={padLeft}
              y1={y}
              x2={padLeft + plotW}
              y2={y}
              stroke={isZero ? '#94a3b8' : '#334155'}
              strokeDasharray={isZero ? '4,3' : '2,3'}
              strokeWidth={isZero ? '1.0' : '0.6'}
              strokeOpacity={isZero ? '0.85' : '0.45'}
            />
            <text x={padLeft - 4} y={y + 3} fill={isZero ? '#e2e8f0' : '#94a3b8'} textAnchor="end" fontSize="11">
              {lvl > 0 ? `+${(lvl / 1000).toFixed(1)}k` : `${(lvl / 1000).toFixed(1)}k`}
            </text>
          </g>
        );
      })}

      {/* Shaded Area Under Terrain */}
      <polygon points={polyPoints} fill="url(#transectGradient)" />

      {/* Topographic Surface Line */}
      <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.0" strokeLinejoin="round" />

      {/* Profile Points & Badges */}
      {profile.map((p, idx) => {
        const cx = getX(p.distanceKm);
        const cy = getY(p.elevationMeters);
        const isExtreme = p.elevationMeters === maxE || p.elevationMeters === minE;
        const isHovered = hoveredIdx === idx;
        return (
          <g key={idx}>
            <circle
              cx={cx}
              cy={cy}
              r={isHovered ? 4.5 : isExtreme ? 3.0 : 2.0}
              fill={p.elevationMeters === maxE ? '#34d399' : p.elevationMeters === minE ? '#f43f5e' : '#38bdf8'}
              stroke="#0f172a"
              strokeWidth={isHovered ? '1.5' : '0.8'}
            />
            {p.label && !isHovered && (
              <text
                x={cx}
                y={cy - 6}
                fill="#cbd5e1"
                textAnchor={idx === 0 ? 'start' : idx === profile.length - 1 ? 'end' : 'middle'}
                fontSize="11"
                fontWeight="600"
              >
                {p.label.split(' ')[0]}
              </text>
            )}
          </g>
        );
      })}

      {/* Hover Crosshair & Vertical Indicator */}
      {activePoint && (
        <g>
          <line
            x1={getX(activePoint.distanceKm)}
            y1={padTop}
            x2={getX(activePoint.distanceKm)}
            y2={padTop + plotH}
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeDasharray="3,2"
          />
          <circle
            cx={getX(activePoint.distanceKm)}
            cy={getY(activePoint.elevationMeters)}
            r="5"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
        </g>
      )}

      {/* X Axis Distance Scale */}
      <line
        x1={padLeft}
        y1={padTop + plotH}
        x2={padLeft + plotW}
        y2={padTop + plotH}
        stroke="#475569"
        strokeWidth="1.0"
      />
      <text x={padLeft} y={height - 8} fill="#94a3b8" textAnchor="start" fontSize="11">
        0 km
      </text>
      <text x={padLeft + plotW / 2} y={height - 8} fill="#64748b" textAnchor="middle" fontSize="11">
        Horizontal Transect Distance
      </text>
      <text x={padLeft + plotW} y={height - 8} fill="#94a3b8" textAnchor="end" fontSize="11">
        {maxD.toFixed(0)} km
      </text>

      {/* Color-Coded Traversability Footprint Band at bottom of plot */}
      <rect x={padLeft} y={padTop + plotH + 2} width={plotW * 0.45} height={3} fill="#10b981" opacity="0.8">
        <title>Safe Traversal (&lt;10°)</title>
      </rect>
      <rect x={padLeft + plotW * 0.45} y={padTop + plotH + 2} width={plotW * 0.3} height={3} fill="#f59e0b" opacity="0.8">
        <title>Moderate Slopes (10°-20°)</title>
      </rect>
      <rect x={padLeft + plotW * 0.75} y={padTop + plotH + 2} width={plotW * 0.25} height={3} fill="#ef4444" opacity="0.8">
        <title>Hazard Wall (&gt;20°)</title>
      </rect>
    </svg>
  );
}

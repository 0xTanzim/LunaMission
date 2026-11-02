import React from 'react';
import { DEFAULT_PROJECTION_CONFIG } from '@/domain/coordinates/projection';
import { CandidateSite } from '@/domain/sites/candidateSite';

export interface LocalHorizonReticleProps {
  visible: boolean;
  sitePos: { x: number; y: number };
  selectedSite: CandidateSite;
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  earthAzimuthDeg: number;
  earthElevationDeg: number;
  onOpenVectorPopover: (target: 'sun' | 'earth') => void;
}

/**
 * Topocentric Local-Horizon Direction Reticle.
 * Represents the observer's local-horizon horizontal plane centered strictly at the selected site.
 * Does NOT draw misleading global geographic paths across the lunar terrain.
 *
 * Geometric orientation:
 * - Local North points radially away from the Lunar South Pole (90°S) along the local meridian.
 * - Local Sun & Earth bearings are offset clockwise from local North by their topocentric azimuth.
 */
export function LocalHorizonReticle({
  visible,
  sitePos,
  selectedSite,
  sunAzimuthDeg,
  sunElevationDeg,
  earthAzimuthDeg,
  earthElevationDeg,
  onOpenVectorPopover,
}: LocalHorizonReticleProps) {
  if (!visible) return null;

  const { center: CENTER } = DEFAULT_PROJECTION_CONFIG;

  // Local North points away from South Pole (90°S) along local meridian
  const distFromPole = Math.hypot(sitePos.x - CENTER, sitePos.y - CENTER);
  const northAngleRad = distFromPole < 1.0 ? -Math.PI / 2 : Math.atan2(sitePos.y - CENTER, sitePos.x - CENTER);

  // Azimuths are measured clockwise from local North
  const sunAngleRad = northAngleRad + (sunAzimuthDeg * Math.PI) / 180;
  const earthAngleRad = northAngleRad + (earthAzimuthDeg * Math.PI) / 180;

  const RETICLE_RADIUS = 24;
  const sunX = sitePos.x + RETICLE_RADIUS * Math.cos(sunAngleRad);
  const sunY = sitePos.y + RETICLE_RADIUS * Math.sin(sunAngleRad);

  const earthX = sitePos.x + RETICLE_RADIUS * Math.cos(earthAngleRad);
  const earthY = sitePos.y + RETICLE_RADIUS * Math.sin(earthAngleRad);

  const isEarthVisible = earthElevationDeg > 0;

  return (
    <g className="local-horizon-reticle">
      {/* Local Horizon Compass Circle (Topocentric Datum) */}
      <circle
        cx={sitePos.x}
        cy={sitePos.y}
        r={RETICLE_RADIUS}
        fill="none"
        stroke="#33475e"
        strokeWidth="0.8"
        strokeDasharray="2 2"
        opacity="0.8"
      />

      {/* Local North Pointer */}
      <line
        x1={sitePos.x}
        y1={sitePos.y}
        x2={sitePos.x + (RETICLE_RADIUS + 4) * Math.cos(northAngleRad)}
        y2={sitePos.y + (RETICLE_RADIUS + 4) * Math.sin(northAngleRad)}
        stroke="#64748b"
        strokeWidth="1.0"
        opacity="0.75"
      />
      <text
        x={sitePos.x + (RETICLE_RADIUS + 8) * Math.cos(northAngleRad)}
        y={sitePos.y + (RETICLE_RADIUS + 8) * Math.sin(northAngleRad) + 2.5}
        textAnchor="middle"
        fill="#64748b"
        fontSize="11"
        fontWeight="600"
        fontFamily="monospace"
      >
        N
      </text>

      {/* Sun Topocentric Bearing Tick */}
      <line
        x1={sitePos.x}
        y1={sitePos.y}
        x2={sunX}
        y2={sunY}
        stroke="var(--lm-color-sun)"
        strokeWidth="1.6"
        opacity="0.95"
      />
      <g
        tabIndex={0}
        role="button"
        aria-label={`Sun vector bearing: azimuth ${sunAzimuthDeg.toFixed(1)}°, elevation ${sunElevationDeg.toFixed(1)}°`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenVectorPopover('sun');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onOpenVectorPopover('sun');
          }
        }}
        className="cursor-pointer focus:outline-none"
      >
        <circle cx={sunX} cy={sunY} r="7" fill="transparent" />
        <circle cx={sunX} cy={sunY} r="3" fill="var(--lm-color-sun)" stroke="#070b12" strokeWidth="0.8" />
      </g>

      {/* Earth Topocentric Bearing Tick */}
      <line
        x1={sitePos.x}
        y1={sitePos.y}
        x2={earthX}
        y2={earthY}
        stroke={isEarthVisible ? 'var(--lm-color-earth)' : '#f59e0b'}
        strokeWidth="1.6"
        strokeDasharray={isEarthVisible ? undefined : '2 2'}
        opacity="0.95"
      />
      <g
        tabIndex={0}
        role="button"
        aria-label={`Earth vector bearing: azimuth ${earthAzimuthDeg.toFixed(1)}°, elevation ${earthElevationDeg.toFixed(1)}°`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenVectorPopover('earth');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onOpenVectorPopover('earth');
          }
        }}
        className="cursor-pointer focus:outline-none"
      >
        <circle cx={earthX} cy={earthY} r="7" fill="transparent" />
        <circle
          cx={earthX}
          cy={earthY}
          r="3"
          fill={isEarthVisible ? 'var(--lm-color-earth)' : '#f59e0b'}
          stroke="#070b12"
          strokeWidth="0.8"
        />
      </g>
    </g>
  );
}

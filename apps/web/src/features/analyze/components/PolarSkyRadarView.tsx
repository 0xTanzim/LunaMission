import React from 'react';
import type { HorizonProfileBin } from '@luna/contracts';
import { PolarSkyRadarCanvas, type CelestialRadarPoint } from './PolarSkyRadarCanvas';

interface PolarSkyRadarViewProps {
  horizonBins: HorizonProfileBin[];
  sunPoint?: CelestialRadarPoint;
  earthPoint?: CelestialRadarPoint;
  sunTrajectory?: CelestialRadarPoint[];
  earthTrajectory?: CelestialRadarPoint[];
  targetSiteName: string;
  className?: string;
}

export const PolarSkyRadarView: React.FC<PolarSkyRadarViewProps> = ({
  horizonBins,
  sunPoint,
  earthPoint,
  sunTrajectory = [],
  earthTrajectory = [],
  targetSiteName,
  className = '',
}) => {
  return (
    <div
      role="region"
      aria-label={`Circular Polar Sky Radar for ${targetSiteName}`}
      data-testid="polar-sky-radar-view"
      className={`flex flex-col lg:flex-row items-center justify-center gap-6 p-4 bg-[var(--lm-color-canvas)]/90 border border-[var(--lm-color-border-subtle)] rounded-xl shadow-xl ${className}`}
    >
      {/* 1. Radar Circular Dome Canvas */}
      <div className="shrink-0 flex flex-col items-center">
        <PolarSkyRadarCanvas
          horizonBins={horizonBins}
          sunPoint={sunPoint}
          earthPoint={earthPoint}
          sunTrajectory={sunTrajectory}
          earthTrajectory={earthTrajectory}
        />
        <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] mt-2">
          Zenith (+90°) at center • Horizon (0°) at outer perimeter • North (000°) top
        </span>
      </div>

      {/* 2. Side Telemetry & Legend Card */}
      <div className="flex flex-col gap-3 max-w-sm w-full font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-2">
          <span className="font-bold text-[var(--lm-color-text-secondary)] uppercase tracking-wider text-xs">
            Polar Sky Dome Telemetry
          </span>
          <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] font-bold">
            R07 RADAR
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 bg-[var(--lm-color-surface)]/60 p-3 rounded-lg border border-[var(--lm-color-border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--lm-color-info)]/20 border border-[var(--lm-color-info)] shrink-0" />
            <span className="text-[var(--lm-color-text-secondary)]">Closed Cyan Line: LOLA Horizon Skyline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--lm-color-warning)] shrink-0" />
            <span className="text-[var(--lm-color-warning)]">Gold Circle: Sun Disk (Penumbral Grazing)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--lm-color-series-b)] shrink-0" />
            <span className="text-[var(--lm-color-series-b)]">Blue Circle: Earth Disk (Libration Loop)</span>
          </div>
        </div>

        {/* Current Active Celestial Coordinates */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--lm-color-surface)]/80 p-2.5 rounded border border-[var(--lm-color-warning-border)] flex flex-col">
            <span className="text-[11px] text-[var(--lm-color-warning)] uppercase font-bold">Solar Position</span>
            {sunPoint ? (
              <>
                <span className="text-[var(--lm-color-text-secondary)] font-bold">Az: {sunPoint.azimuthDeg.toFixed(1)}°</span>
                <span className="text-[var(--lm-color-text-secondary)]">El: {sunPoint.elevationDeg.toFixed(1)}°</span>
                {sunPoint.status && (
                  <span className="text-[11px] text-[var(--lm-color-success)] mt-1 font-semibold">{sunPoint.status}</span>
                )}
              </>
            ) : (
              <span className="text-[var(--lm-color-text-muted)]">Calculating...</span>
            )}
          </div>

          <div className="bg-[var(--lm-color-surface)]/80 p-2.5 rounded border border-[var(--lm-color-series-b-border)] flex flex-col">
            <span className="text-[11px] text-[var(--lm-color-series-b)] uppercase font-bold">Earth Position</span>
            {earthPoint ? (
              <>
                <span className="text-[var(--lm-color-text-secondary)] font-bold">Az: {earthPoint.azimuthDeg.toFixed(1)}°</span>
                <span className="text-[var(--lm-color-text-secondary)]">El: {earthPoint.elevationDeg.toFixed(1)}°</span>
                {earthPoint.status && (
                  <span className="text-[11px] text-[var(--lm-color-info)] mt-1 font-semibold">{earthPoint.status}</span>
                )}
              </>
            ) : (
              <span className="text-[var(--lm-color-text-muted)]">Calculating...</span>
            )}
          </div>
        </div>

        {/* Radar Invariant Notice */}
        <div className="p-2.5 bg-[var(--lm-color-surface)]/40 border border-[var(--lm-color-border-subtle)] rounded text-[11px] text-[var(--lm-color-text-muted)] leading-relaxed italic">
          Geometric Rule: When the celestial marker is inside the closed skyline polygon, it is physically elevated above surrounding mountain ridges (unobstructed line-of-sight).
        </div>
      </div>
    </div>
  );
};

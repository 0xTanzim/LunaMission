import React from 'react';
import { Sun, Globe as EarthIcon, Radio, Signal } from 'lucide-react';
import type { ResultAvailability } from '@/domain/celestial/availability';
import type { TopocentricAzimuthDeg, TopocentricElevationDeg } from '@/domain/coordinates/frames';
import { availableValue, angleParts, UNAVAILABLE_PLACEHOLDER } from '@/shared/formatting/availability';

export interface IntelTelemetryTabProps {
  sunElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  sunAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  earthElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  earthAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  rangeKm?: number;
  lightTimeSeconds?: number;
  isEarthSubHorizon?: boolean;
}

export function IntelTelemetryTab({
  sunElevationDeg,
  sunAzimuthDeg,
  earthElevationDeg,
  earthAzimuthDeg,
  rangeKm = 384400,
  lightTimeSeconds = 1.28,
  isEarthSubHorizon,
}: IntelTelemetryTabProps) {
  const sunElev = availableValue(sunElevationDeg);
  const sunAz = availableValue(sunAzimuthDeg);
  const earthElev = availableValue(earthElevationDeg);
  const earthAz = availableValue(earthAzimuthDeg);

  const sunElevParts = sunElev === null ? null : angleParts(sunElev, 2, true);
  const sunAzParts = sunAz === null ? null : angleParts(sunAz, 1);
  const earthElevParts = earthElev === null ? null : angleParts(earthElev, 2, true);
  const earthAzParts = earthAz === null ? null : angleParts(earthAz, 1);

  const isSunIlluminated = sunElev !== null && sunElev > 0;
  const isEarthVisible = earthElev !== null && earthElev > 0;

  return (
    <div className="flex flex-col gap-3 p-3 text-xs font-mono">
      {/* Sun Geometry Card */}
      <div className="p-3 rounded bg-[var(--lm-color-surface-strong)]/40 border border-[var(--lm-color-border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-1.5">
          <span className="flex items-center gap-1.5 text-[var(--lm-color-sun)] font-semibold">
            <Sun className="w-3.5 h-3.5" />
            <span>Topocentric Solar State</span>
          </span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${isSunIlluminated ? 'bg-[var(--lm-color-warning)]/20 text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)]/40' : 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-muted)] border border-[var(--lm-color-border)]'}`}>
            {isSunIlluminated ? 'Sunlit Peak' : 'Shadowed / Sub-Horizon'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">ELEVATION</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">
              {sunElevParts ? <>{sunElevParts.sign}{sunElevParts.digits}{sunElevParts.unit}</> : UNAVAILABLE_PLACEHOLDER}
            </span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">AZIMUTH (NORTH=0°)</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">
              {sunAzParts ? <>{sunAzParts.digits}{sunAzParts.unit}</> : UNAVAILABLE_PLACEHOLDER}
            </span>
          </div>
        </div>
      </div>

      {/* Earth Geometry Card */}
      <div className="p-3 rounded bg-[var(--lm-color-surface-strong)]/40 border border-[var(--lm-color-border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-1.5">
          <span className="flex items-center gap-1.5 text-[var(--lm-color-earth)] font-semibold">
            <EarthIcon className="w-3.5 h-3.5" />
            <span>Earth Geometric LoS</span>
          </span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${isEarthVisible ? 'bg-[var(--lm-color-info)]/20 text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/40' : 'bg-[var(--lm-color-danger)]/20 text-[var(--lm-color-danger)] border border-[var(--lm-color-danger)]/40'}`}>
            {isEarthVisible ? 'Above Local Horizon' : 'Sub-Horizon (Occulted)'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">EARTH ELEVATION</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">
              {earthElevParts ? <>{earthElevParts.sign}{earthElevParts.digits}{earthElevParts.unit}</> : UNAVAILABLE_PLACEHOLDER}
            </span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">EARTH AZIMUTH</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">
              {earthAzParts ? <>{earthAzParts.digits}{earthAzParts.unit}</> : UNAVAILABLE_PLACEHOLDER}
            </span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">VACUUM RANGE</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">{rangeKm.toLocaleString()} km</span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">ONE-WAY LIGHT TIME</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">{lightTimeSeconds.toFixed(2)} s</span>
          </div>
        </div>

        {!isEarthVisible && (
          <div className="text-[11px] font-sans text-[var(--lm-color-danger)]/90 bg-[var(--lm-color-danger-surface)] border border-[var(--lm-color-danger-border)] p-1.5 rounded">
            Geometric line-of-sight to Earth is obstructed by lunar terrain or far-side curvature at this
            epoch. A relay or store-and-forward strategy would be required for real-time contact. This is a
            geometry result: RF link closure depends on link margin, antenna pointing and ground-station
            scheduling, none of which is evaluated here.
          </div>
        )}
      </div>
    </div>
  );
}

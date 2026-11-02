import React from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { ResultAvailability } from '@/domain/celestial/availability';
import {
  angleParts,
  availableValue,
  UNAVAILABLE_PLACEHOLDER,
} from '@/shared/formatting/availability';
import { isOffMapPolarSite } from '@/features/spatial/map/model/candidatePinGeometry';
import { Sun, Globe as EarthIcon } from 'lucide-react';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
} from '@/domain/coordinates/frames';

export interface SiteTelemetryCardProps {
  site: CandidateSite;
  /** Topocentric horizon frame, not selenographic. */
  sunElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  sunAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  earthElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  earthAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  distanceFromPoleKm: number;
  visible?: boolean;
}

/**
 * Concise telemetry HUD overlay displayed on the 2D polar map.
 * Corresponds to Panels 3 & 6 in the LunaMission Storyboard.
 */
export function SiteTelemetryCard({
  site,
  sunElevationDeg,
  sunAzimuthDeg,
  earthElevationDeg,
  earthAzimuthDeg,
  distanceFromPoleKm,
  visible = true,
}: SiteTelemetryCardProps) {
  if (!visible) return null;

  const sunElev = availableValue(sunElevationDeg);
  const sunAz = availableValue(sunAzimuthDeg);
  const earthElev = availableValue(earthElevationDeg);
  const earthAz = availableValue(earthAzimuthDeg);
  const isEarthPositive = earthElev !== null && earthElev > 0;
  const isEarthSubHorizon = earthElev !== null && earthElev < 0;
  const isOffMap = isOffMapPolarSite(site);
  const sunElevationParts = sunElev === null ? null : angleParts(sunElev, 1, true);
  const sunAzimuthParts = sunAz === null ? null : angleParts(sunAz, 0);
  const earthElevationParts = earthElev === null ? null : angleParts(earthElev, 1, true);
  const earthAzimuthParts = earthAz === null ? null : angleParts(earthAz, 0);

  return (
    <div
      role="region"
      aria-label={`Site Telemetry: ${site.name}`}
      className="hidden sm:block absolute top-12 right-3 z-15 bg-[var(--lm-color-surface-raised)]/90 backdrop-blur-md border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-sm)] px-2.5 py-2 shadow-md text-left select-none pointer-events-none w-44"
    >
      <div className="flex items-baseline justify-between border-b border-[var(--lm-color-border-subtle)] pb-1 mb-1.5">
        <span className="text-[11px] font-bold font-mono text-[var(--lm-color-selected-site)]">
          {site.code}
        </span>
        <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] truncate ml-1 max-w-[100px]">
          {site.name}
        </span>
      </div>

      {isOffMap && (
        <div className="flex items-center justify-between bg-[var(--lm-color-warning)]/10 border border-[var(--lm-color-warning)]/30 rounded px-1.5 py-0.5 mb-1.5 text-[11px] font-mono text-[var(--lm-color-warning)]">
          <span className="font-semibold">OFF-MAP BEARING</span>
          <span className="text-[11px] opacity-80">Outside 83°S Sheet</span>
        </div>
      )}

      <div className="space-y-1 text-[11px] font-mono">
        {/* Sun Row */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[var(--lm-color-sun)]">
            <Sun className="w-2.5 h-2.5" />
            <span>Sun:</span>
          </span>
          <span className="font-semibold text-[var(--lm-color-sun)]">
            {sunElevationParts
              ? <>{sunElevationParts.sign}{sunElevationParts.digits}{sunElevationParts.unit}</>
              : UNAVAILABLE_PLACEHOLDER}
            <span className="text-[11px] text-[var(--lm-color-text-muted)] ml-1 font-normal">
              {sunAzimuthParts
                ? <>{sunAzimuthParts.digits}{sunAzimuthParts.unit}</>
                : UNAVAILABLE_PLACEHOLDER}
            </span>
          </span>
        </div>

        {/* Earth Row */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[var(--lm-color-earth)]">
            <EarthIcon className="w-2.5 h-2.5" />
            <span>Earth:</span>
          </span>
          <span className={`font-semibold ${isEarthPositive ? 'text-[var(--lm-color-earth)]' : 'text-[var(--lm-color-warning)]'}`}>
            {earthElevationParts
              ? <>{earthElevationParts.sign}{earthElevationParts.digits}{earthElevationParts.unit}</>
              : UNAVAILABLE_PLACEHOLDER}
            <span className="text-[11px] text-[var(--lm-color-text-muted)] ml-1 font-normal">
              {isEarthSubHorizon ? '(Sub-horizon)' : earthAzimuthParts ? <>{earthAzimuthParts.digits}{earthAzimuthParts.unit}</> : UNAVAILABLE_PLACEHOLDER}
            </span>
          </span>
        </div>

        {/* Distance from Pole */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--lm-color-border-subtle)] text-[11px] text-[var(--lm-color-text-muted)]">
          <span>Pole Dist:</span>
          <span className="font-semibold text-[var(--lm-color-text-secondary)]">
            {distanceFromPoleKm.toFixed(1)} km
          </span>
        </div>
        {isOffMap && (
          <div className="pt-0.5 text-[11px] font-mono text-[var(--lm-color-text-muted)] flex items-center justify-between">
            <span>Projection:</span>
            <span className="text-[var(--lm-color-selected-site)]">Bearing Beacon</span>
          </div>
        )}
      </div>
    </div>
  );
}

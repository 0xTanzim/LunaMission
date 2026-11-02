import React from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { CustomPointCelestialAngles } from '@/domain/coordinates/projection';

/**
 * Preview card for an unselected candidate under the cursor. Pointer events are
 * disabled so the card cannot steal the hover it is describing.
 */
export function HoverCandidateCard({
  site,
  celestial,
}: {
  site: CandidateSite;
  celestial: CustomPointCelestialAngles;
}) {
  return (
    <div
      role="region"
      aria-label={`Preview Candidate: ${site.name}`}
      className="hidden sm:block absolute top-12 right-3 z-15 bg-[var(--lm-color-surface-raised)]/95 backdrop-blur-md border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] px-2.5 py-2 shadow-lg text-left select-none pointer-events-none w-46"
    >
      <div className="flex items-baseline justify-between border-b border-[var(--lm-color-border-subtle)] pb-1 mb-1.5">
        <span className="text-[11px] font-bold font-mono text-[var(--lm-color-info)]">
          {site.code}
        </span>
        <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] truncate ml-1 max-w-[110px]">
          {site.name}
        </span>
      </div>
      <div className="space-y-0.5 text-[11px] font-mono text-[var(--lm-color-text-secondary)]">
        <div className="flex justify-between">
          <span className="text-[var(--lm-color-text-muted)]">Elev:</span>
          <span className="font-semibold text-[var(--lm-color-text-primary)]">
            +{site.coordinates.elevationMeters.toLocaleString()} m
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--lm-color-text-muted)]">Lat:</span>
          <span>{Math.abs(site.coordinates.latitudeDeg).toFixed(2)}°S</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--lm-color-text-muted)]">Lon:</span>
          <span>{site.coordinates.longitudeDeg.toFixed(1)}°E</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-[var(--lm-color-border-subtle)] text-[11px]">
          <span className="text-[var(--lm-color-sun)]">Sun:</span>
          <span className="text-[var(--lm-color-sun)] font-semibold">
            {celestial.sunElevationDeg >= 0 ? '+' : ''}{celestial.sunElevationDeg.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--lm-color-earth)]">Earth:</span>
          <span className="text-[var(--lm-color-earth)] font-semibold">
            {celestial.earthElevationDeg >= 0 ? '+' : ''}{celestial.earthElevationDeg.toFixed(1)}°
          </span>
        </div>
      </div>
      <div className="mt-1.5 text-[11px] text-[var(--lm-color-selected-site)] font-mono">
        Click to select candidate
      </div>
    </div>
  );
}

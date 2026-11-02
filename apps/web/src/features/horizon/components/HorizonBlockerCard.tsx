import React from 'react';
import { Mountain } from 'lucide-react';
import type { HorizonBlocker } from '@luna/contracts';

/**
 * Blocker card (task 4.3): the dominant terrain blocker from the backend curated
 * horizon response, with explicit units on every readout.
 */
export interface HorizonBlockerCardProps {
  bin: HorizonBlocker;
  stepDeg: number;
  mastHeightMeters?: number;
}

export function HorizonBlockerCard({ bin, stepDeg, mastHeightMeters }: HorizonBlockerCardProps) {
  return (
    <div
      data-testid="horizon-blocker-card"
      className="flex-1 min-w-[240px] bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-md)] p-3 text-xs font-mono"
    >
      <div className="flex items-center gap-1.5 font-bold text-[var(--lm-color-danger)] uppercase tracking-wider border-b border-[var(--lm-color-border-subtle)] pb-1.5 mb-2">
        <Mountain className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Dominant Terrain Blocker</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <dt className="text-[var(--lm-color-text-muted)]">Azimuth sector</dt>
        <dd className="text-[var(--lm-color-text-primary)]">
          {bin.azimuthDeg}°–{bin.azimuthDeg + stepDeg}°
        </dd>
        <dt className="text-[var(--lm-color-text-muted)]">Mask elevation</dt>
        <dd className="text-[var(--lm-color-text-primary)]">{bin.maskElevationDeg.toFixed(2)}°</dd>
        <dt className="text-[var(--lm-color-text-muted)]">Ridge distance</dt>
        <dd className="text-[var(--lm-color-text-primary)]">{bin.ridgeDistanceKm.toFixed(1)} km</dd>
        <dt className="text-[var(--lm-color-text-muted)]">Blocker elevation</dt>
        <dd className="text-[var(--lm-color-text-primary)]">{bin.blockerElevationMeters.toFixed(0)} m</dd>
        {mastHeightMeters !== undefined && (
          <>
            <dt className="text-[var(--lm-color-text-muted)]">Observer mast</dt>
            <dd className="text-[var(--lm-color-text-primary)]">{mastHeightMeters} m</dd>
          </>
        )}
      </dl>
    </div>
  );
}

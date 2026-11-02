import React from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';

/** Hover readout for a globe marker; the canvas is pointer-transparent, so this is inert. */
export function GlobeHoverCard({ site }: { site: CandidateSite }) {
  const { latitudeDeg, longitudeDeg, elevationMeters } = site.coordinates;
  return (
    <div className="absolute top-16 left-3 z-20 pointer-events-none bg-[var(--lm-color-surface-strong)]/95 border border-[var(--lm-color-selected-site)] p-2.5 rounded-[var(--lm-radius-sm)] shadow-lg backdrop-blur-xs">
      <div className="text-xs font-semibold text-[var(--lm-color-selected-site)]">
        {site.name} ({site.code})
      </div>
      <div className="text-[11px] font-mono text-[var(--lm-color-text-secondary)] mt-0.5">
        {Math.abs(latitudeDeg).toFixed(2)}°S, {longitudeDeg.toFixed(2)}°E • Elevation:{' '}
        {elevationMeters > 0 ? '+' : ''}
        {elevationMeters.toLocaleString()} m
      </div>
      <div className="text-[11px] text-[var(--lm-color-text-muted)] mt-1">Click to inspect point passport</div>
    </div>
  );
}

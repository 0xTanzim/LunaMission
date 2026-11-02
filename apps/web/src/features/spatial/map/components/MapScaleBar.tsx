import React, { useMemo } from 'react';
import { calculateScaleBar, SelenographicCoordinate } from '@/domain/coordinates/projection';
import { CandidateSite } from '@/domain/sites/candidateSite';

export interface MapScaleBarProps {
  zoom: number;
  cursorCoord: SelenographicCoordinate | null;
  cursorDistanceKm: number | null;
  selectedSite: CandidateSite;
  hideRibbon?: boolean;
  className?: string;
}

/**
 * Dynamic projection-derived scale bar and cursor coordinate readout.
 *
 * The pin key is deliberately short: two states, each named in words as well as colour,
 * so the legend no longer competes with the layer toggles, the toolbar and the rail for
 * the right to explain what a marker means.
 */
export function MapScaleBar({
  zoom,
  cursorCoord,
  cursorDistanceKm,
  selectedSite,
  className = '',
}: MapScaleBarProps) {
  const scale = useMemo(() => calculateScaleBar(zoom), [zoom]);

  return (
    <div
      data-testid="map-scale-bar"
      className={`pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)]/92 px-2.5 py-1.5 text-[11px] font-mono text-[var(--lm-color-text-muted)] shadow-sm backdrop-blur-md ${className}`}
    >
      {/* Dynamic Scale Bar */}
      <div className="flex shrink-0 items-center gap-1.5">
        <div
          className="h-1 rounded-xs border border-[var(--lm-color-border)] bg-[var(--lm-color-text-secondary)] transition-all duration-150"
          style={{ width: `${scale.widthPx}px` }}
        />
        <span className="font-semibold text-[var(--lm-color-text-secondary)]">
          {scale.distanceKm} km
        </span>
      </div>

      {/* Pin key: selected target and comparison ring, the only two pin states */}
      <div className="flex shrink-0 items-center gap-2 border-[var(--lm-color-border)] pl-2 sm:border-l">
        <span className="flex items-center gap-1 text-[var(--lm-color-selected-site)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[var(--lm-color-selected-site)] ring-1 ring-[var(--lm-color-text-primary)]"
          />
          <span>Selected site</span>
        </span>
        <span className="flex items-center gap-1 text-[var(--lm-color-data-demo)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full border border-[var(--lm-color-data-demo)] bg-transparent"
          />
          <span>Compared</span>
        </span>
      </div>

      {/* Real-time Cursor Selenographic Coordinate Tracker */}
      {cursorCoord && (
        <div className="hidden min-w-0 items-center gap-1.5 border-[var(--lm-color-border)] pl-2 text-[var(--lm-color-text-secondary)] md:flex md:border-l">
          <span className="text-[11px] font-mono uppercase text-[var(--lm-color-text-muted)]">
            Cursor:
          </span>
          <span className="font-medium">
            {Math.abs(cursorCoord.latitudeDeg).toFixed(2)}°S,{' '}
            {cursorCoord.longitudeDeg.toFixed(2)}°E
          </span>
          {cursorDistanceKm !== null && (
            <span className="text-[11px] text-[var(--lm-color-selected-site)]">
              ({cursorDistanceKm.toFixed(1)} km from {selectedSite.code})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

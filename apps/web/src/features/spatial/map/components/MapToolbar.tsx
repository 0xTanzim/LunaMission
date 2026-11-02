import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { MapZoomPreset } from '@/features/spatial/map/model/mapViewportMath';
import { MapToolbarHeader } from './MapToolbarHeader';

export type { MapZoomPreset };

export interface MapToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onApplyPreset: (preset: MapZoomPreset) => void;
  activePreset: MapZoomPreset | 'custom';
  hideHeader?: boolean;
  /** Layer compositing trigger + panel, owned by the map so it travels with the drawing surface. */
  layerControls?: React.ReactNode;
}

/**
 * Map-surface chrome: where the sheet is, how far in it is, and what is composited on it.
 *
 * When the workspace shows more than one projection the title strip is dropped to give the
 * disc the whole panel, but the zoom and layer controls stay: losing the compositing
 * controls in dual view would make the second projection unexplorable.
 */
export function MapToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onApplyPreset,
  activePreset,
  hideHeader = false,
  layerControls,
}: MapToolbarProps) {
  if (!hideHeader) {
    return (
      <MapToolbarHeader
        onApplyPreset={onApplyPreset}
        activePreset={activePreset}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onReset={onReset}
        zoom={zoom}
        layerControls={layerControls}
      />
    );
  }

  return (
    <div
      data-testid="map-zoom-palette"
      className="pointer-events-auto absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)]/95 p-1 shadow-md backdrop-blur-md"
    >
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom In (+)"
        aria-label="Zoom in"
        className="flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-[var(--lm-radius-xs)] p-1 text-[var(--lm-color-text-secondary)] transition-colors hover:bg-[var(--lm-color-surface-raised)] hover:text-[var(--lm-color-text-primary)]"
      >
        <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom Out (-)"
        aria-label="Zoom out"
        className="flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-[var(--lm-radius-xs)] p-1 text-[var(--lm-color-text-secondary)] transition-colors hover:bg-[var(--lm-color-surface-raised)] hover:text-[var(--lm-color-text-primary)]"
      >
        <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span className="px-1 text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-muted)]" aria-hidden="true">
        {zoom.toFixed(1)}×
      </span>
      {layerControls}
    </div>
  );
}

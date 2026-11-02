import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { MapZoomPreset } from '@/features/spatial/map/model/mapViewportMath';

export interface MapToolbarHeaderProps {
  onApplyPreset: (preset: MapZoomPreset) => void;
  activePreset: MapZoomPreset | 'custom';
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  zoom?: number;
  /** Layer compositing trigger + panel. */
  layerControls?: React.ReactNode;
}

const CHIP_CLASS =
  'px-2 py-0.5 text-[11px] rounded-[var(--lm-radius-xs)] font-medium transition-colors min-h-6';

const chipState = (on: boolean) =>
  on
    ? 'border border-[var(--lm-color-info)] bg-[var(--lm-color-info)]/18 text-[var(--lm-color-text-primary)] font-semibold'
    : 'border border-[var(--lm-color-info)]/30 bg-transparent text-[var(--lm-color-text-secondary)] hover:border-[var(--lm-color-info)]/70 hover:text-[var(--lm-color-text-primary)]';

const ZOOM_BUTTON_CLASS =
  'flex min-h-6 min-w-6 items-center justify-center rounded-[var(--lm-radius-xs)] p-1 text-[var(--lm-color-text-secondary)] transition-colors hover:bg-[var(--lm-color-surface-raised)] hover:text-[var(--lm-color-text-primary)] cursor-pointer';

const PRESETS = [
  ['regional', 'Regional', 'Regional View: Full 83°S–90°S Basin'],
  ['candidates', 'Candidates', 'Candidates Cluster: Focused on Artemis Ridge Sites (87°S–90°S)'],
  ['site', 'Site Focus', 'Site Inspection: High Magnification on Selected Candidate'],
  ['fit-all', 'Fit All', 'Fit All: Bounded framing of all 8 candidate sites'],
] as const;

/**
 * Header strip for the polar stereographic map.
 *
 * The provenance caption ("Polar Stereographic Map · 83°S–90°S · IAU/LOLA 128ppd") is
 * part of the data, not chrome: it says which projection and which DEM produced the
 * pixels. It stays visible at every width and wraps, so no width clips it.
 *
 * The layer chips that used to live here are gone: compositing is now one labelled
 * Layers control, because five toggles, a legend and a caption all explaining the same
 * picture is what made the map read as a control panel instead of a map.
 */
export function MapToolbarHeader({
  onApplyPreset,
  activePreset,
  onZoomIn,
  onZoomOut,
  zoom,
  layerControls,
}: MapToolbarHeaderProps) {
  return (
    <div className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 z-20 flex flex-wrap items-start justify-between gap-1.5">
      <div className="pointer-events-auto flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)]/94 px-2.5 py-1.5 shadow-xs backdrop-blur-md">
        <span className="text-xs font-semibold text-[var(--lm-color-text-primary)]">
          Polar Stereographic Map
        </span>
        <span className="border-[var(--lm-color-border)] pl-2 text-[11px] font-mono text-[var(--lm-color-text-muted)] sm:border-l">
          83°S – 90°S
        </span>
        <span className="border-[var(--lm-color-border)] pl-2 text-[11px] font-mono text-[var(--lm-color-text-muted)] sm:border-l">
          IAU/LOLA 128ppd
        </span>
      </div>

      <div className="pointer-events-auto flex min-w-0 max-w-full flex-wrap items-center gap-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)]/94 p-1 shadow-xs backdrop-blur-md">
        {onZoomIn && (
          <button type="button" onClick={onZoomIn} title="Zoom In (+)" aria-label="Zoom in" className={ZOOM_BUTTON_CLASS}>
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {onZoomOut && (
          <button type="button" onClick={onZoomOut} title="Zoom Out (-)" aria-label="Zoom out" className={ZOOM_BUTTON_CLASS}>
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {typeof zoom === 'number' && (
          <span className="px-1 text-[11px] tabular-nums text-[var(--lm-color-text-muted)]" aria-hidden="true">
            {zoom.toFixed(1)}×
          </span>
        )}
        <div className="mx-0.5 h-3.5 w-px bg-[var(--lm-color-border)]" />
        {PRESETS.map(([preset, label, title]) => (
          <button
            key={preset}
            type="button"
            onClick={() => onApplyPreset(preset)}
            title={title}
            aria-pressed={activePreset === preset}
            className={`${CHIP_CLASS} whitespace-nowrap ${chipState(activePreset === preset)}`}
          >
            {label}
          </button>
        ))}
        {layerControls && (
          <>
            <div className="mx-0.5 h-3.5 w-px bg-[var(--lm-color-border)]" />
            {layerControls}
          </>
        )}
      </div>
    </div>
  );
}

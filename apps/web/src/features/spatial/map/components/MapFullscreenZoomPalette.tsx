import React from 'react';
import { ZoomIn, ZoomOut, Crosshair, RotateCcw } from 'lucide-react';

export interface MapFullscreenZoomPaletteProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFocusSite?: () => void;
  isSiteFocused?: boolean;
  className?: string;
}

/**
 * Dedicated flight-deck floating zoom & orientation palette for Fullscreen mode.
 * Anchors neatly at the bottom-right above the scientific layer selector,
 * restoring quick-access tactile zoom controls during full-screen map exploration.
 */
export function MapFullscreenZoomPalette({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFocusSite,
  isSiteFocused = false,
  className,
}: MapFullscreenZoomPaletteProps) {
  return (
    <aside
      data-testid="fullscreen-map-zoom-palette"
      aria-label="Fullscreen Map Navigation Controls"
      className={`absolute bottom-14 z-20 flex flex-col items-center gap-1 pointer-events-auto bg-[var(--lm-color-surface)]/95 backdrop-blur-md p-1.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] shadow-lg select-none transition-all duration-200 ${
        className || 'right-3'
      }`}
    >
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom In (+)"
        aria-label="Zoom in"
        className="p-1.5 rounded-[var(--lm-radius-xs)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)] transition-colors cursor-pointer"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom Out (-)"
        aria-label="Zoom out"
        className="p-1.5 rounded-[var(--lm-radius-xs)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)] transition-colors cursor-pointer"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      {onFocusSite && (
        <button
          type="button"
          onClick={onFocusSite}
          title="Focus on Selected Site"
          aria-label="Focus on selected site"
          className={`p-1.5 rounded-[var(--lm-radius-xs)] transition-colors cursor-pointer ${
            isSiteFocused
              ? 'text-[var(--lm-color-selected-site)] bg-[var(--lm-color-surface-raised)] shadow-xs'
              : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)]'
          }`}
        >
          <Crosshair className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onReset}
        title="Reset to Regional 1.0x"
        aria-label="Reset view"
        className="p-1.5 rounded-[var(--lm-radius-xs)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)] transition-colors cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <span className="text-[11px] font-mono font-semibold text-[var(--lm-color-text-muted)] pt-1 mt-0.5 border-t border-[var(--lm-color-border-subtle)] w-full text-center">
        {zoom.toFixed(1)}x
      </span>
    </aside>
  );
}

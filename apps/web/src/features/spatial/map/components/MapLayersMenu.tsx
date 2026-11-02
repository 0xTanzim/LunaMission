import { useEffect, useId, useRef, useState } from 'react';
import { Layers, X } from 'lucide-react';
import {
  type LayerBlendMode,
  type LayerComposition,
  type MapOverlayId,
  type OverlayLayerState,
} from '@/features/spatial/model/mapLayerStack';
import type { BaseRasterState } from '@/features/spatial/map/hooks/useBaseRaster';
import { MapLayerControls } from './MapLayerControls';

export interface MapLayersMenuProps {
  composition: LayerComposition;
  overlays: OverlayLayerState;
  overlayIds: readonly MapOverlayId[];
  baseRaster: BaseRasterState;
  onToggleOverlay: (id: MapOverlayId) => void;
  onOverlayOpacityChange: (id: MapOverlayId, opacity: number) => void;
  onOverlayBlendChange: (id: MapOverlayId, blendMode: LayerBlendMode) => void;
}

/**
 * The map's Layers control: one labelled trigger, one panel.
 *
 * It is a disclosure rather than a modal because compositing is an adjustment the
 * operator makes while looking at the terrain, not a task that must be finished first.
 * Escape closes it and focus returns to the trigger.
 */
export function MapLayersMenu({
  composition,
  overlays,
  overlayIds,
  baseRaster,
  onToggleOverlay,
  onOverlayOpacityChange,
  onOverlayBlendChange,
}: MapLayersMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const paintedCount = composition.painted.length;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-testid="map-layers-menu-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label="Map layers and compositing"
        title="Choose the base layer and composite overlays"
        className="flex min-h-6 cursor-pointer items-center gap-1.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-info)]/30 px-2 py-0.5 text-[11px] font-medium text-[var(--lm-color-text-secondary)] transition-colors hover:border-[var(--lm-color-info)]/70 hover:text-[var(--lm-color-text-primary)]"
      >
        <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--lm-color-info)]" aria-hidden="true" />
        <span>Layers</span>
        <span className="rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-strong)] px-1 tabular-nums text-[var(--lm-color-text-secondary)]">
          {paintedCount}
        </span>
      </button>

      <div
        id={panelId}
        hidden={!isOpen}
        className="absolute right-0 top-[calc(100%+0.375rem)] z-40"
        data-testid="map-layers-panel"
      >
        <MapLayerControls
          composition={composition}
          overlays={overlays}
          overlayIds={overlayIds}
          baseRaster={baseRaster}
          onToggleOverlay={onToggleOverlay}
          onOverlayOpacityChange={onOverlayOpacityChange}
          onOverlayBlendChange={onOverlayBlendChange}
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            triggerRef.current?.focus();
          }}
          className="mt-1 flex min-h-6 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] px-2 py-1 font-mono text-[11px] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Close layers
        </button>
      </div>
    </div>
  );
}

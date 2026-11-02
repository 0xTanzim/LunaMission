import React from 'react';
import { AlertTriangle, Check, Layers, Minus } from 'lucide-react';
import {
  LAYER_BLEND_MODES,
  MAP_LAYER_PAINT_ORDER,
  baseLayerSpec,
  overlaySpec,
  resolveOverlayCompatibility,
  type LayerBlendMode,
  type LayerComposition,
  type MapOverlayId,
  type OverlayLayerState,
} from '@/features/spatial/model/mapLayerStack';
import type { BaseRasterState } from '@/features/spatial/map/hooks/useBaseRaster';

export interface MapLayerControlsProps {
  composition: LayerComposition;
  /** Raw overlay state, including hidden and suppressed layers. */
  overlays: OverlayLayerState;
  /** Overlays this surface can draw, in menu order. */
  overlayIds: readonly MapOverlayId[];
  baseRaster: BaseRasterState;
  onToggleOverlay: (id: MapOverlayId) => void;
  onOverlayOpacityChange: (id: MapOverlayId, opacity: number) => void;
  onOverlayBlendChange: (id: MapOverlayId, blendMode: LayerBlendMode) => void;
  className?: string;
}

const STATUS_TEXT: Record<BaseRasterState['status'], string> = {
  preparing: 'Rendering base layer…',
  ready: 'Base layer rendered',
  empty: 'No raster for this base layer',
  error: 'Base layer failed to render',
};

/**
 * The compositing panel: one base layer, independently toggleable overlays, per-layer
 * opacity and blend mode, and the reason an overlay is unavailable over the active base.
 *
 * It reads the same composition object the map draws and the legend describes, so a
 * refused combination cannot end up looking active in one place and absent in another.
 */
export function MapLayerControls({
  composition,
  overlays,
  overlayIds,
  baseRaster,
  onToggleOverlay,
  onOverlayOpacityChange,
  onOverlayBlendChange,
  className = '',
}: MapLayerControlsProps) {
  const base = baseLayerSpec(composition.base.id);
  const paintedIds = new Set(composition.painted.map((layer) => layer.id));
  const coverage = baseRaster.coverage;
  const noDataCells = coverage?.noDataCells ?? 0;

  return (
    <div
      data-testid="map-layer-controls"
      role="group"
      aria-label="Map layer compositing"
      className={`flex w-[19rem] max-w-[calc(100vw-2rem)] flex-col gap-2.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] p-3 font-mono text-[11px] shadow-[var(--lm-shadow-popover)] ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
          <Layers className="h-3.5 w-3.5 text-[var(--lm-color-info)]" aria-hidden="true" />
          Layers
        </span>
        <span
          className={`rounded-[var(--lm-radius-xs)] border px-1.5 py-0.5 ${
            baseRaster.status === 'error'
              ? 'border-[var(--lm-color-danger)]/40 text-[var(--lm-color-danger)]'
              : baseRaster.status === 'ready'
                ? 'border-[var(--lm-color-border)] text-[var(--lm-color-text-muted)]'
                : 'border-[var(--lm-color-warning)]/40 text-[var(--lm-color-warning)]'
          }`}
        >
          {STATUS_TEXT[baseRaster.status]}
        </span>
      </div>

      <div className="flex flex-col gap-0.5" data-testid="layer-controls-base-summary">
        <span className="text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]">
          Base layer
        </span>
        <span className="text-[var(--lm-color-text-primary)] font-semibold">{base.label}</span>
        <span className="text-[var(--lm-color-text-muted)]">
          {base.quantity} · {base.unit}
        </span>
        <span className="text-[var(--lm-color-text-muted)]">{base.instrument}</span>
      </div>

      {baseRaster.status === 'error' && (
        <p role="alert" className="flex items-start gap-1.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-danger)]/40 bg-[var(--lm-color-danger-surface)] p-2 text-[var(--lm-color-danger)]">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{baseRaster.message ?? 'The base layer could not be rendered.'} The disc stays unpainted rather than showing a colour that is not measured.</span>
        </p>
      )}

      <div className="flex flex-col gap-2" role="group" aria-label="Overlay layers">
        {overlayIds.map((id) => {
          const spec = overlaySpec(id);
          const state = overlays[id];
          const compatibility = resolveOverlayCompatibility(composition.base.id, id);
          const isPainted = paintedIds.has(id);
          const checkboxId = `layer-toggle-${id}`;

          return (
            <div key={id} className="flex flex-col gap-1 border-t border-[var(--lm-color-border-subtle)] pt-2 first:border-t-0 first:pt-0">
              <div className="flex items-start justify-between gap-2">
                <label htmlFor={checkboxId} className="flex min-h-6 cursor-pointer items-start gap-1.5">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={state.visible}
                    disabled={!compatibility.enabled}
                    onChange={() => onToggleOverlay(id)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--lm-color-info)] disabled:cursor-not-allowed"
                  />
                  <span className="flex flex-col">
                    <span
                      className={`font-semibold ${
                        !compatibility.enabled
                          ? 'text-[var(--lm-color-text-disabled)]'
                          : isPainted
                            ? 'text-[var(--lm-color-text-primary)]'
                            : 'text-[var(--lm-color-text-secondary)]'
                      }`}
                    >
                      {spec.label}
                    </span>
                    <span className="leading-snug text-[var(--lm-color-text-muted)]">{spec.purpose}</span>
                  </span>
                </label>
                <span
                  aria-hidden="true"
                  className={`mt-0.5 shrink-0 ${
                    !compatibility.enabled
                      ? 'text-[var(--lm-color-text-disabled)]'
                      : state.visible
                        ? 'text-[var(--lm-color-success)]'
                        : 'text-[var(--lm-color-text-subtle)]'
                  }`}
                >
                  {!compatibility.enabled ? (
                    <Minus className="h-3.5 w-3.5" />
                  ) : state.visible ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                </span>
              </div>

              {!compatibility.enabled && (
                <p
                  data-testid={`layer-incompatible-${id}`}
                  className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-warning)]/40 bg-[var(--lm-color-warning-surface)] px-2 py-1 leading-snug text-[var(--lm-color-warning)]"
                >
                  Unavailable over the {base.label.toLowerCase()} base: {compatibility.reason}
                </p>
              )}

              {compatibility.enabled && state.visible && (
                <div className="flex items-center gap-2 pl-5">
                  <label htmlFor={`layer-opacity-${id}`} className="shrink-0 text-[var(--lm-color-text-muted)]">
                    Opacity
                  </label>
                  <input
                    id={`layer-opacity-${id}`}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(state.opacity * 100)}
                    onChange={(event) => onOverlayOpacityChange(id, Number(event.target.value) / 100)}
                    className="h-6 min-w-0 flex-1 cursor-pointer accent-[var(--lm-color-info)]"
                  />
                  <span className="w-8 shrink-0 text-right tabular-nums text-[var(--lm-color-text-secondary)]">
                    {Math.round(state.opacity * 100)}%
                  </span>
                  <select
                    aria-label={`${spec.label} blend mode`}
                    value={state.blendMode}
                    onChange={(event) => onOverlayBlendChange(id, event.target.value as LayerBlendMode)}
                    className="min-h-6 shrink-0 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-strong)] px-1 text-[var(--lm-color-text-secondary)]"
                  >
                    {LAYER_BLEND_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-[var(--lm-color-border-subtle)] pt-2 text-[var(--lm-color-text-muted)]">
        <span className="uppercase tracking-wider text-[length:var(--lm-text-micro)]">Paint order</span>
        <span data-testid="layer-paint-order">
          base ▸{' '}
          {MAP_LAYER_PAINT_ORDER.map((id) => overlaySpec(id).label).join(' ▸ ')}
        </span>
        <span className="pt-1">
          No-data samples stay transparent: they are never painted as a value.
          {noDataCells > 0 && ` ${noDataCells.toLocaleString()} cells had no value in the last render.`}
        </span>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import {
  NASA_SVS_POLAR_DOMAIN,
  NASA_SVS_POLAR_LEGEND_TICKS,
  getPolarLegendGradient,
} from '@/domain/terrain/nasaSvsColorRamp';
import type { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import {
  MAP_BASE_LAYERS,
  baseLayerSpec,
  type LayerComposition,
} from '@/features/spatial/model/mapLayerStack';
import type { BaseRasterState } from '@/features/spatial/map/hooks/useBaseRaster';
import { ScientificColorScaleBar } from './ScientificColorScaleBar';
import { ScientificProvenanceBadge } from './ScientificProvenanceBadge';

export interface ScientificMapLegendProps {
  mode: ScientificMapLayerMode;
  onSelectMode: (mode: ScientificMapLayerMode) => void;
  initialExpanded?: boolean;
  className?: string;
  /** What the compositor actually painted. The legend states it rather than guessing. */
  composition?: LayerComposition;
  /** Base-layer render state: a raster that failed to render must not look like data. */
  baseRaster?: BaseRasterState;
}

const SLOPE_CLASSES = [
  { label: '<5° Safe', className: 'border-[var(--lm-color-success)]/50 text-[var(--lm-color-success)]' },
  { label: '5°–12° Moderate', className: 'border-[var(--lm-color-info)]/50 text-[var(--lm-color-info)]' },
  { label: '12°–15° Warn', className: 'border-[var(--lm-color-warning)]/50 text-[var(--lm-color-warning)]' },
  { label: '≥15° Hazard', className: 'border-[var(--lm-color-danger)]/50 text-[var(--lm-color-danger)] font-bold' },
];

const GEOLOGY_UNITS = [
  { code: 'pNb', hex: '#78716b', label: 'Pre-Nectarian basin' },
  { code: 'Nb', hex: '#b45309', label: 'Nectarian basin' },
  { code: 'Im', hex: '#2563eb', label: 'Imbrian ejecta' },
  { code: 'Cc', hex: '#fbbf24', label: 'Crater material' },
  { code: 'PSR', hex: '#1e1b4b', label: 'Cold trap' },
];

/**
 * The map legend: which quantity the ramp encodes, and exactly which layers are composited
 * on top of it right now.
 *
 * The composited line is not decoration. When an overlay is refused over the active base
 * the same sentence appears here and in the layer panel, so the picture on screen and the
 * key beside it cannot disagree about what was painted.
 */
export function ScientificMapLegend({
  mode,
  onSelectMode,
  initialExpanded = true,
  className = '',
  composition,
  baseRaster,
}: ScientificMapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const base = baseLayerSpec(mode);
  const paintedLabels = composition?.painted.map((layer) => layer.label) ?? [];
  const suppressed = composition?.suppressed ?? [];
  const noDataCells = baseRaster?.coverage?.noDataCells ?? 0;
  const rasterBroken = baseRaster?.status === 'error';

  return (
    <aside
      className={`pointer-events-auto select-none rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)]/95 font-mono text-[11px] shadow-[var(--lm-shadow-popover)] backdrop-blur-md transition-all duration-150 ${
        isExpanded ? 'flex w-72 flex-col gap-2 p-2.5 sm:w-80' : 'flex w-[19rem] max-w-full flex-col gap-1 px-2.5 py-1.5 sm:w-[21rem]'
      } ${className}`}
      aria-label="Scientific Lunar Map Layer Legend"
      data-testid="scientific-map-legend"
    >
      {/* Header / base-layer selector */}
      <div className={`flex w-full items-center justify-between gap-2 ${isExpanded ? 'border-b border-[var(--lm-color-border-subtle)] pb-1.5' : ''}`}>
        <span className="flex shrink-0 items-center gap-1.5 text-[length:var(--lm-text-micro)] font-semibold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
          <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--lm-color-info)]" aria-hidden="true" />
          <span>Base</span>
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <select
            value={mode}
            onChange={(event) => onSelectMode(event.target.value as ScientificMapLayerMode)}
            data-testid="select-scientific-layer"
            aria-label="Select Scientific Map Product Layer"
            className="max-w-[165px] min-h-6 cursor-pointer truncate rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-strong)] px-2 py-0.5 text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-primary)] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)] sm:max-w-[185px]"
          >
            {MAP_BASE_LAYERS.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.label} · {layer.unit}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Legend Details' : 'Expand Legend Details'}
            aria-label={isExpanded ? 'Collapse Legend' : 'Expand Legend'}
            aria-expanded={isExpanded}
            className="inline-flex min-h-6 min-w-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--lm-radius-xs)] p-1 text-[var(--lm-color-text-muted)] transition-colors hover:bg-[var(--lm-color-surface-raised)] hover:text-[var(--lm-color-text-primary)]"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Collapsed scale strip: the map is most often viewed with the legend closed, so the
          colours must still be interpretable without expanding. Only quantitative
          continuous layers get one. */}
      {!isExpanded && mode === 'topography' && (
        <div className="flex flex-col gap-1 pt-1.5" data-testid="legend-collapsed-scale">
          <div
            className="h-2 w-full rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)]"
            style={{ background: getPolarLegendGradient() }}
            aria-hidden="true"
          />
          <div className="flex items-baseline justify-between gap-2 whitespace-nowrap text-[11px] tabular-nums text-[var(--lm-color-text-muted)]">
            <span>{NASA_SVS_POLAR_LEGEND_TICKS[0]!.label}</span>
            <span className="truncate text-[var(--lm-color-info)]">south-polar domain</span>
            <span>{NASA_SVS_POLAR_LEGEND_TICKS[NASA_SVS_POLAR_LEGEND_TICKS.length - 1]!.label}</span>
          </div>
        </div>
      )}
      {!isExpanded && mode !== 'topography' && (
        <div className="pt-1 text-[11px] text-[var(--lm-color-text-subtle)]">Expand for scale &amp; provenance</div>
      )}

      {isExpanded && (
        <>
          {mode === 'topography' && (
            <ScientificColorScaleBar
              leftLabel={`${(NASA_SVS_POLAR_DOMAIN.minMeters / 1000).toFixed(1)} km`}
              leftClass="text-[var(--lm-color-info)] font-semibold"
              midLabel="0 km (Datum R=1737.4 km)"
              rightLabel={`+${(NASA_SVS_POLAR_DOMAIN.maxMeters / 1000).toFixed(1)} km`}
              rightClass="text-[var(--lm-color-warning)] font-semibold"
              gradient={getPolarLegendGradient()}
              subLeft="NASA SVS 3727 palette"
              subRight="LOLA altimetry · south-polar display domain"
              subRightClass="text-[var(--lm-color-success)]"
            />
          )}

          {mode === 'volatiles' && (
            <ScientificColorScaleBar
              leftLabel="<0.05% H (Dry Regolith)"
              rightLabel=">0.45% H (>4% WEH Ice)"
              rightClass="text-[var(--lm-color-info)] font-semibold"
              gradient="linear-gradient(to right, #1e293b, #0d9488, #06b6d4, #e0f2fe)"
              subLeft="LRO LEND Neutron Suppression"
              subRight="Hydrogen Mass Wt%"
            />
          )}

          {mode === 'temperature' && (
            <ScientificColorScaleBar
              leftLabel="40K (Cold Trap)"
              leftClass="text-[var(--lm-color-info)] font-semibold"
              midLabel="110K (Ice Boundary)"
              midClass="text-[var(--lm-color-success)] font-semibold"
              rightLabel="260K (Sunlit)"
              rightClass="text-[var(--lm-color-warning)] font-semibold"
              gradient="linear-gradient(to right, #312e81, #1d4ed8, #10b981, #f59e0b, #e11d48)"
              subLeft="LRO Diviner Max Surface Temp"
              subRight="<110K Stable Ice"
              subRightClass="text-[var(--lm-color-success)]"
            />
          )}

          {mode === 'hillshade' && (
            <ScientificColorScaleBar
              leftLabel="Deep Polar Shadow (0.0)"
              rightLabel="Illuminated Face (1.0)"
              gradient="linear-gradient(to right, #000000, #475569, #cbd5e1, #ffffff)"
              subLeft="Low-sun grazing relief"
              subRight="Az 315° / Alt 1.5°"
            />
          )}

          {mode === 'slope' && (
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {SLOPE_CLASSES.map((entry) => (
                  <span
                    key={entry.label}
                    className={`rounded-[var(--lm-radius-xs)] border bg-[var(--lm-color-surface-raised)] px-1 py-0.5 text-center ${entry.className}`}
                  >
                    {entry.label}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--lm-color-text-muted)]">
                <span>LOLA Altimetric Slope (GDR)</span>
                <span className="font-medium text-[var(--lm-color-danger)]">Tip-Over Limit (≥15°)</span>
              </div>
            </div>
          )}

          {mode === 'geology' && (
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {GEOLOGY_UNITS.map((unit) => (
                  <div key={unit.code} className="flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)]"
                      style={{ background: unit.hex }}
                    />
                    <span className="text-[var(--lm-color-text-secondary)]">
                      {unit.code}
                      <span className="sr-only"> — {unit.label}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-[var(--lm-color-text-muted)]">LPI Lunar South Pole Atlas</div>
            </div>
          )}

          {mode === 'illumination' && (
            <ScientificColorScaleBar
              leftLabel="0% Permanent PSR"
              leftClass="text-[var(--lm-color-text-muted)]"
              rightLabel="86%+ Quasi-Permanent"
              rightClass="text-[var(--lm-color-warning)] font-semibold"
              gradient="linear-gradient(to right, #140e3c, #1e293b, #d97706, #fbbf24)"
              subLeft="LRO Diviner + LOLA Horizon"
              subRight="Annual Climatology"
            />
          )}

          {mode === 'none' && (
            <div className="text-[11px] italic text-[var(--lm-color-text-muted)]">
              Natural optical albedo (LROC NAC controlled regional base mosaic). No terrain ramp is painted.
            </div>
          )}

          {/* What is composited over the base, exactly as the renderer received it. */}
          <div className="flex flex-col gap-1 border-t border-[var(--lm-color-border-subtle)] pt-1.5" data-testid="legend-composited-layers">
            <span className="text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]">
              Composited over base
            </span>
            <span className="leading-snug text-[var(--lm-color-text-secondary)]">
              {paintedLabels.length > 0 ? paintedLabels.join(' · ') : 'None — base layer only.'}
            </span>
            {suppressed.map((layer) => (
              <span
                key={layer.id}
                data-testid={`legend-suppressed-${layer.id}`}
                className="leading-snug text-[var(--lm-color-warning)]"
              >
                {layer.label} not drawn: {layer.reason}
              </span>
            ))}
            {rasterBroken && (
              <span role="alert" className="leading-snug text-[var(--lm-color-danger)]">
                Base raster unavailable: {baseRaster?.message ?? 'the render failed'}. The disc is not painted rather than painted with a value that was not measured.
              </span>
            )}
            {noDataCells > 0 && (
              <span className="leading-snug text-[var(--lm-color-text-muted)]">
                {noDataCells.toLocaleString()} samples hold no value and stay transparent.
              </span>
            )}
          </div>

          {/* Layer Scientific Provenance Display */}
          <ScientificProvenanceBadge mode={mode} />
        </>
      )}

      {!isExpanded && paintedLabels.length > 0 && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-[var(--lm-color-text-muted)]">{base.label}</span>
          <span className="truncate text-[11px] text-[var(--lm-color-text-secondary)]">+ {paintedLabels.join(' · ')}</span>
        </div>
      )}
    </aside>
  );
}

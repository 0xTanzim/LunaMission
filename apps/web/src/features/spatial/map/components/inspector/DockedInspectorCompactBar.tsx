import React from 'react';
import { ChevronUp, Crosshair, Droplets, MapPin, Telescope, X } from 'lucide-react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { CustomPointAnalysis } from '@/features/spatial/map/model/mapPointAnalysis';
import type { MapPointFacts } from '@/features/spatial/map/model/mapPointFacts';

export interface DockedInspectorCompactBarProps {
  hasCustomPoint: boolean;
  targetTitle: string;
  analysis?: CustomPointAnalysis | null;
  /** Elevation, slope, coverage and evaluability of the clicked point. */
  facts?: MapPointFacts | null;
  selectedSite: CandidateSite | null;
  onExpand: () => void;
  onClose: () => void;
  onOpenIntel?: () => void;
  /** Promote the inspected point to the mission's custom target. Never changes the site. */
  onUseAsCustomTarget?: () => void;
  isPromoted?: boolean;
}

const ACTION_BUTTON =
  'flex min-h-6 items-center gap-1 rounded-[var(--lm-radius-xs)] border px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)] cursor-pointer';

/**
 * Compact single-line summary strip for the 2D map point inspector.
 *
 * A click answers the first five questions immediately — where, how high, how steep, what
 * covers it, and whether anything can be evaluated there — and offers the two actions that
 * exist for an inspected point. Inspecting never changes the mission site: promoting the
 * point is a separate, explicit action.
 */
export function DockedInspectorCompactBar({
  hasCustomPoint,
  targetTitle,
  analysis,
  facts,
  selectedSite,
  onExpand,
  onClose,
  onOpenIntel,
  onUseAsCustomTarget,
  isPromoted = false,
}: DockedInspectorCompactBarProps) {
  return (
    <div
      data-testid="docked-map-inspector-compact"
      className="flex min-h-[34px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 font-mono text-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        {hasCustomPoint ? (
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--lm-color-warning)]" aria-hidden="true" />
        ) : (
          <Droplets className="h-3.5 w-3.5 shrink-0 text-[var(--lm-color-info)]" aria-hidden="true" />
        )}
        <span className="font-semibold text-[var(--lm-color-text-primary)]">{targetTitle}</span>
        {analysis && (
          <span className="text-[11px] text-[var(--lm-color-selected-site)]">
            ({analysis.distanceKm.toFixed(1)} km to {selectedSite?.code ?? 'Active'})
          </span>
        )}
        {analysis && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[var(--lm-color-sun)]">
              Sun {analysis.celestial.sunElevationDeg >= 0 ? '+' : ''}
              {analysis.celestial.sunElevationDeg.toFixed(2)}°
            </span>
            <span className="text-[var(--lm-color-earth)]">
              Earth {analysis.celestial.earthElevationDeg >= 0 ? '+' : ''}
              {analysis.celestial.earthElevationDeg.toFixed(2)}°
            </span>
          </div>
        )}
        {facts && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--lm-color-text-secondary)]">
            <span data-testid="inspector-compact-elevation">
              Elev {facts.elevationMeters >= 0 ? '+' : ''}
              {facts.elevationMeters.toFixed(0)} m
            </span>
            <span data-testid="inspector-compact-slope">Slope {facts.slopeDeg.toFixed(1)}°</span>
            <span
              data-testid="inspector-compact-evaluability"
              className={`rounded-[var(--lm-radius-xs)] border px-1 ${
                facts.evaluability.status === 'evaluable'
                  ? 'border-[var(--lm-color-success)]/40 text-[var(--lm-color-success)]'
                  : 'border-[var(--lm-color-border)] text-[var(--lm-color-text-muted)]'
              }`}
            >
              {facts.evaluability.label}
            </span>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {onOpenIntel && (
          <button
            type="button"
            onClick={onOpenIntel}
            aria-label="Open Site Intel and orbital imagery drawer"
            title="Open Site Intel & NASA Lunar Trek Reconnaissance (Key: I)"
            className={`${ACTION_BUTTON} border-[var(--lm-color-info-border)] bg-[var(--lm-color-info-surface-strong)] text-[var(--lm-color-info)] hover:border-[var(--lm-color-info)] hover:text-[var(--lm-color-text-primary)]`}
          >
            <Telescope className="h-3 w-3 text-[var(--lm-color-info)]" aria-hidden="true" />
            <span>Intel</span>
          </button>
        )}
        {hasCustomPoint && onUseAsCustomTarget && (
          <button
            type="button"
            onClick={onUseAsCustomTarget}
            data-testid="inspector-use-as-custom-target"
            aria-label="Use inspected point as custom target"
            title="Evaluate this point: it becomes the mission's custom target. The active site is unchanged."
            className={`${ACTION_BUTTON} ${
              isPromoted
                ? 'border-[var(--lm-color-warning)] bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)]'
                : 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]'
            }`}
          >
            <Crosshair className="h-3 w-3" aria-hidden="true" />
            <span>{isPromoted ? 'Custom target' : 'Use as custom target'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onExpand}
          aria-expanded="false"
          aria-label="Inspect point details"
          className={`${ACTION_BUTTON} border-[var(--lm-color-info-border)] bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-info)] hover:border-[var(--lm-color-info-border)] hover:text-[var(--lm-color-text-primary)]`}
        >
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
          <span>Inspect</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss point selection"
          title="Dismiss point selection"
          className="flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-[var(--lm-radius-xs)] p-1 text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

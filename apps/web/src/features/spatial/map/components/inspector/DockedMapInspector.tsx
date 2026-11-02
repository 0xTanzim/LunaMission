import React, { useEffect, useState } from 'react';
import { ChevronDown, Crosshair, Droplets, MapPin, X } from 'lucide-react';
import type { SelenographicCoordinate } from '@/domain/coordinates/projection';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import type { CustomPointAnalysis } from '@/features/spatial/map/model/mapPointAnalysis';
import type { MapPointFacts } from '@/features/spatial/map/model/mapPointFacts';
import { InspectorGeometryPanel } from './InspectorGeometryPanel';
import { InspectorVolatilesPanel } from './InspectorVolatilesPanel';
import { DockedInspectorCompactBar } from './DockedInspectorCompactBar';
import { encodeUsgsAcc6 } from '@/domain/sites/usgsLgrsGrid';

export interface DockedMapInspectorProps {
  customPoint?: {
    coord: SelenographicCoordinate;
    analysis: CustomPointAnalysis;
  } | null;
  customPointData?: CustomPointAnalysis | null;
  /** Elevation, slope, coverage and evaluability of the inspected coordinate. */
  facts?: MapPointFacts | null;
  selectedSite: CandidateSite | null;
  scientificMapMode?: ScientificMapLayerMode;
  initialExpanded?: boolean;
  isPromoted?: boolean;
  onClose: () => void;
  onSelectNearestSite: (site: CandidateSite) => void;
  onUseAsCustomTarget?: () => void;
  onOpenIntel?: () => void;
}

/**
 * Docked cartographic inspector bar mounted at the bottom of the 2D polar map.
 * Opens in a compact summary bar by default to preserve map viewport stability, and
 * expands into the full point readout on demand.
 *
 * Everything here describes the inspected point. It never commits a mission change: the
 * "use as custom target" action belongs to the operator and is the only thing that leaves
 * this panel with side effects.
 */
export function DockedMapInspector({
  customPoint,
  customPointData,
  facts,
  selectedSite,
  scientificMapMode = 'topography',
  initialExpanded,
  isPromoted = false,
  onClose,
  onSelectNearestSite,
  onUseAsCustomTarget,
  onOpenIntel,
}: DockedMapInspectorProps) {
  const hasCustomPoint = Boolean(customPoint || customPointData);
  const isVolatilesMode = scientificMapMode === 'volatiles' || scientificMapMode === 'temperature';

  const [isExpanded, setIsExpanded] = useState(() => {
    if (initialExpanded !== undefined) return initialExpanded;
    return !hasCustomPoint && isVolatilesMode;
  });
  const [activeTab, setActiveTab] = useState<'all' | 'geometry' | 'volatiles'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onClose]);

  if (!hasCustomPoint && !isVolatilesMode) return null;

  const coord = customPoint?.coord ?? null;
  const analysis = customPoint?.analysis ?? customPointData;
  const targetLat = coord ? coord.latitudeDeg : selectedSite ? selectedSite.coordinates.latitudeDeg : -90.0;
  const targetLon = coord ? coord.longitudeDeg : selectedSite ? selectedSite.coordinates.longitudeDeg : 0.0;
  const targetTitle = coord
    ? `Point (${Math.abs(coord.latitudeDeg).toFixed(3)}°S, ${coord.longitudeDeg.toFixed(3)}°E)`
    : selectedSite?.name ?? 'Target Location';
  const accCode = targetLat <= -80.0 && targetLat >= -90.0 ? encodeUsgsAcc6(targetLat, targetLon) : null;

  const geometryNode = coord && analysis ? (
    <InspectorGeometryPanel
      coord={coord}
      distanceKm={analysis.distanceKm}
      sunElevationDeg={analysis.celestial.sunElevationDeg}
      sunAzimuthDeg={analysis.celestial.sunAzimuthDeg}
      earthElevationDeg={analysis.celestial.earthElevationDeg}
      earthAzimuthDeg={analysis.celestial.earthAzimuthDeg}
      nearestSite={analysis.nearestSite}
      nearestDistanceKm={analysis.nearestDistanceKm}
      facts={facts}
      onSelectNearest={onSelectNearestSite}
    />
  ) : null;

  const volatilesNode = (
    <InspectorVolatilesPanel latDeg={targetLat} lonDeg={targetLon} siteName={targetTitle} />
  );

  const promoteButton = hasCustomPoint && onUseAsCustomTarget ? (
    <button
      type="button"
      onClick={onUseAsCustomTarget}
      data-testid="inspector-use-as-custom-target-expanded"
      title="Evaluate this point: it becomes the mission's custom target. The active site is unchanged."
      className={`flex min-h-6 cursor-pointer items-center gap-1 rounded-[var(--lm-radius-xs)] border px-1.5 py-0.5 text-[11px] font-mono transition-colors ${
        isPromoted
          ? 'border-[var(--lm-color-warning)] bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)]'
          : 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]'
      }`}
    >
      <Crosshair className="h-3 w-3" aria-hidden="true" />
      <span>{isPromoted ? 'Custom target' : 'Use as custom target'}</span>
    </button>
  ) : null;

  return (
    <aside
      data-testid="docked-map-inspector"
      role="region"
      aria-label="2D Map Inspector"
      className="z-30 flex w-full flex-shrink-0 select-text flex-col border-t border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)]/95 text-left backdrop-blur-md transition-all duration-200"
    >
      {!isExpanded ? (
        <DockedInspectorCompactBar
          hasCustomPoint={hasCustomPoint}
          targetTitle={targetTitle}
          analysis={analysis}
          facts={facts}
          selectedSite={selectedSite}
          onExpand={() => setIsExpanded(true)}
          onClose={onClose}
          onOpenIntel={onOpenIntel}
          onUseAsCustomTarget={onUseAsCustomTarget}
          isPromoted={isPromoted}
        />
      ) : (
        <div
          data-testid="docked-map-inspector-expanded"
          className="flex max-h-[38vh] flex-col gap-2 overflow-y-auto p-2 sm:p-2.5"
        >
          <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {hasCustomPoint ? (
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--lm-color-warning)]" aria-hidden="true" />
              ) : (
                <Droplets className="h-3.5 w-3.5 shrink-0 text-[var(--lm-color-info)]" aria-hidden="true" />
              )}
              <span className="font-mono text-xs font-bold text-[var(--lm-color-text-primary)]">{targetTitle}</span>
              {accCode && (
                <span
                  className="hidden items-center rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-success-border)] bg-[var(--lm-color-success-surface-strong)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--lm-color-success)] sm:inline-flex"
                  title="USGS ACC (100m grid)"
                >
                  ACC: {accCode}
                </span>
              )}
              <span
                className="hidden items-center rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-strong)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--lm-color-text-secondary)] md:inline-flex"
                title="Geodesy: USGS LGRS / IAU MOON_ME"
              >
                LGRS/ME
              </span>
              {hasCustomPoint && isVolatilesMode && (
                <div className="ml-2 hidden items-center gap-1 font-mono text-[11px] sm:flex">
                  {(['all', 'geometry', 'volatiles'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`min-h-6 cursor-pointer rounded-[var(--lm-radius-xs)] px-1.5 py-0.5 ${activeTab === tab ? 'border border-[var(--lm-color-info-border)] bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)]' : 'text-[var(--lm-color-text-muted)]'}`}
                    >
                      {tab === 'all' ? 'Split View' : tab === 'geometry' ? 'Geometry' : 'ISRU Volatiles'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {promoteButton}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-expanded="true"
                aria-label="Collapse point details"
                title="Collapse Inspector"
                className="flex min-h-6 cursor-pointer items-center gap-0.5 rounded-[var(--lm-radius-xs)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]"
              >
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Collapse</span>
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

          <div className="w-full">
            {hasCustomPoint && isVolatilesMode && activeTab === 'all' ? (
              <div className="grid grid-cols-1 gap-3 divide-y divide-[var(--lm-color-border-subtle)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                {geometryNode}
                <div className="pt-2 lg:pl-3 lg:pt-0">{volatilesNode}</div>
              </div>
            ) : hasCustomPoint && (activeTab === 'geometry' || !isVolatilesMode) ? (
              geometryNode
            ) : (
              volatilesNode
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

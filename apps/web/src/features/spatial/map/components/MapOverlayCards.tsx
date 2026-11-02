import React from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { SelenographicCoordinate } from '@/domain/coordinates/projection';
import { useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { SiteTelemetryCard } from '@/features/spatial/components/cards/SiteTelemetryCard';
import { HoverCandidateCard } from '@/features/spatial/components/cards/HoverCandidateCard';
import { VectorTelemetryPopover } from '@/features/spatial/components/panels/VectorTelemetryPopover';
import type { MapHoverPreview } from '@/features/spatial/map/components/MapCanvas';
import type { CustomPointAnalysis } from '@/features/spatial/map/model/mapPointAnalysis';
import type { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';

export interface MapOverlayCardsProps {
  /** Hover as tracked by the site layer; the telemetry HUD yields to any hover. */
  hoveredSite: CandidateSite | null;
  hoverPreview: MapHoverPreview | null;
  activeVectorPopover: 'sun' | 'earth' | null;
  /** Geodesic distance of the selected site from 90.0°S. */
  distanceFromPoleKm: number;
  customPoint?: { coord: SelenographicCoordinate; analysis: CustomPointAnalysis } | null;
  scientificMapMode?: ScientificMapLayerMode;
  onSelectNearest?: (site: CandidateSite) => void;
  onClearCustomPoint?: () => void;
  onCloseVectorPopover: () => void;
}

/**
 * On-map transient contextual overlays: selected-site telemetry HUD, hover preview,
 * and vector telemetry popover. Custom point and volatile cards have been relocated
 * to DockedMapInspector to ensure zero occlusion of the central polar disc.
 */
export function MapOverlayCards({
  hoveredSite,
  hoverPreview,
  activeVectorPopover,
  distanceFromPoleKm,
  customPoint,
  onCloseVectorPopover,
}: MapOverlayCardsProps) {
  const { site: selectedSite, conditions, epochIsoUtc, ephemeris } = useScenarioModel();

  return (
    <>
      {/* On-Map Site Telemetry HUD (Yields when hovering candidates or inspecting custom points) */}
      <SiteTelemetryCard
        site={selectedSite}
        sunElevationDeg={conditions.sunElevationDeg}
        sunAzimuthDeg={conditions.sunAzimuthDeg}
        earthElevationDeg={conditions.earthElevationDeg}
        earthAzimuthDeg={conditions.earthAzimuthDeg}
        distanceFromPoleKm={distanceFromPoleKm}
        visible={!activeVectorPopover && !customPoint && !hoveredSite}
      />

      {/* Hover Preview Card for Unselected Candidate (Panel 2 in Storyboard) */}
      {hoverPreview && <HoverCandidateCard site={hoverPreview.site} celestial={hoverPreview.celestial} />}

      {/* Vector Telemetry Popover for Sun / Earth Endpoint Click */}
      {activeVectorPopover && (
        <VectorTelemetryPopover
          target={activeVectorPopover}
          selectedSite={selectedSite}
          elevationDeg={activeVectorPopover === 'sun' ? conditions.sunElevationDeg : conditions.earthElevationDeg}
          azimuthDeg={activeVectorPopover === 'sun' ? conditions.sunAzimuthDeg : conditions.earthAzimuthDeg}
          subLatDeg={activeVectorPopover === 'sun' ? ephemeris.subSolarLatDeg : ephemeris.subEarthLatDeg}
          subLonDeg={activeVectorPopover === 'sun' ? ephemeris.subSolarLonDeg : ephemeris.subEarthLonDeg}
          currentIsoUtc={epochIsoUtc}
          onClose={onCloseVectorPopover}
        />
      )}
    </>
  );
}

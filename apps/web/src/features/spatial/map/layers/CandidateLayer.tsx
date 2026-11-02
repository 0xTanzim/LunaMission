import React, { useMemo } from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { DEFAULT_COMPARISON_SITE_IDS } from '@/domain/sites/catalog';
import { useSiteCatalog } from '@/features/spatial/hooks/useSiteCatalog';
import { projectLatLon } from '@/domain/coordinates/projection';
import { SelectedCandidatePin } from '@/features/spatial/map/layers/SelectedCandidatePin';
import { UnselectedCandidatePin } from '@/features/spatial/map/layers/UnselectedCandidatePin';
import { resolveCandidateLabelPlacements } from '@/features/spatial/map/model/candidatePinGeometry';

export interface CandidateLayerProps {
  selectedSite: CandidateSite;
  onSelectSite: (site: CandidateSite) => void;
  hoveredSite: CandidateSite | null;
  onHoverSite: (site: CandidateSite | null) => void;
  zoom: number;
  comparedSiteIds?: readonly string[];
  sites?: CandidateSite[];
  /** Invisible pin hit radius in viewBox units, sized by the map so it stays ≥24 CSS px. */
  hitRadiusUnits?: number;
  /** Candidate pins are an overlay: hiding them must not remove the selected site's readout. */
  visible?: boolean;
  opacity?: number;
}

/**
 * Candidate sites layer with collision-aware progressive labeling and state differentiation:
 * - Dynamic REST API catalog synchronization via useSiteCatalog.
 * - Selected candidate: drawn last with prominent halo, leader line, and boundary-clamped badge.
 * - Hovered candidate: high-contrast halo and preview vectors without altering selection.
 * - Compared candidates: distinct purple orbital indicator and accessible tags.
 * - Ordinary candidates: clean, minimal pins with collision-avoiding progressive labels.
 */
export function CandidateLayer({
  selectedSite,
  onSelectSite,
  hoveredSite,
  onHoverSite,
  zoom,
  comparedSiteIds: propComparedSiteIds,
  sites: propSites,
  hitRadiusUnits,
  visible = true,
  opacity = 1,
}: CandidateLayerProps) {
  const { sites: dynamicCatalogSites } = useSiteCatalog('all');
  const sites = propSites ?? dynamicCatalogSites;
  const activeComparedSiteIds = propComparedSiteIds ?? DEFAULT_COMPARISON_SITE_IDS;

  const selectedPos = useMemo(
    () => projectLatLon(selectedSite.coordinates.latitudeDeg, selectedSite.coordinates.longitudeDeg),
    [selectedSite]
  );

  const labelPlacements = useMemo(
    () =>
      resolveCandidateLabelPlacements({
        sites,
        selectedSite,
        hoveredSite,
        comparedSiteIds: activeComparedSiteIds,
        zoom,
      }),
    [sites, selectedSite, hoveredSite, activeComparedSiteIds, zoom]
  );

  if (!visible) return null;

  return (
    <g className="candidate-layer" opacity={opacity}>
      {sites.filter((site) => site.id !== selectedSite.id).map((site) => {
        const placement = labelPlacements.get(site.id);
        const isCompared = activeComparedSiteIds.includes(site.id);

        return (
          <UnselectedCandidatePin
            key={site.id}
            site={site}
            pos={projectLatLon(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg)}
            isHovered={hoveredSite?.id === site.id}
            isCompared={isCompared}
            labelMode={placement?.labelMode}
            tagPos={placement?.tagPos}
            labelText={placement?.labelText}
            zoom={zoom}
            hitRadiusUnits={hitRadiusUnits}
            onSelect={onSelectSite}
            onHover={onHoverSite}
          />
        );
      })}

      <SelectedCandidatePin site={selectedSite} pos={selectedPos} hitRadiusUnits={hitRadiusUnits} />
    </g>
  );
}

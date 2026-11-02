import { CandidateSite } from '@/domain/sites/candidateSite';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';
import { GlobeSceneHandle } from '@/features/spatial/globe/scene/globeSceneBuilder';
import { syncCelestialLighting } from '@/features/spatial/globe/scene/globeScene';
import { renderCelestialVectors } from '@/features/spatial/globe/scene/globeCelestialVectors';
import { updateSiteMarkerSelection } from '@/features/spatial/globe/scene/globeSiteMarkers';

export interface CelestialEpochInput {
  site: CandidateSite;
  subSolarLatDeg: SelenographicLatitudeDeg;
  subSolarLonDeg: SelenographicLongitudeDeg;
  subEarthLatDeg: SelenographicLatitudeDeg;
  subEarthLonDeg: SelenographicLongitudeDeg;
  /** Topocentric elevation at the site; null keeps the DTE link unclaimed. */
  earthElevationDeg: number | null;
  showVectors: boolean;
}

/** Sun and earthshine direction plus the vector layer — everything the epoch moves. */
export function applyCelestialEpoch(handle: GlobeSceneHandle, epoch: CelestialEpochInput): void {
  syncCelestialLighting(
    handle.globe,
    epoch.subSolarLatDeg,
    epoch.subSolarLonDeg,
    epoch.subEarthLatDeg,
    epoch.subEarthLonDeg,
  );
  renderCelestialVectors(handle.vectorsGroup, epoch);
  handle.setVectorsVisibility?.(epoch.showVectors);
}

/** Re-highlights the marker set for the newly selected candidate. */
export function applySelectedSite(handle: GlobeSceneHandle, selectedSiteId: string): void {
  handle.setSelectedSiteId?.(selectedSiteId);
  updateSiteMarkerSelection(handle.markers, selectedSiteId);
}

/** Layer visibility is a preference, so groups are switched rather than rebuilt. */
export function applyLayerVisibility(
  handle: GlobeSceneHandle,
  showGrid: boolean,
  showShadowRegions: boolean,
): void {
  if (handle.setLayerVisibility) {
    handle.setLayerVisibility(showGrid, showShadowRegions);
  } else {
    handle.graticuleGroup.visible = showGrid;
    handle.footprintGroup.visible = showShadowRegions;
  }
}

/** Updates optional layer visibility for surface, markers, and labels. */
export function applyDisplayLayers(
  handle: GlobeSceneHandle,
  options: { showTerrain?: boolean; showMarkers?: boolean; showLabels?: boolean },
): void {
  handle.setDisplayOptions?.(options);
}

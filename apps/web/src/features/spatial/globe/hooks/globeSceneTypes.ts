import type { HorizonProfileResponse } from '@luna/contracts';
import { RefObject } from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { CameraPreset, ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';
import { GlobeStatus } from '@/features/spatial/globe/scene/globeStatus';
import { GlobeDiagnosticsMetrics } from '@/features/spatial/globe/scene/globeSceneBuilder';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';

export interface UseGlobeSceneInput {
  selectedSite: CandidateSite;
  onSelectSite: (site: CandidateSite) => void;
  subSolarLatDeg: SelenographicLatitudeDeg;
  subSolarLonDeg: SelenographicLongitudeDeg;
  subEarthLatDeg: SelenographicLatitudeDeg;
  subEarthLonDeg: SelenographicLongitudeDeg;
  /** Topocentric elevation unwrapped from its availability wrapper; null is unknown. */
  earthElevationDeg: number | null;
  showGrid: boolean;
  showShadowRegions: boolean;
  showVectors: boolean;
  showLaserTracks?: boolean;
  /** Display fill lighting (ambient + earthshine + bloom), task 3.3. */
  displayFillLighting?: boolean;
  /** Task 4.4: backend curated horizon bins for the 3D skyline silhouette. */
  horizonProfile?: HorizonProfileResponse | null;
  showTerrain?: boolean;
  showMarkers?: boolean;
  showLabels?: boolean;
  scientificMapMode?: ScientificMapLayerMode;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
  isFlyoverActive?: boolean;
  onFlyoverChange?: (active: boolean) => void;
  customTarget?: CustomLandingTarget | null;
  isPinpointMode?: boolean;
  onPinpointCustomTarget?: (target: CustomLandingTarget) => void;
}

export interface UseGlobeSceneResult {
  containerRef: RefObject<HTMLDivElement | null>;
  status: GlobeStatus;
  hoveredSite: CandidateSite | null;
  applyCameraPreset: (preset: CameraPreset, site: CandidateSite) => void;
  getDiagnostics: () => GlobeDiagnosticsMetrics | null;
  restoreContext: () => boolean;
}

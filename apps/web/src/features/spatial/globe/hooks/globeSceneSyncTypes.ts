import type { HorizonProfileResponse } from '@luna/contracts';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';
import { CameraPreset, ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';
import { GlobeSceneHandle } from '@/features/spatial/globe/scene/globeSceneBuilder';

export interface GlobeSceneSyncInput {
  handleRef: { current: GlobeSceneHandle | null };
  selectedSiteIdRef: { current: string };
  selectedSite: CandidateSite;
  subSolarLatDeg: SelenographicLatitudeDeg;
  subSolarLonDeg: SelenographicLongitudeDeg;
  subEarthLatDeg: SelenographicLatitudeDeg;
  subEarthLonDeg: SelenographicLongitudeDeg;
  earthElevationDeg: number | null;
  showVectors: boolean;
  showGrid: boolean;
  showShadowRegions: boolean;
  showTerrain?: boolean;
  showMarkers?: boolean;
  showLabels?: boolean;
  showLaserTracks?: boolean;
  displayFillLighting?: boolean;
  /** Task 4.4: backend curated horizon bins for the 3D skyline silhouette. */
  horizonProfile?: HorizonProfileResponse | null;
  scientificMapMode?: ScientificMapLayerMode;
  cameraPreset: CameraPreset;
  applyCameraPreset: (preset: CameraPreset, site: CandidateSite) => void;
  customTarget?: CustomLandingTarget | null;
}

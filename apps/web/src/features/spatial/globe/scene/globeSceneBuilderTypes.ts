import * as THREE from 'three';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { GlobeScene } from '@/features/spatial/globe/scene/globeScene';
import { SiteMarker } from '@/features/spatial/globe/scene/globeSiteMarkers';
import { CameraTransitioner } from '@/features/spatial/globe/interaction/globeCameraPresets';
import { CameraPreset, ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';
import { MoonSurfaceRaycastHit } from './globePinpoint';

export interface GlobeDiagnosticsMetrics {
  fps: number;
  frameTimeMs: number;
  frameTimeP95Ms: number;
  drawCalls: number;
  triangles: number;
  cameraDistance: number;
  cameraTargetDistance: number;
  cameraNear: number;
  pixelRatio: number;
  isSoftwareGl: boolean;
  terrainLod?: string;
  terrainDemSource?: string;
  terrainEffectiveResolution?: string;
  orbitRotateSpeed?: number;
  orbitDamping?: number;
  /** Task 5.3: accumulated flyover auto-orbit angle (0–360°); undefined when flyover is off. */
  flyoverOrbitDeg?: number;
}

export interface GlobeSceneHandle {
  globe: GlobeScene;
  surfaceMesh: THREE.Mesh;
  graticuleGroup: THREE.Group;
  footprintGroup: THREE.Group;
  vectorsGroup: THREE.Group;
  markers: Map<string, SiteMarker>;
  transitioner: CameraTransitioner;
  setSelectedSiteId?: (id: string) => void;
  setScientificMode?: (mode: ScientificMapLayerMode) => void;
  setCameraPreset?: (preset: CameraPreset) => void;
  setDisplayOptions?: (opts: { showMarkers?: boolean; showLabels?: boolean; showTerrain?: boolean }) => void;
  setLayerVisibility?: (showGrid: boolean, showShadowRegions: boolean) => void;
  setVectorsVisibility?: (showVectors: boolean) => void;
  setLaserTracksVisible?: (visible: boolean) => void;
  /** Gates ambient + earthshine + bloom as one display-fill unit (task 3.3). */
  setFillLightingEnabled?: (enabled: boolean) => void;
  /** Feeds the latest backend epoch sub-points for celestial-oriented poses (task 3.3). */
  setCelestialDirections?: (epoch: {
    subSolarLatDeg: number;
    subSolarLonDeg: number;
    subEarthLatDeg: number;
    subEarthLonDeg: number;
  }) => void;
  /** Task 4.4: backend curated horizon bins drive the 3D skyline silhouette. */
  setHorizonProfile?: (profile: import('@luna/contracts').HorizonProfileResponse | null) => void;
  setFlyover?: (active?: boolean) => void;
  isFlyoverActive?: () => boolean;
  setCustomTarget?: (target: CustomLandingTarget | null) => void;
  raycastMoonSurface?: (clientX: number, clientY: number) => MoonSurfaceRaycastHit | null;
  getDiagnostics?: () => GlobeDiagnosticsMetrics;
  restoreContext?: () => boolean;
  getRecoveryState?: () => string;
  dispose: () => void;
}

export interface GlobeSceneBuildInput {
  container: HTMLDivElement;
  /** Markers are built once, so the opening selection is passed in explicitly. */
  initialSelectedSiteId: string;
  onSurfaceSettled: () => void;
  onSurfaceUnavailable: (message: string) => void;
  onHoverChange: (site: CandidateSite | null) => void;
  isSiteSelected: (siteId: string) => boolean;
  onPick: (site: CandidateSite) => void;
  onFlyoverInterrupted?: () => void;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

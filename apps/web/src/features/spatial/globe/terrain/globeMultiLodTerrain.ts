/**
 * Multi-LOD Measured Terrain Mesh Engine
 *
 * Renders verified 3D lunar South Pole topography displaced radially
 * along true spherical normals based on NASA LOLA altimetry models.
 */

import * as THREE from 'three';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';
import { CandidateSite } from '@/domain/sites/candidateSite';
import {
  sampleLolaElevationAtLatLon,
} from './lolaSouthPoleDemSampler';
import { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import {
  createLocalRegolithTexture,
  createLocalNormalTexture,
  createLocalScientificTexture,
} from './globeTerrainTextures';
import { buildSphericalPolarCapGeometry } from './globeSphericalPolarCap';

export { buildSphericalPolarCapGeometry };

export type TerrainGridResolution = '64x64' | '128x128';

export interface TerrainDiagnostics {
  currentLOD: TerrainGridResolution;
  vertexCount: number;
  triangleCount: number;
  effectiveResolution: string;
  sourceDem: string;
  isHighDetailActive: boolean;
  elevationSpanMeters: { min: number; max: number };
}

export interface MultiLodTerrainMesh {
  group: THREE.Group;
  updateLOD: (cameraDistanceToTarget: number) => void;
  updateSite: (site: CandidateSite) => void;
  setScientificMode: (mode: ScientificMapLayerMode) => void;
  getDiagnostics: () => TerrainDiagnostics;
  getTerrainDiagnostics: () => TerrainDiagnostics;
  getSurfaceElevationAt: (latDeg: number, lonDeg: number) => number;
  dispose: () => void;
}

export function createMultiLodTerrainMesh(initialSite: CandidateSite): MultiLodTerrainMesh {
  const group = new THREE.Group();
  group.name = 'MultiLodMeasuredTerrain';

  let currentSite = initialSite;
  let activeResolution: TerrainGridResolution = '64x64';
  let activeScientificMode: ScientificMapLayerMode = 'topography';

  let regolithTexture: THREE.DataTexture | null = null;
  let normalTexture = createLocalNormalTexture(currentSite);
  let currentActiveTexture: THREE.DataTexture = createLocalScientificTexture(currentSite, 'topography');

  const material = new THREE.MeshStandardMaterial({
    map: currentActiveTexture,
    normalMap: normalTexture,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.94,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -4.0,
    shadowSide: THREE.FrontSide,
  });

  let geo64 = buildSphericalPolarCapGeometry(MOON_SCENE_RADIUS, -80.0, -90.0, 64);
  let geo128 = buildSphericalPolarCapGeometry(MOON_SCENE_RADIUS, -80.0, -90.0, 128);

  const mesh = new THREE.Mesh(geo64, material);
  mesh.name = 'MeasuredTerrainMesh';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  function rebuildGeometries(site: CandidateSite) {
    geo64.dispose();
    geo128.dispose();

    geo64 = buildSphericalPolarCapGeometry(MOON_SCENE_RADIUS, -80.0, -90.0, 64);
    geo128 = buildSphericalPolarCapGeometry(MOON_SCENE_RADIUS, -80.0, -90.0, 128);

    mesh.geometry = activeResolution === '128x128' ? geo128 : geo64;

    normalTexture.dispose();
    normalTexture = createLocalNormalTexture(site);
    material.normalMap = normalTexture;

    if (activeScientificMode !== 'none') {
      currentActiveTexture.dispose();
      currentActiveTexture = createLocalScientificTexture(site, activeScientificMode);
      material.map = currentActiveTexture;
    } else {
      if (regolithTexture) regolithTexture.dispose();
      regolithTexture = createLocalRegolithTexture(site);
      material.map = regolithTexture;
    }
    material.needsUpdate = true;
  }

  function getDiagnostics(): TerrainDiagnostics {
    const activeGeo = activeResolution === '128x128' ? geo128 : geo64;
    const vertexCount = activeGeo.attributes.position ? activeGeo.attributes.position.count : 0;
    const triangleCount = activeGeo.index ? activeGeo.index.count / 3 : 0;
    const minElev = (activeGeo as unknown as { minElev?: number }).minElev ?? 0;
    const maxElev = (activeGeo as unknown as { maxElev?: number }).maxElev ?? 0;

    return {
      currentLOD: activeResolution,
      vertexCount,
      triangleCount,
      effectiveResolution: activeResolution === '128x128'
        ? '128×128 mesh grid (10° polar cap, ~2.3 km/vertex)'
        : '64×64 mesh grid (10° polar cap, ~4.6 km/vertex)',
      sourceDem:
        'IDW model over LOLA benchmark nodes (PGDA Product 90) + analytic crater morphology — not a raster DEM',
      isHighDetailActive: activeResolution === '128x128',
      elevationSpanMeters: { min: minElev, max: maxElev },
    };
  }

  return {
    group,
    updateLOD: (cameraDistanceToTarget: number) => {
      const nextResolution: TerrainGridResolution =
        activeResolution === '64x64'
          ? cameraDistanceToTarget < 0.28
            ? '128x128'
            : '64x64'
          : cameraDistanceToTarget > 0.38
            ? '64x64'
            : '128x128';

      if (nextResolution !== activeResolution) {
        activeResolution = nextResolution;
        mesh.geometry = activeResolution === '128x128' ? geo128 : geo64;
      }
    },
    updateSite: (site: CandidateSite) => {
      currentSite = site;
      rebuildGeometries(site);
    },
    setScientificMode: (mode: ScientificMapLayerMode) => {
      activeScientificMode = mode;
      if (mode === 'none') {
        if (!regolithTexture) {
          regolithTexture = createLocalRegolithTexture(currentSite);
        }
        material.map = regolithTexture;
      } else {
        if (currentActiveTexture && currentActiveTexture !== regolithTexture) {
          currentActiveTexture.dispose();
        }
        currentActiveTexture = createLocalScientificTexture(currentSite, mode);
        material.map = currentActiveTexture;
      }
      material.needsUpdate = true;
    },
    getDiagnostics,
    getTerrainDiagnostics: getDiagnostics,
    getSurfaceElevationAt: (latDeg: number, lonDeg: number) => {
      return sampleLolaElevationAtLatLon(latDeg, lonDeg);
    },
    dispose: () => {
      geo64.dispose();
      geo128.dispose();
      if (regolithTexture) regolithTexture.dispose();
      normalTexture.dispose();
      if (currentActiveTexture && currentActiveTexture !== regolithTexture) {
        currentActiveTexture.dispose();
      }
      material.dispose();
      group.clear();
    },
  };
}

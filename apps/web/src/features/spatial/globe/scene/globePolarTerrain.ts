import * as THREE from 'three';
import { LabelDeclutterManager } from './globeLabelDeclutter';
import { MOON_SCENE_RADIUS, DEEP_ZOOM_DISTANCE_UNITS, latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';
import { getSiteById, getAllAvailableSites } from '@/domain/sites/catalog';
import { createMultiLodTerrainMesh, MultiLodTerrainMesh, TerrainDiagnostics } from '@/features/spatial/globe/terrain/globeMultiLodTerrain';
import { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import { createCraterFeatures, CraterFeaturesGroup } from '../components/globeCraterFeatures';

const KM_TO_SCENE_UNITS = MOON_SCENE_RADIUS / 1737.4;

export interface PolarTerrainGroup {
  group: THREE.Group;
  craterOutlinesGroup: THREE.Group;
  craterFeatures: CraterFeaturesGroup;
  multiLodTerrain: MultiLodTerrainMesh;
  updateSelectedSite: (selectedSiteId: string) => void;
  updateLOD: (cameraDistanceToTarget: number) => void;
  setScientificMode: (mode: ScientificMapLayerMode) => void;
  setCraterOutlinesVisible: (visible: boolean) => void;
  updateCraterLabelsDeclutter: (params: {
    camera: THREE.Camera;
    viewportWidth: number;
    viewportHeight: number;
    distToTarget: number;
    showLabels?: boolean;
    badgeScreenRects: { screenX: number; screenY: number; halfWidth: number; halfHeight: number }[];
    manager: LabelDeclutterManager;
    maxCraterLabels?: number;
  }) => void;
  getTerrainDiagnostics: () => TerrainDiagnostics;
  dispose: () => void;
}

export function createPolarTerrainFeatures(initialSelectedSiteId: string): PolarTerrainGroup {
  const group = new THREE.Group();
  group.name = 'PolarTerrainFeatures';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const craterFeatures = createCraterFeatures();
  group.add(craterFeatures.outlinesGroup);

  // Malapert Massif Elevation Landmark (+5.1 km crest)
  const malapertSite = getSiteById('malapert-massif');
  if (malapertSite) {
    const massifCenter = latLonToVector3(malapertSite.coordinates.latitudeDeg, malapertSite.coordinates.longitudeDeg, MOON_SCENE_RADIUS);
    const normal = massifCenter.clone().normalize();
    const peakHeight = 5.1 * KM_TO_SCENE_UNITS;
    const ridgeDir = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
    const halfLen = 10 * KM_TO_SCENE_UNITS;

    const ridgePoints: THREE.Vector3[] = [
      massifCenter.clone().add(ridgeDir.clone().multiplyScalar(-halfLen)).add(normal.clone().multiplyScalar(peakHeight * 0.7)),
      massifCenter.clone().add(normal.clone().multiplyScalar(peakHeight)),
      massifCenter.clone().add(ridgeDir.clone().multiplyScalar(halfLen)).add(normal.clone().multiplyScalar(peakHeight * 0.7)),
    ];
    const ridgeGeo = new THREE.BufferGeometry().setFromPoints(ridgePoints);
    geometries.push(ridgeGeo);
    const ridgeMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.70, linewidth: 2.0 });
    materials.push(ridgeMat);
    craterFeatures.outlinesGroup.add(new THREE.Line(ridgeGeo, ridgeMat));
  }

  // Candidate Coordinate Benchmark (IAU 2000 ME Selenographic Datum)
  const benchmarkGroup = new THREE.Group();
  benchmarkGroup.name = 'CandidateCoordinateBenchmark';
  group.add(benchmarkGroup);

  const initialSite = getSiteById(initialSelectedSiteId) ?? getAllAvailableSites()[0];
  const multiLodTerrain = createMultiLodTerrainMesh(initialSite);
  group.add(multiLodTerrain.group);

  let manualCraterOutlinesOverride: boolean | null = null;

  function buildBenchmark(siteId: string) {
    while (benchmarkGroup.children.length > 0) {
      const child = benchmarkGroup.children[0];
      benchmarkGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) (child as any).material.dispose();
    }
    const site = getSiteById(siteId) ?? getAllAvailableSites()[0];
    const elevMeters = site.coordinates?.elevationMeters ?? 0;
    const elevSceneUnits = (elevMeters / 1000.0) * KM_TO_SCENE_UNITS;
    const sitePos = latLonToVector3(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg, MOON_SCENE_RADIUS + elevSceneUnits + 0.0006);
    const normal = sitePos.clone().normalize();
    const poleAxis = new THREE.Vector3(0, 1, 0);
    let north = poleAxis.clone().sub(normal.clone().multiplyScalar(poleAxis.dot(normal)));
    if (north.lengthSq() < 1e-6) {
      const pm = new THREE.Vector3(0, 0, 1);
      north = pm.clone().sub(normal.clone().multiplyScalar(pm.dot(normal)));
    }
    north.normalize();
    const east = new THREE.Vector3().crossVectors(north, normal).normalize();
    const span = 0.8 * KM_TO_SCENE_UNITS;
    const crossPoints = [
      sitePos.clone().add(north.clone().multiplyScalar(-span)),
      sitePos.clone().add(north.clone().multiplyScalar(span)),
      sitePos.clone().add(east.clone().multiplyScalar(-span)),
      sitePos.clone().add(east.clone().multiplyScalar(span)),
    ];
    const crossGeo = new THREE.BufferGeometry().setFromPoints(crossPoints);
    const crossMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.75, linewidth: 1.5 });
    benchmarkGroup.add(new THREE.LineSegments(crossGeo, crossMat));
  }

  buildBenchmark(initialSelectedSiteId);

  return {
    group,
    craterOutlinesGroup: craterFeatures.outlinesGroup,
    craterFeatures,
    multiLodTerrain,
    updateSelectedSite: (siteId: string) => {
      const site = getSiteById(siteId) ?? getAllAvailableSites()[0];
      buildBenchmark(siteId);
      multiLodTerrain.updateSite(site);
    },
    setScientificMode: (mode: ScientificMapLayerMode) => {
      multiLodTerrain.setScientificMode(mode);
    },
    updateLOD: (cameraDistanceToTarget: number) => {
      multiLodTerrain.updateLOD(cameraDistanceToTarget);
      if (manualCraterOutlinesOverride !== null) {
        craterFeatures.outlinesGroup.visible = manualCraterOutlinesOverride;
      } else {
        craterFeatures.outlinesGroup.visible = cameraDistanceToTarget >= DEEP_ZOOM_DISTANCE_UNITS;
      }
    },
    setCraterOutlinesVisible: (visible: boolean) => {
      manualCraterOutlinesOverride = visible;
      craterFeatures.outlinesGroup.visible = visible;
    },
    updateCraterLabelsDeclutter: (params) => {
      craterFeatures.updateLabelsDeclutter(params);
    },
    getTerrainDiagnostics: () => multiLodTerrain.getDiagnostics(),
    dispose: () => {
      multiLodTerrain.dispose();
      craterFeatures.dispose();
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if ((child as any).geometry) (child as any).geometry.dispose();
        if ((child as any).material) (child as any).material.dispose();
      }
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

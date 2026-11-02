import * as THREE from 'three';
import { MOON_SCENE_RADIUS, latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';
import { CRATERS } from '@/features/spatial/map/layers/CraterLayer';
import { createSiteBadge } from './globeBillboardBadge';
import {
  LabelDeclutterManager,
  projectLabelRect,
} from '@/features/spatial/globe/scene/globeLabelDeclutter';

const KM_TO_SCENE_UNITS = MOON_SCENE_RADIUS / 1737.4;

/** Screen-space label priorities: the selected site's badge outranks crater nomenclature. */
export const LABEL_PRIORITY_SITE_BADGE = 10;
export const LABEL_PRIORITY_CRATER = 1;

export interface CraterFeaturesGroup {
  outlinesGroup: THREE.Group;
  labelsGroup: THREE.Group;
  updateLabelsDeclutter: (params: {
    camera: THREE.Camera;
    viewportWidth: number;
    viewportHeight: number;
    distToTarget: number;
    showLabels?: boolean;
    /** Projected screen rects of the currently visible site badges (occupancy only). */
    badgeScreenRects: ReturnType<typeof projectLabelRect>[];
    manager: LabelDeclutterManager;
    /** Zoom-tier density cap (SP-11); undefined = uncapped. */
    maxCraterLabels?: number;
  }) => void;
  dispose: () => void;
}

export function createCraterFeatures(): CraterFeaturesGroup {
  const outlinesGroup = new THREE.Group();
  outlinesGroup.name = 'CraterOutlines';
  const labelsGroup = new THREE.Group();
  labelsGroup.name = 'CraterLabels';
  outlinesGroup.add(labelsGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const craterBillboards: { sprite: THREE.Sprite; position: THREE.Vector3; name: string }[] = [];

  CRATERS.forEach((crater) => {
    const center = latLonToVector3(crater.lat, crater.lon, MOON_SCENE_RADIUS);
    const normal = center.clone().normalize();
    const radiusScene = (crater.diameterKm / 2) * KM_TO_SCENE_UNITS;

    // Rim Ridge Loop
    const rimPoints: THREE.Vector3[] = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const arbitrary = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const tangent = normal.clone().cross(arbitrary).normalize();
      const bitangent = normal.clone().cross(tangent).normalize();
      const offset = tangent.clone().multiplyScalar(Math.cos(angle) * radiusScene)
        .add(bitangent.clone().multiplyScalar(Math.sin(angle) * radiusScene));
      const rimElevation = 0.8 * KM_TO_SCENE_UNITS;
      rimPoints.push(center.clone().add(offset).add(normal.clone().multiplyScalar(rimElevation)));
    }

    const rimGeo = new THREE.BufferGeometry().setFromPoints(rimPoints);
    geometries.push(rimGeo);
    const rimMat = new THREE.LineBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.50,
      linewidth: 1.5,
    });
    materials.push(rimMat);
    outlinesGroup.add(new THREE.Line(rimGeo, rimMat));

    // Nomenclature billboard for major craters
    if (crater.isMajor || crater.diameterKm >= 35) {
      const billboard = createSiteBadge(crater.name, false);
      const billboardPos = center.clone().add(normal.clone().multiplyScalar(0.018));
      billboard.position.copy(billboardPos);
      labelsGroup.add(billboard);
      craterBillboards.push({ sprite: billboard, position: billboardPos, name: crater.name });
    }
  });

  return {
    outlinesGroup,
    labelsGroup,
    updateLabelsDeclutter: ({ camera, viewportWidth, viewportHeight, distToTarget, showLabels = true, badgeScreenRects, manager, maxCraterLabels }) => {
      // At deep zoom (< 0.40 units), suppress all crater nomenclature to keep local topography clean
      const isTooClose = distToTarget < 0.40;
      if (!showLabels || isTooClose) {
        craterBillboards.forEach(({ sprite }) => {
          sprite.visible = false;
        });
        return;
      }

      // Screen-space declutter: project every crater label, hand the manager the occupied
      // site-badge rects at site-badge priority, and apply visibility + escape offsets.
      // This replaces the old 3D-distance check, which could not express what actually
      // overlaps for the user near the limb.
      const inputs = [
        ...badgeScreenRects.map((rect) => ({
          id: `badge:${rect.screenX.toFixed(1)}:${rect.screenY.toFixed(1)}`,
          priority: LABEL_PRIORITY_SITE_BADGE,
          screenX: rect.screenX,
          screenY: rect.screenY,
          halfWidth: rect.halfWidth,
          halfHeight: rect.halfHeight,
        })),
        ...craterBillboards.map(({ position, name }) => ({
          id: `crater:${name}`,
          priority: LABEL_PRIORITY_CRATER,
          ...projectLabelRect(position, camera, viewportWidth, viewportHeight),
        })),
      ];

      const placements = manager.resolve(inputs, {
        maxVisible: maxCraterLabels ?? Number.POSITIVE_INFINITY,
      });
      const byId = new Map(placements.map((p) => [p.id, p]));

      craterBillboards.forEach(({ sprite, name }) => {
        const placement = byId.get(`crater:${name}`);
        sprite.visible = placement?.visible ?? false;
        if (placement?.visible) {
          // Escape offsets shift the sprite within its own quad via `center`, keeping the
          // anchor at the crater while the text clears a contested slot.
          sprite.center.set(
            0.5 - placement.offsetX / (viewportWidth * 0.08),
            0.5 + placement.offsetY / (viewportHeight * 0.08),
          );
        }
      });
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      craterBillboards.forEach(({ sprite }) => {
        if (sprite.material.map) sprite.material.map.dispose();
        sprite.material.dispose();
      });
    },
  };
}

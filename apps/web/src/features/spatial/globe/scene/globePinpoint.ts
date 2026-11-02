/**
 * 3D Globe Pinpoint & Coordinate Raycasting Engine
 *
 * Translates Three.js 3D intersection vectors into canonical Selenographic
 * coordinates and manages high-visibility custom target beacon markers.
 */

import * as THREE from 'three';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';
import { latLonToVector3, MOON_SCENE_RADIUS } from './globeScene';
import { createSiteBadge } from './globeSiteMarkers';

export interface SelenographicCoordinate {
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface MoonSurfaceRaycastHit {
  point: THREE.Vector3;
  latDeg: number;
  lonDeg: number;
}

const CUSTOM_TARGET_COLOR = 0xf59e0b; // High-contrast amber/gold
const CUSTOM_BEACON_HEIGHT = 0.024;
const RING_INNER_RADIUS = 0.007;
const RING_OUTER_RADIUS = 0.010;

/**
 * Inverts a 3D Cartesian scene vector into Selenographic latitude and longitude.
 */
export function vector3ToLatLon(
  vector: THREE.Vector3 | { x: number; y: number; z: number },
): SelenographicCoordinate {
  const x = vector.x;
  const y = vector.y;
  const z = vector.z;
  const radius = Math.hypot(x, y, z);

  if (radius < 1e-6) {
    return { latitudeDeg: -90.0, longitudeDeg: 0.0 };
  }

  const clampedSinLat = Math.max(-1.0, Math.min(1.0, y / radius));
  const latDeg = Math.asin(clampedSinLat) * (180.0 / Math.PI);

  let lonDeg = Math.atan2(x, z) * (180.0 / Math.PI);
  if (lonDeg < 0) lonDeg += 360.0;
  if (lonDeg >= 360.0) lonDeg -= 360.0;

  return {
    latitudeDeg: Math.round(latDeg * 10000) / 10000,
    longitudeDeg: Math.round(lonDeg * 10000) / 10000,
  };
}

/**
 * Converts a client-space pointer position into normalized device coordinates for the
 * given element rect, or null when the element has no laid-out size.
 */
export function clientToNormalizedDevicePoint(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): THREE.Vector2 | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
}

/**
 * Raycasts against the moon mesh and extracts the Selenographic coordinates of the hit point.
 */
export function raycastMoonSurface(
  raycaster: THREE.Raycaster,
  moonMesh: THREE.Object3D,
): MoonSurfaceRaycastHit | null {
  const intersects = raycaster.intersectObject(moonMesh, true);
  if (!intersects.length) return null;

  const hitPoint = intersects[0].point;
  const { latitudeDeg, longitudeDeg } = vector3ToLatLon(hitPoint);

  return {
    point: hitPoint,
    latDeg: latitudeDeg,
    lonDeg: longitudeDeg,
  };
}

/**
 * Creates an interactive 3D beacon marker for a user-defined landing target.
 */
export function createCustomTargetBeacon(target: CustomLandingTarget): THREE.Group {
  const group = new THREE.Group();
  group.name = `custom-beacon-${target.id}`;
  group.userData = { targetId: target.id, target };

  const surfacePos = latLonToVector3(
    target.latitudeDeg,
    target.longitudeDeg,
    MOON_SCENE_RADIUS * 1.003,
  );
  const normal = surfacePos.clone().normalize();

  // 1. Dual-Ring Landing Target Reticle
  const ringGeom = new THREE.RingGeometry(RING_INNER_RADIUS, RING_OUTER_RADIUS, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: CUSTOM_TARGET_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.copy(surfacePos);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  group.add(ring);

  // 2. Vertical Stalk Pin
  const stalkGeom = new THREE.CylinderGeometry(0.0012, 0.0012, CUSTOM_BEACON_HEIGHT, 8);
  const stalkMat = new THREE.MeshBasicMaterial({ color: CUSTOM_TARGET_COLOR });
  const stalk = new THREE.Mesh(stalkGeom, stalkMat);
  const stalkPos = surfacePos.clone().add(normal.clone().multiplyScalar(CUSTOM_BEACON_HEIGHT / 2));
  stalk.position.copy(stalkPos);
  stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  group.add(stalk);

  // 3. Floating Diamond / Apex Marker
  const diamondGeom = new THREE.OctahedronGeometry(0.004, 0);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: CUSTOM_TARGET_COLOR,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const diamond = new THREE.Mesh(diamondGeom, diamondMat);
  const apexPos = surfacePos.clone().add(normal.clone().multiplyScalar(CUSTOM_BEACON_HEIGHT + 0.004));
  diamond.position.copy(apexPos);
  group.add(diamond);

  // 4. Floating 3D Nomenclature Billboard Badge
  const badge = createSiteBadge(target.name, true);
  const badgePos = surfacePos.clone().add(normal.clone().multiplyScalar(CUSTOM_BEACON_HEIGHT + 0.016));
  badge.position.copy(badgePos);
  group.add(badge);

  return group;
}

/**
 * Updates an existing custom beacon position or visibility.
 */
export function updateCustomTargetBeacon(
  beacon: THREE.Group,
  target: CustomLandingTarget | null,
): void {
  if (!target) {
    beacon.visible = false;
    return;
  }

  beacon.visible = true;
  beacon.userData.target = target;
  beacon.userData.targetId = target.id;

  const surfacePos = latLonToVector3(
    target.latitudeDeg,
    target.longitudeDeg,
    MOON_SCENE_RADIUS * 1.003,
  );
  const normal = surfacePos.clone().normalize();

  const [ring, stalk, diamond, badge] = beacon.children;
  if (ring) {
    ring.position.copy(surfacePos);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }
  if (stalk) {
    const stalkPos = surfacePos.clone().add(normal.clone().multiplyScalar(CUSTOM_BEACON_HEIGHT / 2));
    stalk.position.copy(stalkPos);
    stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }
  if (diamond) {
    const apexPos = surfacePos.clone().add(normal.clone().multiplyScalar(CUSTOM_BEACON_HEIGHT + 0.004));
    diamond.position.copy(apexPos);
  }
  if (badge) {
    const badgePos = surfacePos.clone().add(normal.clone().multiplyScalar(CUSTOM_BEACON_HEIGHT + 0.016));
    badge.position.copy(badgePos);
  }
}

/** Lazy custom-target beacon lifecycle for the scene builder (keeps the builder under its cap). */
export interface CustomTargetBeaconController {
  setTarget: (target: CustomLandingTarget | null) => void;
  dispose: (scene: THREE.Scene) => void;
}

export function createCustomTargetBeaconController(): CustomTargetBeaconController {
  let beacon: THREE.Group | null = null;
  return {
    setTarget: (target) => {
      if (!target) {
        if (beacon) beacon.visible = false;
        return;
      }
      if (!beacon) {
        beacon = createCustomTargetBeacon(target);
      } else {
        updateCustomTargetBeacon(beacon, target);
      }
    },
    dispose: (scene) => {
      if (!beacon) return;
      scene.remove(beacon);
      beacon = null;
    },
  };
}

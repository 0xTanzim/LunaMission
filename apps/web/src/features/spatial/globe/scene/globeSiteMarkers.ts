import * as THREE from 'three';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { getAllAvailableSites, DEFAULT_COMPARISON_SITE_IDS } from '@/domain/sites/catalog';
import { MOON_SCENE_RADIUS, DEEP_ZOOM_DISTANCE_UNITS, latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';
import { createSiteBadge } from '../components/globeBillboardBadge';

export { createSiteBadge };

const SELECTED_COLOR = 0x22d3ee, COMPARED_COLOR = 0x818cf8, COMPARED_RING_COLOR = 0xa78bfa;
const DIM_COLOR = 0x334155, UNSELECTED_BEACON_COLOR = 0x38bdf8;
const isBrowser = typeof window !== 'undefined';

export const LUNAR_RADIUS_METERS = 1737400.0, STALK_LIFT = 0.0006, STALK_HEIGHT = 0.016, BADGE_LIFT = 0.018;
const RING_INNER = 0.0055, RING_OUTER = 0.0075, RING_SEGS = 32;
const BEACON_RAD = 0.0035, BEACON_SEGS = 16, PROXY_RAD = 0.045, PROXY_SEGS = 10;
const HORIZON_OCCLUSION_DOT = -0.05;

export interface SiteMarker {
  container: THREE.Group;
  ring: THREE.Mesh;
  beacon: THREE.Mesh;
  hitProxy: THREE.Mesh;
  stalk: THREE.Line;
  badge: THREE.Sprite;
  surfacePos: THREE.Vector3;
  normal: THREE.Vector3;
  site: CandidateSite;
}

export interface SiteMarkerLayer {
  markers: Map<string, SiteMarker>;
  hitTargets: THREE.Object3D[];
}

export function computeElevationAwareMarkerRadius(elevationMeters = 0): number {
  return MOON_SCENE_RADIUS * (1.0 + elevationMeters / LUNAR_RADIUS_METERS) + STALK_LIFT;
}

export function createSiteMarkers(selectedSiteId: string, sites?: CandidateSite[]): SiteMarkerLayer {
  const markers = new Map<string, SiteMarker>();
  const hitTargets: THREE.Object3D[] = [];
  const sourceSites = sites && sites.length > 0 ? sites : getAllAvailableSites();

  sourceSites.forEach((site) => {
    const isSelected = site.id === selectedSiteId;
    const isCompared = DEFAULT_COMPARISON_SITE_IDS.includes(site.id);
    const r = computeElevationAwareMarkerRadius(site.coordinates?.elevationMeters ?? 0);
    const surfacePos = latLonToVector3(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg, r);
    const normal = surfacePos.clone().normalize();
    const beaconPos = surfacePos.clone().add(normal.clone().multiplyScalar(STALK_HEIGHT));
    const badgePos = beaconPos.clone().add(normal.clone().multiplyScalar(BADGE_LIFT));

    const container = new THREE.Group();
    container.userData = { siteId: site.id };

    const ringColor = isSelected ? SELECTED_COLOR : isCompared ? COMPARED_RING_COLOR : DIM_COLOR;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(RING_INNER, RING_OUTER, RING_SEGS),
      new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide, transparent: true, opacity: isSelected ? 0.95 : isCompared ? 0.8 : 0.45 }),
    );
    ring.position.copy(surfacePos);
    ring.lookAt(surfacePos.clone().add(normal));
    if (isSelected) ring.scale.setScalar(1.25);

    const stalkColor = isSelected ? SELECTED_COLOR : isCompared ? COMPARED_COLOR : DIM_COLOR;
    const stalk = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([surfacePos, beaconPos]),
      new THREE.LineBasicMaterial({ color: stalkColor, transparent: true, opacity: isSelected ? 0.95 : 0.35 }),
    );

    const beaconColor = isSelected ? SELECTED_COLOR : isCompared ? COMPARED_COLOR : UNSELECTED_BEACON_COLOR;
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(BEACON_RAD, BEACON_SEGS, BEACON_SEGS),
      new THREE.MeshBasicMaterial({ color: beaconColor }),
    );
    beacon.position.copy(beaconPos);
    if (isSelected) beacon.scale.setScalar(1.2);

    const hitProxy = new THREE.Mesh(
      new THREE.SphereGeometry(PROXY_RAD, PROXY_SEGS, PROXY_SEGS),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitProxy.position.copy(beaconPos);
    hitProxy.userData = { siteId: site.id };
    hitTargets.push(hitProxy);

    const shortName = site.name.replace(' Crater Rim', '').replace(' Mountain', '');
    const badge = createSiteBadge(`${site.code} • ${shortName}`, isSelected);
    badge.position.copy(badgePos);
    badge.visible = isSelected;

    container.add(ring, stalk, beacon, hitProxy, badge);
    markers.set(site.id, { container, ring, beacon, hitProxy, stalk, badge, surfacePos, normal, site });
  });

  return { markers, hitTargets };
}

export function updateSiteMarkerSelection(markers: Map<string, SiteMarker>, selectedSiteId: string): void {
  markers.forEach((marker, siteId) => {
    const isSelected = siteId === selectedSiteId;
    const isCompared = DEFAULT_COMPARISON_SITE_IDS.includes(siteId);
    const { ring, beacon, stalk, badge, container, surfacePos, normal, site } = marker;

    const ringMat = ring.material as THREE.MeshBasicMaterial;
    ringMat.color.setHex(isSelected ? SELECTED_COLOR : isCompared ? COMPARED_RING_COLOR : DIM_COLOR);
    ringMat.opacity = isSelected ? 0.95 : isCompared ? 0.8 : 0.35;
    ring.scale.setScalar(isSelected ? 1.25 : 1.0);

    const beaconMat = beacon.material as THREE.MeshBasicMaterial;
    beaconMat.color.setHex(isSelected ? SELECTED_COLOR : isCompared ? COMPARED_COLOR : UNSELECTED_BEACON_COLOR);
    beacon.scale.setScalar(isSelected ? 1.2 : 1.0);

    const stalkMat = stalk.material as THREE.LineBasicMaterial;
    stalkMat.color.setHex(isSelected ? SELECTED_COLOR : isCompared ? COMPARED_COLOR : DIM_COLOR);
    stalkMat.opacity = isSelected ? 0.95 : 0.35;

    badge.visible = isSelected;
    if (isSelected) {
      container.remove(badge);
      if (badge.material.map) badge.material.map.dispose();
      badge.material.dispose();
      const shortName = site.name.replace(' Crater Rim', '').replace(' Mountain', '');
      const selectedBadge = createSiteBadge(`${site.code} • ${shortName}`, true);
      const beaconPos = surfacePos.clone().add(normal.clone().multiplyScalar(STALK_HEIGHT));
      selectedBadge.position.copy(beaconPos.clone().add(normal.clone().multiplyScalar(BADGE_LIFT)));
      selectedBadge.visible = true;
      container.add(selectedBadge);
      markers.set(siteId, { ...marker, badge: selectedBadge });
    }
  });
}

export interface MarkerDisplayOptions {
  showMarkers?: boolean;
  showLabels?: boolean;
}

export function applyMarkerHorizonOcclusion(
  markers: Map<string, SiteMarker>,
  cameraPosition: THREE.Vector3,
  targetPosition: THREE.Vector3,
  selectedSiteId: string,
  scratch: THREE.Vector3,
  options?: MarkerDisplayOptions,
): THREE.Vector3[] {
  const showMarkers = options?.showMarkers ?? true;
  const showLabels = options?.showLabels ?? true;
  const activeBadgePositions: THREE.Vector3[] = [];

  if (!showMarkers) {
    markers.forEach(({ container }) => { container.visible = false; });
    return activeBadgePositions;
  }

  const distToTarget = cameraPosition.distanceTo(targetPosition);
  const isLocalInspection = distToTarget < DEEP_ZOOM_DISTANCE_UNITS;

  markers.forEach(({ container, ring, beacon, stalk, surfacePos, normal, badge, site }) => {
    const isSelected = site.id === selectedSiteId;
    if (isLocalInspection && !isSelected) {
      container.visible = false;
      return;
    }

    scratch.copy(cameraPosition).sub(surfacePos);
    const dist = scratch.length();
    scratch.normalize();
    const isFrontFacing = normal.dot(scratch) >= HORIZON_OCCLUSION_DOT;

    container.visible = isFrontFacing;
    if (!isFrontFacing) return;

    const scaleFactor = isLocalInspection
      ? Math.min(1.0, Math.max(0.18, dist / 1.5))
      : Math.min(1.15, Math.max(0.35, dist / 3.8));
    const finalScale = isSelected ? scaleFactor * 1.15 : scaleFactor * 0.75;
    ring.scale.setScalar(finalScale);
    beacon.scale.setScalar(finalScale);
    stalk.scale.set(finalScale, finalScale, finalScale);

    const shouldShowBadge = showLabels && isSelected && (!isLocalInspection || distToTarget >= 0.28);
    badge.visible = shouldShowBadge;
    if (shouldShowBadge) {
      const badgeScale = Math.min(1.0, Math.max(0.35, dist / 2.0));
      badge.scale.set(0.14 * badgeScale, 0.035 * badgeScale, 1);
      activeBadgePositions.push(badge.position);
    }
  });

  return activeBadgePositions;
}

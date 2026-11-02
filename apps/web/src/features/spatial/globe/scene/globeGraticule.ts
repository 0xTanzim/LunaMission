import * as THREE from 'three';
import { MOON_SCENE_RADIUS, latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';

const SELECTED_SITE_LINE_COLOR = 0x70d6c5;
const SUPPORTING_LINE_COLOR = 0x4a6585;
const GRID_LINE_COLOR = 0x334b6b;
const GRID_LINE_OPACITY = 0.28;
const PRIME_MERIDIAN_COLOR = 0x8ccbff;
const PRIME_MERIDIAN_OPACITY = 0.5;

/** Southern boundary of the 2D polar map, drawn as the globe's shadow-region footprint. */
const MAP_FOOTPRINT_LATITUDE_DEG = -83;
const FOOTPRINT_LATITUDE_RING_DEG = [-85, -88] as const;
/** Rings are lifted slightly so they never z-fight with the displaced surface. */
const FOOTPRINT_RING_LIFT = 1.008;
const INNER_RING_LIFT = 1.004;
const CROSSHAIR_LIFT = 1.01;
const CROSSHAIR_ARM_LATITUDE_DEG = -89.5;
const DASH_LENGTH = 0.04;
const DASH_GAP = 0.02;

const GLOBAL_LATITUDE_RING_DEG = [0, -30, -60, -75] as const;
const PRIME_MERIDIAN_LON_DEG = 0;
const GLOBAL_MERIDIAN_LON_DEG = [0, 90, 180, 270] as const;
const GLOBAL_GRID_LIFT = 1.002;
const FULL_CIRCLE_SEGMENTS = 96;
const GRID_SEGMENTS = 64;

function circleGeometry(latDeg: number, segments: number, radius: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const lon = (i / segments) * 360;
    points.push(latLonToVector3(latDeg, lon, radius));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function meridianGeometry(lonDeg: number, segments: number, radius: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const lat = -90 + (i / segments) * 180;
    points.push(latLonToVector3(lat, lonDeg, radius));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

/** 83°S map extent, inner latitude rings and the pole crosshair. */
export function createPolarFootprintGroup(): THREE.Group {
  const group = new THREE.Group();

  // The verified LOLA DEM regional coverage boundary (83°S to 90°S)
  const boundary = new THREE.Line(
    circleGeometry(MAP_FOOTPRINT_LATITUDE_DEG, FULL_CIRCLE_SEGMENTS, MOON_SCENE_RADIUS * FOOTPRINT_RING_LIFT),
    new THREE.LineDashedMaterial({
      color: SELECTED_SITE_LINE_COLOR,
      dashSize: DASH_LENGTH,
      gapSize: DASH_GAP,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.85,
    }),
  );
  boundary.computeLineDistances();
  group.add(boundary);

  const crosshairRadius = MOON_SCENE_RADIUS * CROSSHAIR_LIFT;
  const crosshairMat = new THREE.LineBasicMaterial({ color: SELECTED_SITE_LINE_COLOR, transparent: true, opacity: 0.75 });
  const crosshairArms = [0, 180, 90, 270].map((lon) =>
    latLonToVector3(CROSSHAIR_ARM_LATITUDE_DEG, lon, crosshairRadius),
  );
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([crosshairArms[0], crosshairArms[1]]), crosshairMat));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([crosshairArms[2], crosshairArms[3]]), crosshairMat));

  return group;
}

/** Selenographic latitude circles and meridians across the whole globe. */
export function createGraticuleGroup(): THREE.Group {
  const group = new THREE.Group();
  const radius = MOON_SCENE_RADIUS * GLOBAL_GRID_LIFT;
  const gridMat = new THREE.LineBasicMaterial({ color: GRID_LINE_COLOR, transparent: true, opacity: GRID_LINE_OPACITY });
  const primeMat = new THREE.LineBasicMaterial({
    color: PRIME_MERIDIAN_COLOR,
    transparent: true,
    opacity: PRIME_MERIDIAN_OPACITY,
  });

  GLOBAL_LATITUDE_RING_DEG.forEach((lat) => {
    group.add(new THREE.Line(circleGeometry(lat, GRID_SEGMENTS, radius), gridMat));
  });
  GLOBAL_MERIDIAN_LON_DEG.forEach((lon) => {
    group.add(new THREE.Line(meridianGeometry(lon, GRID_SEGMENTS, radius), lon === PRIME_MERIDIAN_LON_DEG ? primeMat : gridMat));
  });

  return group;
}

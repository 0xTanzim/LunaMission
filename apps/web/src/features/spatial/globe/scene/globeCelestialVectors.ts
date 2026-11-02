import * as THREE from 'three';
import { CandidateSite } from '@/domain/sites/candidateSite';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';
import { MOON_SCENE_RADIUS, latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';

const SUN_VECTOR_COLOR = 0xf59e0b;
const EARTH_VECTOR_COLOR = 0x38bdf8;
/** Warning amber DTE link when Earth is below the local geometric horizon. */
const BLOCKED_LINK_COLOR = 0xf59e0b;
/** Muted slate link when Earth elevation is unavailable/unknown. */
const UNKNOWN_LINK_COLOR = 0x94a3b8;

const VECTOR_ORIGIN_LIFT = 1.018;

/** Visual display distances for apparent sky-direction targets (clearly disclosed in legend as not to physical scale). */
const SUN_SPHERE_DISTANCE = 5.2;
const SUN_SPHERE_RADIUS = 0.22;
const SUN_CORONA_SPRITE_SIZE = 0.85;

const EARTH_SPHERE_DISTANCE = 4.8;
const EARTH_SPHERE_RADIUS = 0.18;
const EARTH_ATMOSPHERE_RADIUS = 0.192;
const EARTH_ATMOSPHERE_OPACITY = 0.25;

const LINK_OPEN_DASH = 0.14;
const LINK_OPEN_GAP = 0.05;
const LINK_OPEN_OPACITY = 0.9;
const LINK_BLOCKED_DASH = 0.05;
const LINK_BLOCKED_GAP = 0.07;
const LINK_BLOCKED_OPACITY = 0.5;

export interface CelestialVectorInput {
  showVectors: boolean;
  site: CandidateSite;
  subSolarLatDeg: SelenographicLatitudeDeg;
  subSolarLonDeg: SelenographicLongitudeDeg;
  subEarthLatDeg: SelenographicLatitudeDeg;
  subEarthLonDeg: SelenographicLongitudeDeg;
  /** Topocentric elevation at the site; null means visibility is unknown, not blocked. */
  earthElevationDeg: number | null;
}

import {
  createEarthCanvasTexture,
  createSunCoronaSprite,
  createCelestialLabel,
} from './celestialVectorAssets';


/** Empties the layer and disposes all allocated textures, geometries, and materials. */
export function clearCelestialVectors(group: THREE.Group): void {
  group.children.slice().forEach((child) => {
    group.remove(child);
    if (child instanceof THREE.Sprite) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
      return;
    }
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      if (child.geometry) child.geometry.dispose();
      const material = child.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((m) => {
          if ('map' in m && m.map) (m.map as THREE.Texture).dispose();
          m.dispose();
        });
      } else if (material) {
        if ('map' in material && material.map) (material.map as THREE.Texture).dispose();
        material.dispose();
      }
    }
  });
}

/**
 * Renders the Sun (luminous light source + corona) and Earth (realistic planetary disc + atmosphere)
 * strictly synchronized with canonical ephemeris coordinates and observer sightlines.
 */
/**
 * Renders the Sun (luminous light source + corona) and Earth (realistic planetary disc + atmosphere)
 * strictly synchronized with canonical ephemeris coordinates and observer sightlines.
 * Reuses existing scene objects and textures to eliminate memory allocations and GPU thrashing.
 */
export function renderCelestialVectors(group: THREE.Group, input: CelestialVectorInput): void {
  if (!input.showVectors) {
    clearCelestialVectors(group);
    return;
  }

  const origin = latLonToVector3(
    input.site.coordinates.latitudeDeg,
    input.site.coordinates.longitudeDeg,
    MOON_SCENE_RADIUS * VECTOR_ORIGIN_LIFT,
  );

  const sunOrbPos = latLonToVector3(input.subSolarLatDeg, input.subSolarLonDeg, SUN_SPHERE_DISTANCE);
  const earthOrbPos = latLonToVector3(input.subEarthLatDeg, input.subEarthLonDeg, EARTH_SPHERE_DISTANCE);

  const isElevationKnown = input.earthElevationDeg !== null;
  const hasLineOfSight = input.earthElevationDeg !== null && input.earthElevationDeg > 0;

  const earthStatusText = !isElevationKnown
    ? '⊕ EARTH [ELEVATION UNKNOWN]'
    : hasLineOfSight
      ? '⊕ EARTH • GEOMETRIC SIGHTLINE'
      : '⊕ EARTH [SUB-HORIZON]';

  const earthLabelColor = !isElevationKnown
    ? '#94a3b8'
    : hasLineOfSight
      ? '#38bdf8'
      : '#f59e0b';

  const linkColor = !isElevationKnown
    ? UNKNOWN_LINK_COLOR
    : hasLineOfSight
      ? EARTH_VECTOR_COLOR
      : BLOCKED_LINK_COLOR;

  const linkDash = hasLineOfSight ? LINK_OPEN_DASH : LINK_BLOCKED_DASH;
  const linkGap = hasLineOfSight ? LINK_OPEN_GAP : LINK_BLOCKED_GAP;
  const linkOpacity = !isElevationKnown ? 0.35 : hasLineOfSight ? LINK_OPEN_OPACITY : LINK_BLOCKED_OPACITY;

  // If 8 vector objects are already allocated, perform zero-allocation in-place update:
  if (group.children.length === 8) {
    const sunMesh = group.children[0] as THREE.Mesh;
    const coronaSprite = group.children[1] as THREE.Sprite;
    const sunLabel = group.children[2] as THREE.Sprite;
    const sunRay = group.children[3] as THREE.Line;
    const earthMesh = group.children[4] as THREE.Mesh;
    const atmosphereMesh = group.children[5] as THREE.Mesh;
    const earthLabel = group.children[6] as THREE.Sprite;
    const linkLine = group.children[7] as THREE.Line;

    sunMesh.position.copy(sunOrbPos);
    coronaSprite.position.copy(sunOrbPos);
    sunLabel.position.copy(sunOrbPos.clone().add(sunOrbPos.clone().normalize().multiplyScalar(0.32)));

    sunRay.geometry.setFromPoints([sunOrbPos, origin]);
    sunRay.computeLineDistances();

    earthMesh.position.copy(earthOrbPos);
    atmosphereMesh.position.copy(earthOrbPos);
    const sunDirFromEarth = sunOrbPos.clone().sub(earthOrbPos).normalize();
    earthMesh.lookAt(earthOrbPos.clone().add(sunDirFromEarth));
    earthMesh.rotateZ(-0.41);

    // Update earth label if status text changed
    if (earthLabel.userData.text !== earthStatusText) {
      if (earthLabel.material.map) earthLabel.material.map.dispose();
      earthLabel.material.dispose();
      group.remove(earthLabel);
      const newLabel = createCelestialLabel(earthStatusText, earthLabelColor);
      newLabel.userData = { text: earthStatusText };
      newLabel.position.copy(earthOrbPos.clone().add(earthOrbPos.clone().normalize().multiplyScalar(0.28)));
      // Insert back at index 6
      group.children.splice(6, 0, newLabel);
    } else {
      earthLabel.position.copy(earthOrbPos.clone().add(earthOrbPos.clone().normalize().multiplyScalar(0.28)));
    }

    const currentLinkLine = group.children[7] as THREE.Line;
    currentLinkLine.geometry.setFromPoints([origin, earthOrbPos]);
    const linkMat = currentLinkLine.material as THREE.LineDashedMaterial;
    linkMat.color.setHex(linkColor);
    linkMat.dashSize = linkDash;
    linkMat.gapSize = linkGap;
    linkMat.opacity = linkOpacity;
    currentLinkLine.computeLineDistances();
    return;
  }

  // Initial allocation of the 8 vector elements:
  clearCelestialVectors(group);

  // 1. SUN
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_SPHERE_RADIUS, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe082 })
  );
  sunMesh.position.copy(sunOrbPos);
  group.add(sunMesh);

  const coronaSprite = createSunCoronaSprite();
  coronaSprite.position.copy(sunOrbPos);
  group.add(coronaSprite);

  const sunLabel = createCelestialLabel('☀ SUN', '#f59e0b');
  sunLabel.position.copy(sunOrbPos.clone().add(sunOrbPos.clone().normalize().multiplyScalar(0.32)));
  group.add(sunLabel);

  const sunRay = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([sunOrbPos, origin]),
    new THREE.LineDashedMaterial({
      color: SUN_VECTOR_COLOR,
      dashSize: 0.16,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.65,
    })
  );
  sunRay.computeLineDistances();
  group.add(sunRay);

  // 2. EARTH
  const earthTexture = createEarthCanvasTexture();
  const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_SPHERE_RADIUS, 36, 36),
    new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.65,
      metalness: 0.05,
    })
  );
  earthMesh.position.copy(earthOrbPos);
  const initialSunDirFromEarth = sunOrbPos.clone().sub(earthOrbPos).normalize();
  earthMesh.lookAt(earthOrbPos.clone().add(initialSunDirFromEarth));
  earthMesh.rotateZ(-0.41);
  group.add(earthMesh);

  const atmosphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_ATMOSPHERE_RADIUS, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      roughness: 0.2,
      metalness: 0.0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
  );
  atmosphereMesh.position.copy(earthOrbPos);
  group.add(atmosphereMesh);

  const earthLabel = createCelestialLabel(earthStatusText, earthLabelColor);
  earthLabel.userData = { text: earthStatusText };
  earthLabel.position.copy(earthOrbPos.clone().add(earthOrbPos.clone().normalize().multiplyScalar(0.28)));
  group.add(earthLabel);

  const linkLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([origin, earthOrbPos]),
    new THREE.LineDashedMaterial({
      color: linkColor,
      dashSize: linkDash,
      gapSize: linkGap,
      transparent: true,
      opacity: linkOpacity,
    })
  );
  linkLine.computeLineDistances();
  group.add(linkLine);
}

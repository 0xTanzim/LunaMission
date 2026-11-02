import * as THREE from 'three';
import { MOON_SCENE_RADIUS, latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';
import { LOLA_POLAR_CRATER_MORPHOLOGIES } from '@luna/contracts';
import { sampleLolaElevationAtLatLon } from '@/domain/terrain/lolaSouthPoleDemSampler';

/**
 * PSR boundary overlay (SP-7): rim-crest boundary polylines plus a 45° hatched fill for
 * every crater flagged `isDeepPsr` in `LOLA_POLAR_CRATER_MORPHOLOGIES`, mirroring the
 * 2D map's `psr-hatch` convention (dark diagonal hatch, never a solid shaded disc).
 *
 * Display-only geometry from declared inputs: the loop is draped on the frontend IDW
 * sampler surface (the same declared display model the terrain mesh uses) and scaled by
 * the morphology rim diameter. It is NOT a measured PSR boundary — `PSR_PROVENANCE_NOTE`
 * must accompany it wherever a legend renders.
 */

export const PSR_PROVENANCE_NOTE =
  'PSR footprint modeled from crater morphology; PGDA 78 uncertainty not applied.';

const DEEP_PSR_CRATERS = LOLA_POLAR_CRATER_MORPHOLOGIES.filter((c) => c.isDeepPsr);

const KM_TO_SCENE_UNITS = MOON_SCENE_RADIUS / 1737.4;
/** Relief lift so hatch + boundary never z-fight with the displaced terrain mesh. */
const SURFACE_LIFT = 0.0035;
const FLOOR_DROP_UNITS = 0.001;

const BOUNDARY_COLOR = 0x2a3f55;

/**
 * Procedural 45° hatch as a DataTexture — deterministic and headless-testable (no
 * canvas), tiling seamlessly: dark strokes (matching the 2D `psr-hatch` stroke color)
 * over a low-alpha dark background.
 */
const HATCH_LINE_RGB: readonly [number, number, number] = [17, 28, 41]; // #111c29
const HATCH_BG_ALPHA = 77; // ~0.30

function createHatchTexture(): THREE.DataTexture {
  const size = 64;
  const period = 16;
  const lineHalfWidth = 1.2;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // 45° diagonal: x + y modulo the period lands inside the stroke band.
      const diagonal = (x + y) % period;
      const onLine = diagonal < 2 * lineHalfWidth || diagonal > period - 2 * lineHalfWidth;
      data[i] = HATCH_LINE_RGB[0];
      data[i + 1] = HATCH_LINE_RGB[1];
      data[i + 2] = HATCH_LINE_RGB[2];
      data[i + 3] = onLine ? 235 : HATCH_BG_ALPHA;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/** Drapes a rim-radius circle for one crater over the modeled sampler surface. */
function createBoundaryLine(
  craterName: string,
  centerLat: number,
  centerLon: number,
  diameterKm: number,
): THREE.Line {
  const center = latLonToVector3(centerLat, centerLon, MOON_SCENE_RADIUS);
  const normal = center.clone().normalize();
  const rimRadiusScene = (diameterKm / 2) * KM_TO_SCENE_UNITS;

  const arbitrary = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = normal.clone().cross(arbitrary).normalize();
  const bitangent = normal.clone().cross(tangent).normalize();

  const segments = 96;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const offset = tangent
      .clone()
      .multiplyScalar(Math.cos(angle) * rimRadiusScene)
      .add(bitangent.clone().multiplyScalar(Math.sin(angle) * rimRadiusScene));
    const rimPoint = center.clone().add(offset);
    // Drape: normalize onto the sphere, then lift by the modeled surface elevation.
    const direction = rimPoint.clone().normalize();
    const latDeg = 90 - (Math.acos(direction.y) * 180) / Math.PI;
    let lonDeg = (Math.atan2(direction.x, direction.z) * 180) / Math.PI;
    if (lonDeg < 0) lonDeg += 360;
    const elevMeters = sampleLolaElevationAtLatLon(latDeg, lonDeg);
    const radius = MOON_SCENE_RADIUS + (elevMeters / 1000) * KM_TO_SCENE_UNITS + SURFACE_LIFT;
    points.push(direction.multiplyScalar(radius));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: BOUNDARY_COLOR,
    transparent: true,
    opacity: 0.85,
  });
  const line = new THREE.Line(geometry, material);
  line.name = `psr-boundary:${craterName}`;
  return line;
}

function createHatchFill(craterName: string, centerLat: number, centerLon: number, diameterKm: number): THREE.Mesh {
  const center = latLonToVector3(centerLat, centerLon, MOON_SCENE_RADIUS);
  const normal = center.clone().normalize();
  const rimRadiusScene = (diameterKm / 2) * KM_TO_SCENE_UNITS * 0.96;

  const geometry = new THREE.CircleGeometry(rimRadiusScene, 64);
  const material = new THREE.MeshBasicMaterial({
    map: createHatchTexture(),
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  // Repeat the hatch so the line spacing stays legible at crater scale.
  material.map!.repeat.set(rimRadiusScene * 14, rimRadiusScene * 14);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `psr-fill:${craterName}`;
  mesh.position.copy(center).addScaledVector(normal, SURFACE_LIFT - FLOOR_DROP_UNITS);
  mesh.lookAt(center.clone().add(normal));
  mesh.renderOrder = 2;
  return mesh;
}

export interface PsrOverlay {
  group: THREE.Group;
  /** Names of the craters whose modeled footprint this overlay paints. */
  psrCraterNames: string[];
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

export function createPsrOverlay(): PsrOverlay {
  const group = new THREE.Group();
  group.name = 'PsrOverlay';

  const textures: THREE.Texture[] = [];
  for (const crater of DEEP_PSR_CRATERS) {
    const fill = createHatchFill(crater.name, crater.centerLatDeg, crater.centerLonDeg, crater.diameterKm);
    if (fill.material instanceof THREE.MeshBasicMaterial && fill.material.map) {
      textures.push(fill.material.map);
    }
    group.add(fill);
    group.add(createBoundaryLine(crater.name, crater.centerLatDeg, crater.centerLonDeg, crater.diameterKm));
  }

  return {
    group,
    psrCraterNames: DEEP_PSR_CRATERS.map((c) => c.name),
    setVisible: (visible) => {
      group.visible = visible;
    },
    dispose: () => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          child.geometry.dispose();
          const material = child.material as THREE.Material & { map?: THREE.Texture };
          if (material.map) material.map.dispose();
          material.dispose();
        }
      });
      textures.forEach((t) => t.dispose());
    },
  };
}

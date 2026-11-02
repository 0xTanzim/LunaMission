import * as THREE from 'three';
import type { CandidateSite, HorizonProfileResponse } from '@luna/contracts';
import { MOON_SCENE_RADIUS, latLonToVector3 } from './globeScene';
import { createCelestialDiscTexture } from './celestialVectorAssets';

/**
 * 3D skyline silhouette (task 4.4): the backend curated horizon bins drawn as a
 * draped silhouette ring on the selected site's tangent plane, plus Sun/Earth
 * sprites riding the backend epoch tangent directions. Display model: mask
 * elevation angles are projected onto a small tangent-plane disc (SKYLINE_RADIUS)
 * — an honest visual of the backend profile, not a re-derived terrain product.
 */

/** Radius of the tangent-plane skyline disc, in scene units (~35 km at polar scale). */
export const SKYLINE_RADIUS_UNITS = 0.03;

export interface SkylineCelestialDirections {
  sunTangent: THREE.Vector3;
  earthTangent: THREE.Vector3;
}

export interface SkylineOverlay {
  group: THREE.Group;
  dispose: (scene: THREE.Scene) => void;
}

const SKYLINE_FLOOR_UNITS = 0.002;
const SKYLINE_SPRITE_UNITS = 0.006;

export function createSkylineOverlay(
  site: CandidateSite,
  profile: HorizonProfileResponse,
  celestial?: SkylineCelestialDirections,
): SkylineOverlay {
  const group = new THREE.Group();
  group.name = 'horizon-skyline-overlay';

  const sitePos = latLonToVector3(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg, MOON_SCENE_RADIUS);
  const normal = sitePos.clone().normalize();
  const north = Math.abs(normal.y) > 0.9999
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(0, 1, 0).sub(normal.clone().multiplyScalar(normal.y)).normalize();
  const east = north.clone().cross(normal).normalize().negate();

  const positions: number[] = [];
  for (let i = 0; i <= profile.bins.length; i++) {
    const bin = profile.bins[i % profile.bins.length]!;
    const az = (bin.azimuthDeg * Math.PI) / 180;
    const radial = east.clone().multiplyScalar(Math.cos(az)).add(north.clone().multiplyScalar(Math.sin(az)));
    // Mask angle projected onto the tangent disc; positive mask rises above the floor.
    const height = SKYLINE_FLOOR_UNITS + Math.tan((bin.maskElevationDeg * Math.PI) / 180) * SKYLINE_RADIUS_UNITS * 0.25;
    const point = sitePos
      .clone()
      .add(radial.multiplyScalar(SKYLINE_RADIUS_UNITS))
      .add(normal.clone().multiplyScalar(Math.max(SKYLINE_FLOOR_UNITS, height)));
    positions.push(point.x, point.y, point.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.85 });
  const silhouette = new THREE.Line(geometry, material);
  silhouette.name = 'horizon-skyline-silhouette';
  silhouette.renderOrder = 3;
  group.add(silhouette);

  if (celestial) {
    const makeSprite = (name: string, dir: THREE.Vector3, color: string) => {
      const disc = createCelestialDiscTexture(color);
      const sprite = new THREE.Sprite(
        disc
          ? new THREE.SpriteMaterial({ map: disc, depthTest: false, transparent: true })
          : new THREE.SpriteMaterial({ color: new THREE.Color(color), depthTest: false, transparent: true }),
      );
      sprite.name = name;
      // Ride the ring in the celestial azimuth direction so the marker sits on the silhouette.
      sprite.position.copy(sitePos).add(dir.clone().normalize().multiplyScalar(SKYLINE_RADIUS_UNITS * 0.92));
      sprite.scale.set(SKYLINE_SPRITE_UNITS, SKYLINE_SPRITE_UNITS, 1);
      sprite.renderOrder = 4;
      return sprite;
    };
    group.add(makeSprite('skyline-sun-sprite', celestial.sunTangent, '#fbbf24'));
    group.add(makeSprite('skyline-earth-sprite', celestial.earthTangent, '#06b6d4'));
  }

  return {
    group,
    dispose: (scene: THREE.Scene) => {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
      group.traverse((child) => {
        if (child instanceof THREE.Sprite) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      });
      group.removeFromParent();
    },
  };
}

/** Replaces the current skyline overlay in one step; null profile removes it. */
export function updateSkylineOverlay(
  scene: THREE.Scene,
  existing: SkylineOverlay | null,
  site: CandidateSite,
  profile: HorizonProfileResponse | null,
  celestial?: SkylineCelestialDirections,
): SkylineOverlay | null {
  existing?.dispose(scene);
  if (!profile) return null;
  const overlay = createSkylineOverlay(site, profile, celestial);
  scene.add(overlay.group);
  return overlay;
}

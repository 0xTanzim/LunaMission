/**
 * NASA SVS 3633 LRO LOLA Laser Altimeter Orbital Ground Tracks
 *
 * Renders 36 converging orbital laser ground tracks crossing the lunar South Pole
 * with elevation color coding matching official NASA SVS 3727 LOLA hypsometry.
 */

import * as THREE from 'three';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';
import { sampleLolaElevationAtLatLon } from '@/features/spatial/globe/terrain/lolaSouthPoleDemSampler';
import { getPolarElevationRgb } from '@/domain/terrain/nasaSvsColorRamp';

const MOON_RADIUS_METERS = 1737400;
const RADIAL_OFFSET = 0.002; // Small offset to avoid z-fighting against terrain cap

export interface LaserTracksGroup {
  readonly group: THREE.Group;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

export function createLaserTracksGroup(numPasses = 36, pointsPerPass = 60): LaserTracksGroup {
  const group = new THREE.Group();
  group.name = 'LaserGroundTracks';

  const positions: number[] = [];
  const colors: number[] = [];

  for (let pass = 0; pass < numPasses; pass++) {
    const lon1 = (pass * 360.0) / (numPasses * 2);
    const lon2 = (lon1 + 180.0) % 360.0;

    for (let i = 0; i < pointsPerPass - 1; i++) {
      const t1 = i / (pointsPerPass - 1);
      const t2 = (i + 1) / (pointsPerPass - 1);

      const [lat1, trackLon1] = samplePassCoord(t1, lon1, lon2);
      const [lat2, trackLon2] = samplePassCoord(t2, lon1, lon2);

      const p1 = computeTrackPoint(lat1, trackLon1);
      const p2 = computeTrackPoint(lat2, trackLon2);

      // Polar-domain ramp: the global ±9 km ramp compressed the cap into two yellow stops.
      const rgb1 = getPolarElevationRgb(p1.elev);
      const rgb2 = getPolarElevationRgb(p2.elev);

      positions.push(p1.pos.x, p1.pos.y, p1.pos.z, p2.pos.x, p2.pos.y, p2.pos.z);
      colors.push(
        rgb1[0] / 255, rgb1[1] / 255, rgb1[2] / 255,
        rgb2[0] / 255, rgb2[1] / 255, rgb2[2] / 255
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    linewidth: 1.5,
  });

  const lineSegments = new THREE.LineSegments(geometry, material);
  group.add(lineSegments);

  return {
    group,
    setVisible: (visible: boolean) => {
      group.visible = visible;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      group.clear();
    },
  };
}

function samplePassCoord(t: number, lon1: number, lon2: number): [number, number] {
  // t: 0 -> 0.5 travels from -80 to -90 on lon1, 0.5 -> 1.0 travels from -90 to -80 on lon2
  if (t <= 0.5) {
    const lat = -80.0 + (t / 0.5) * (-90.0 - -80.0);
    return [lat, lon1];
  } else {
    const lat = -90.0 + ((t - 0.5) / 0.5) * (-80.0 - -90.0);
    return [lat, lon2];
  }
}

function computeTrackPoint(latDeg: number, lonDeg: number): { pos: THREE.Vector3; elev: number } {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;

  const nx = Math.cos(latRad) * Math.sin(lonRad);
  const ny = Math.sin(latRad);
  const nz = Math.cos(latRad) * Math.cos(lonRad);

  const elev = sampleLolaElevationAtLatLon(latDeg, lonDeg);
  const rScene = MOON_SCENE_RADIUS * (1.0 + elev / MOON_RADIUS_METERS) + RADIAL_OFFSET;

  return {
    pos: new THREE.Vector3(nx * rScene, ny * rScene, nz * rScene),
    elev,
  };
}

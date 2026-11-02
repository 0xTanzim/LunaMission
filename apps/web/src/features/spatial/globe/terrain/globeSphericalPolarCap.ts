/**
 * Seamless Spherical Polar Cap Topography Mesh
 *
 * Replaces planar tangent patches and dropoff skirts with a continuous
 * radial spherical cap mesh covering 80°S to 90°S. Displaces vertices
 * purely along true spherical normals based on NASA LOLA altimetry.
 */

import * as THREE from 'three';
import { sampleLolaElevationAtLatLon } from './lolaSouthPoleDemSampler';

const MOON_RADIUS_METERS = 1737400;

export function buildSphericalPolarCapGeometry(
  sceneRadius: number,
  minLatDeg: number = -80.0,
  maxLatDeg: number = -90.0,
  segments: number = 64
): THREE.BufferGeometry {
  const latSegments = Math.max(8, Math.round(segments / 2));
  const lonSegments = Math.max(16, segments);

  const numVerticesLat = latSegments + 1;
  const numVerticesLon = lonSegments + 1;
  const totalVertices = numVerticesLat * numVerticesLon;

  const positions = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);
  const indices: number[] = [];

  let minElev = Infinity;
  let maxElev = -Infinity;

  let vertexIndex = 0;

  for (let i = 0; i <= latSegments; i++) {
    const latFraction = i / latSegments;
    const latDeg = minLatDeg + latFraction * (maxLatDeg - minLatDeg);
    const latRad = (latDeg * Math.PI) / 180;

    // Smooth feather weight at the boundary (-80 deg) so edge matches reference sphere radius
    const edgeDistanceDeg = Math.abs(latDeg - minLatDeg);
    const featherWeight = Math.min(1, Math.max(0, edgeDistanceDeg / 1.5));

    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);

    for (let j = 0; j <= lonSegments; j++) {
      const lonFraction = j / lonSegments;
      const lonDeg = lonFraction * 360.0;
      const lonRad = (lonDeg * Math.PI) / 180;

      // Unit normal on sphere
      const nx = cosLat * Math.sin(lonRad);
      const ny = sinLat;
      const nz = cosLat * Math.cos(lonRad);

      const rawElevationMeters = sampleLolaElevationAtLatLon(latDeg, lonDeg);
      if (rawElevationMeters < minElev) minElev = rawElevationMeters;
      if (rawElevationMeters > maxElev) maxElev = rawElevationMeters;

      const effectiveOffset = rawElevationMeters * featherWeight;
      const rScene = sceneRadius * (1.0 + effectiveOffset / MOON_RADIUS_METERS);

      const posIdx = vertexIndex * 3;
      positions[posIdx] = nx * rScene;
      positions[posIdx + 1] = ny * rScene;
      positions[posIdx + 2] = nz * rScene;

      const uvIdx = vertexIndex * 2;
      uvs[uvIdx] = lonFraction;
      uvs[uvIdx + 1] = latFraction;

      vertexIndex++;
    }
  }

  // Generate triangle strip indices
  for (let i = 0; i < latSegments; i++) {
    for (let j = 0; j < lonSegments; j++) {
      const a = i * numVerticesLon + j;
      const b = (i + 1) * numVerticesLon + j;
      const c = (i + 1) * numVerticesLon + (j + 1);
      const d = i * numVerticesLon + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  (geometry as unknown as { minElev: number; maxElev: number }).minElev = minElev;
  (geometry as unknown as { minElev: number; maxElev: number }).maxElev = maxElev;

  return geometry;
}

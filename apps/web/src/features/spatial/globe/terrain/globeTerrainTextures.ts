/**
 * Procedural Terrain Textures for Lunar South Pole
 *
 * Generates local albedo, normal map, and scientific data textures
 * matching LOLA topography, Diviner thermal, and geological layers.
 */

import * as THREE from 'three';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';
import {
  sampleTerrainAtLatLon,
  getSlopeRgb,
  getGeologyUnitRgb,
  getIlluminationRgb,
} from './lolaSouthPoleDemSampler';
import { getNasaSvsElevationRgb } from '@/domain/terrain/nasaSvsColorRamp';
import { getVolatilesRgb, getTemperatureRgb } from '@/domain/volatiles/volatileColorMaps';
import { evaluateLendNeutronFlux, evaluateDivinerTemperature } from '@/domain/volatiles/thermalNeutronModels';
import { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';

export function createLocalRegolithTexture(site: CandidateSite, patchRadiusKm = 110.0): THREE.DataTexture {
  const width = 128;
  const height = 128;
  const data = new Uint8Array(width * height * 4);

  const centerLat = site.coordinates.latitudeDeg;
  const centerLon = site.coordinates.longitudeDeg;
  const centerPos = latLonToVector3(centerLat, centerLon, 1.0).normalize();

  const poleAxis = new THREE.Vector3(0, 1, 0);
  let north = poleAxis.clone().sub(centerPos.clone().multiplyScalar(poleAxis.dot(centerPos)));
  if (north.lengthSq() < 1e-6) {
    const pm = new THREE.Vector3(0, 0, 1);
    north = pm.clone().sub(centerPos.clone().multiplyScalar(pm.dot(centerPos)));
  }
  north.normalize();
  const east = new THREE.Vector3().crossVectors(north, centerPos).normalize();
  const moonRadiusKm = 1737.4;

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    const yKm = (v - 0.5) * (2 * patchRadiusKm);

    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      const xKm = (u - 0.5) * (2 * patchRadiusKm);

      const ptOnTangentKm = centerPos
        .clone()
        .multiplyScalar(moonRadiusKm)
        .add(east.clone().multiplyScalar(xKm))
        .add(north.clone().multiplyScalar(yKm));

      const unitDir = ptOnTangentKm.normalize();
      const lat = Math.asin(Math.max(-1, Math.min(1, unitDir.y))) * (180 / Math.PI);
      let lon = Math.atan2(unitDir.x, unitDir.z) * (180 / Math.PI);
      if (lon < 0) lon += 360;

      const sample = sampleTerrainAtLatLon(lat, lon);
      const n1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const rand1 = n1 - Math.floor(n1);
      const microGrain = (rand1 - 0.5) * 8;

      const hillFactor = 0.5 + 0.55 * sample.hillshade;
      const baseTone = 172 + microGrain;
      const val = Math.max(30, Math.min(235, Math.round(baseTone * hillFactor)));

      const idx = (y * width + x) * 4;
      data[idx] = val;
      data[idx + 1] = Math.max(0, val - 2);
      data[idx + 2] = Math.max(0, val - 3);
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createLocalNormalTexture(site: CandidateSite, patchRadiusKm = 110.0): THREE.DataTexture {
  const width = 128;
  const height = 128;
  const data = new Uint8Array(width * height * 4);

  const centerLat = site.coordinates.latitudeDeg;
  const centerLon = site.coordinates.longitudeDeg;
  const centerPos = latLonToVector3(centerLat, centerLon, 1.0).normalize();

  const poleAxis = new THREE.Vector3(0, 1, 0);
  let north = poleAxis.clone().sub(centerPos.clone().multiplyScalar(poleAxis.dot(centerPos)));
  if (north.lengthSq() < 1e-6) {
    const pm = new THREE.Vector3(0, 0, 1);
    north = pm.clone().sub(centerPos.clone().multiplyScalar(pm.dot(centerPos)));
  }
  north.normalize();
  const east = new THREE.Vector3().crossVectors(north, centerPos).normalize();
  const moonRadiusKm = 1737.4;
  const stepKm = (2 * patchRadiusKm) / (width - 1);

  const sampleElev = (xKm: number, yKm: number): number => {
    const pt = centerPos
      .clone()
      .multiplyScalar(moonRadiusKm)
      .add(east.clone().multiplyScalar(xKm))
      .add(north.clone().multiplyScalar(yKm));
    const dir = pt.normalize();
    const lat = Math.asin(Math.max(-1, Math.min(1, dir.y))) * (180 / Math.PI);
    let lon = Math.atan2(dir.x, dir.z) * (180 / Math.PI);
    if (lon < 0) lon += 360;
    return sampleTerrainAtLatLon(lat, lon).elevationMeters;
  };

  const normalScale = 0.003;

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    const yKm = (v - 0.5) * (2 * patchRadiusKm);

    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      const xKm = (u - 0.5) * (2 * patchRadiusKm);

      const elevL = sampleElev(xKm - stepKm, yKm);
      const elevR = sampleElev(xKm + stepKm, yKm);
      const elevB = sampleElev(xKm, yKm - stepKm);
      const elevT = sampleElev(xKm, yKm + stepKm);

      const dx = (elevR - elevL) / (2 * stepKm * 1000);
      const dy = (elevT - elevB) / (2 * stepKm * 1000);

      let nx = -dx * normalScale * 1000;
      let ny = -dy * normalScale * 1000;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * width + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createLocalScientificTexture(
  site: CandidateSite,
  mode: ScientificMapLayerMode,
  patchRadiusKm = 105.0
): THREE.DataTexture {
  const width = 128;
  const height = 128;
  const data = new Uint8Array(width * height * 4);

  const centerLat = site.coordinates.latitudeDeg;
  const centerLon = site.coordinates.longitudeDeg;
  const centerPos = latLonToVector3(centerLat, centerLon, 1.0).normalize();

  const poleAxis = new THREE.Vector3(0, 1, 0);
  let north = poleAxis.clone().sub(centerPos.clone().multiplyScalar(poleAxis.dot(centerPos)));
  if (north.lengthSq() < 1e-6) {
    const pm = new THREE.Vector3(0, 0, 1);
    north = pm.clone().sub(centerPos.clone().multiplyScalar(pm.dot(centerPos)));
  }
  north.normalize();
  const east = new THREE.Vector3().crossVectors(north, centerPos).normalize();
  const moonRadiusKm = 1737.4;

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    const yKm = (v - 0.5) * (2 * patchRadiusKm);

    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      const xKm = (u - 0.5) * (2 * patchRadiusKm);

      const ptOnTangentKm = centerPos
        .clone()
        .multiplyScalar(moonRadiusKm)
        .add(east.clone().multiplyScalar(xKm))
        .add(north.clone().multiplyScalar(yKm));

      const unitDir = ptOnTangentKm.normalize();
      const lat = Math.asin(Math.max(-1, Math.min(1, unitDir.y))) * (180 / Math.PI);
      let lon = Math.atan2(unitDir.x, unitDir.z) * (180 / Math.PI);
      if (lon < 0) lon += 360;

      const sample = sampleTerrainAtLatLon(lat, lon);
      let rgb: [number, number, number];

      switch (mode) {
        case 'topography':
          rgb = getNasaSvsElevationRgb(sample.elevationMeters);
          break;
        case 'hillshade': {
          const val = Math.round(sample.hillshade * 255);
          rgb = [val, val, val];
          break;
        }
        case 'slope':
          rgb = getSlopeRgb(sample.slopeDeg);
          break;
        case 'geology':
          rgb = getGeologyUnitRgb(sample.geologicalUnitCode);
          break;
        case 'illumination':
          rgb = getIlluminationRgb(sample.annualIlluminationPct, sample.isPermanentlyShadowed);
          break;
        case 'volatiles': {
          const neutron = evaluateLendNeutronFlux(lat, lon);
          rgb = getVolatilesRgb(neutron.hydrogenWeightPct);
          break;
        }
        case 'temperature': {
          const thermal = evaluateDivinerTemperature(lat, lon);
          rgb = getTemperatureRgb(thermal.tempKelvin);
          break;
        }
        default:
          rgb = [172, 170, 168];
      }

      const idx = (y * width + x) * 4;
      data[idx] = rgb[0];
      data[idx + 1] = rgb[1];
      data[idx + 2] = rgb[2];
      data[idx + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

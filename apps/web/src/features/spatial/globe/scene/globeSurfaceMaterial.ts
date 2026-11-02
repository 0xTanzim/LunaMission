import * as THREE from 'three';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';
import { getNasaSvsElevationNormalizedRgb } from '@/domain/terrain/nasaSvsColorRamp';
import { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';

const LROC_COLOR_TEXTURE_URL = '/assets/lunar/lroc_color_2k.jpg';
const LROC_POLAR_FALLBACK_TEXTURE_URL = '/assets/lunar/lroc_color_poles_1k.jpg';
const LOLA_DEM_TEXTURE_URL = '/assets/lunar/ldem_topo.jpg';

/** Smooth 128x128 sphere geometry for high-performance, seamless lunar curvature. */
const MOON_SPHERE_SEGMENTS = 128;
const REGOLITH_ROUGHNESS = 0.94;
const REGOLITH_METALNESS = 0.0;
const REGOLITH_TINT = 0xdbe0e8;

/** Calibrated subtle relief settings to eliminate spiky polygon artifacts while preserving crater morphology. */
const NORMAL_MAP_STRENGTH = 1.15;
const NORMAL_SCALE = 0.45;
const BUMP_SCALE = 0.015;

/** Prime meridian sits at the centre of the equirectangular maps, which is +Z in this scene. */
const TEXTURE_PRIME_MERIDIAN_ROTATION_Y = -Math.PI / 2;

/**
 * Pure function to map 8-bit heightmap pixels to the NASA SVS 3727 color ramp.
 * Computes luminance and converts into NASA 16-stop LOLA hypsometry.
 */
export function generateSvsFalseColorPixels(data: Uint8ClampedArray): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255.0;
    const [r, g, b] = getNasaSvsElevationNormalizedRgb(gray);
    output[i] = r;
    output[i + 1] = g;
    output[i + 2] = b;
    output[i + 3] = 255;
  }
  return output;
}

/** High-fidelity normal map built from the LOLA DEM through a Sobel gradient. */
function generateNormalMapFromImage(image: HTMLImageElement, strength: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  const heights = new Float32Array(w * h);
  for (let i = 0; i < heights.length; i++) {
    const idx = i * 4;
    heights[i] = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255.0;
  }

  for (let y = 0; y < h; y++) {
    const yAbove = (y > 0 ? y - 1 : y) * w;
    const yBelow = (y < h - 1 ? y + 1 : y) * w;
    const yCenter = y * w;

    for (let x = 0; x < w; x++) {
      const xLeft = x > 0 ? x - 1 : x;
      const xRight = x < w - 1 ? x + 1 : x;

      const dx =
        (heights[yAbove + xRight] + 2 * heights[yCenter + xRight] + heights[yBelow + xRight]) -
        (heights[yAbove + xLeft] + 2 * heights[yCenter + xLeft] + heights[yBelow + xLeft]);

      const dy =
        (heights[yBelow + xLeft] + 2 * heights[yBelow + x] + heights[yBelow + xRight]) -
        (heights[yAbove + xLeft] + 2 * heights[yAbove + x] + heights[yAbove + xRight]);

      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const outIdx = (yCenter + x) * 4;

      data[outIdx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[outIdx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[outIdx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      data[outIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/** Generates NASA SVS 3727 false-color hypsometric texture from DEM heightmap. */
function generateSvsFalseColorTexture(image: HTMLImageElement): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const falseColorData = generateSvsFalseColorPixels(imgData.data);
  for (let i = 0; i < imgData.data.length; i++) {
    imgData.data[i] = falseColorData[i];
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export interface MoonSurfaceHandlers {
  onTextureSettled: () => void;
  onSurfaceUnavailable: (message: string) => void;
}

export interface MoonSurface {
  mesh: THREE.Mesh;
  setScientificMode: (mode: ScientificMapLayerMode) => void;
  dispose: () => void;
}

/** NASA LROC color mosaic plus calibrated LOLA DEM shading applied to the Moon sphere. */
export function createMoonSurface({ onTextureSettled, onSurfaceUnavailable }: MoonSurfaceHandlers): MoonSurface {
  const textureLoader = new THREE.TextureLoader();

  const colorTexture = textureLoader.load(LROC_COLOR_TEXTURE_URL, onTextureSettled, undefined, (err) => {
    console.warn('NASA LROC color texture failed to load, falling back to pole mosaic', err);
    textureLoader.load(LROC_POLAR_FALLBACK_TEXTURE_URL, onTextureSettled, undefined, () => {
      onSurfaceUnavailable('Failed to load NASA LROC surface textures');
    });
  });
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.ClampToEdgeWrapping;

  const material = new THREE.MeshStandardMaterial({
    map: colorTexture,
    roughness: REGOLITH_ROUGHNESS,
    metalness: REGOLITH_METALNESS,
    color: new THREE.Color(REGOLITH_TINT),
  });

  const topoImage = new Image();
  topoImage.src = LOLA_DEM_TEXTURE_URL;
  let topoTexture: THREE.Texture | null = null;
  let normalTexture: THREE.CanvasTexture | null = null;
  let svsTexture: THREE.CanvasTexture | null = null;
  let activeMode: ScientificMapLayerMode = 'topography';

  const applyActiveTexture = () => {
    if (activeMode === 'topography' && svsTexture) {
      material.map = svsTexture;
      material.color.setHex(0xffffff);
    } else {
      material.map = colorTexture;
      material.color.setHex(REGOLITH_TINT);
    }
    material.needsUpdate = true;
  };

  topoImage.onload = () => {
    topoTexture = new THREE.Texture(topoImage);
    topoTexture.needsUpdate = true;
    topoTexture.wrapS = THREE.RepeatWrapping;
    topoTexture.wrapT = THREE.ClampToEdgeWrapping;

    normalTexture = generateNormalMapFromImage(topoImage, NORMAL_MAP_STRENGTH);
    svsTexture = generateSvsFalseColorTexture(topoImage);

    material.bumpMap = topoTexture;
    material.bumpScale = BUMP_SCALE;
    material.normalMap = normalTexture;
    material.normalScale = new THREE.Vector2(NORMAL_SCALE, NORMAL_SCALE);

    applyActiveTexture();
    onTextureSettled();
  };

  topoImage.onerror = () => {
    console.warn('LOLA DEM image load failed');
    onTextureSettled();
  };

  // Adjust base sphere radius to clear negative elevation crater floors (e.g. Shackleton at -4.2 km)
  // Deepest lunar south pole depressions reach -9.0 km relative to mean lunar datum (1737.4 km) (e.g. South Pole-Aitken floor / NASA SVS bounds)
  const BASE_SPHERE_RADIUS = MOON_SCENE_RADIUS * (1.0 - 9200.0 / 1737400.0);
  const geometry = new THREE.SphereGeometry(BASE_SPHERE_RADIUS, MOON_SPHERE_SEGMENTS, MOON_SPHERE_SEGMENTS);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.y = TEXTURE_PRIME_MERIDIAN_ROTATION_Y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return {
    mesh,
    setScientificMode: (mode: ScientificMapLayerMode) => {
      activeMode = mode;
      applyActiveTexture();
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      colorTexture.dispose();
      if (topoTexture) topoTexture.dispose();
      if (normalTexture) normalTexture.dispose();
      if (svsTexture) svsTexture.dispose();
    },
  };
}

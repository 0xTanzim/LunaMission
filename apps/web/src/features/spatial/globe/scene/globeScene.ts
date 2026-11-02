import * as THREE from 'three';
import { createCelestialStarfield } from './globeSceneStarfield';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';

/** The globe is modelled in scene units, not metres; this is the Moon sphere radius. */
export const MOON_SCENE_RADIUS = 1.45;

/**
 * Camera-to-target distance at which overview reference geometry (graticule, footprint,
 * PSR overlay, vectors, crater outlines, non-selected markers) yields to close-range
 * terrain inspection. Must stay below the opening cap framing distance (0.5) and above
 * the local inspection altitude (0.085) — see globeDeepZoomThreshold.test.ts.
 */
export const DEEP_ZOOM_DISTANCE_UNITS = 0.15;

const SCENE_BACKGROUND = 0x070b12;
const CAMERA_FOV_DEG = 38;
export const CAMERA_NEAR = 0.001;

const CAMERA_FAR = 100;
/**
 * Opening pose: cap-centered South Pole view matching the `nadir` preset — hovering 0.5
 * units above the 85°S cap center (surface point (0, −1.4445, 0.1264)), prime-meridian
 * north held up. The cap fills ~74% of the vertical half-FOV, so the polar terrain is
 * the opening subject rather than a distant whole-Moon disc.
 */
const INITIAL_CAMERA_POSITION: readonly [number, number, number] = [0, -1.94448, 0.16997];
const INITIAL_CAMERA_TARGET: readonly [number, number, number] = [0, -1.44448, 0.12639];
const INITIAL_CAMERA_UP: readonly [number, number, number] = [0, 0.08716, 0.99619];
const CONTROL_DAMPING_FACTOR = 0.05;
export const CONTROL_MIN_DISTANCE = 0.015;
export const CONTROL_MAX_DISTANCE = 14.0;

const SUN_LIGHT_COLOR = 0xfffef5;
const SUN_LIGHT_INTENSITY = 3.2;
const SUN_SHADOW_MAP_SIZE = 2048;
const SUN_SHADOW_CAMERA_EXTENT = 2.2;
const SUN_SHADOW_NEAR = 0.5;
const SUN_SHADOW_FAR = 30;
const SUN_SHADOW_BIAS = -0.00015;
const EARTHSHINE_LIGHT_COLOR = 0x7dd3fc;
const EARTHSHINE_LIGHT_INTENSITY = 0.08;
const AMBIENT_SPACE_LIGHT_COLOR = 0x050a14;
const AMBIENT_SPACE_LIGHT_INTENSITY = 0.03;
/** Directional lights sit far along their body-fixed direction so rays read as parallel. */
const SUN_LIGHT_DISTANCE = 18.0;
const EARTHSHINE_LIGHT_DISTANCE = 15.0;
/** Opening pose before the first epoch is applied: Earth-side +Z. */
const EARTHSHINE_INITIAL_DISTANCE = 10;

/**
 * Selenographic lat/lon → scene Cartesian.
 * Lat: +90° North (+Y), -90° South (-Y). Lon: 0° prime meridian facing Earth (+Z),
 * +90° East (+X), 270° West (-X).
 */
export function latLonToVector3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = lonDeg * (Math.PI / 180);
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);
  return new THREE.Vector3(x, y, z);
}

export interface GlobeScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  sunLight: THREE.DirectionalLight;
  earthLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  composer?: EffectComposer;
  /** The bloom pass itself satisfies `{ strength: number }` for the fill-lighting gate. */
  bloomPass?: { strength: number };
  starfield?: THREE.Points;
}


/** Detects software WebGL implementations (SwiftShader, llvmpipe) to tune performance. */
export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return true;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : (gl as any).RENDERER;
    const gpu = String((gl as any).getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

/** False when the host cannot give the globe a WebGL context at all. */
export function isWebGlAvailable(): boolean {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/** Renderer, camera, controls and the three lights, sized to the mount container. */
export function createGlobeScene(width: number, height: number): GlobeScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BACKGROUND);

  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV_DEG,
    width / height,
    CAMERA_NEAR,
    CAMERA_FAR,
  );
  camera.position.set(...INITIAL_CAMERA_POSITION);
  camera.up.set(...INITIAL_CAMERA_UP);
  camera.lookAt(...INITIAL_CAMERA_TARGET);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha: false,
    powerPreference: 'high-performance',
    logarithmicDepthBuffer: true,
  });
  renderer.setSize(width, height);
  // Cap at 1.0 on software WebGL, or 1.75 on GPU to eliminate 4K / retina fullscreen fillrate lag
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = CONTROL_DAMPING_FACTOR;
  controls.minDistance = CONTROL_MIN_DISTANCE;
  controls.maxDistance = CONTROL_MAX_DISTANCE;
  // Guard against spherical coordinate singularities at the exact poles
  controls.minPolarAngle = 0.015;
  controls.maxPolarAngle = Math.PI - 0.015;
  controls.target.set(...INITIAL_CAMERA_TARGET);

  const sunLight = new THREE.DirectionalLight(SUN_LIGHT_COLOR, SUN_LIGHT_INTENSITY);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = SUN_SHADOW_MAP_SIZE;
  sunLight.shadow.mapSize.height = SUN_SHADOW_MAP_SIZE;
  sunLight.shadow.camera.near = SUN_SHADOW_NEAR;
  sunLight.shadow.camera.far = SUN_SHADOW_FAR;
  sunLight.shadow.camera.left = -SUN_SHADOW_CAMERA_EXTENT;
  sunLight.shadow.camera.right = SUN_SHADOW_CAMERA_EXTENT;
  sunLight.shadow.camera.top = SUN_SHADOW_CAMERA_EXTENT;
  sunLight.shadow.camera.bottom = -SUN_SHADOW_CAMERA_EXTENT;
  sunLight.shadow.bias = SUN_SHADOW_BIAS;
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(AMBIENT_SPACE_LIGHT_COLOR, AMBIENT_SPACE_LIGHT_INTENSITY);
  scene.add(ambientLight);

  const earthLight = new THREE.DirectionalLight(EARTHSHINE_LIGHT_COLOR, EARTHSHINE_LIGHT_INTENSITY);
  earthLight.position.set(0, 0, EARTHSHINE_INITIAL_DISTANCE);
  scene.add(earthLight);

  // 3D Procedural Starfield Sphere
  const starfield = createCelestialStarfield();
  scene.add(starfield);

  // Hardware GPU Post-Processing Pipeline (Bloom, Tone Mapping, Anti-Aliasing)
  let composer: EffectComposer | undefined;
  let bloomPassRef: UnrealBloomPass | undefined;
  if (!isSoftwareGl) {
    try {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.28, // Natural grazing solar bloom strength
        0.35, // Glow radius
        0.88, // Luminance threshold (blinding solar peaks and Sun disc only)
      );
      composer.addPass(bloomPass);
      bloomPassRef = bloomPass;

      try {
        const smaaPass = new SMAAPass();
        composer.addPass(smaaPass);
      } catch {
        // Fallback gracefully if SMAAPass fails in specific environment
      }
    } catch {
      composer = undefined;
    }
  }

  return { scene, camera, renderer, controls, sunLight, earthLight, ambientLight, composer, bloomPass: bloomPassRef, starfield };
}

/**
 * The three "display fill" light sources (ambient, earthshine, bloom) as one honest
 * unit (task 3.3): they exist for screen readability and are never lunar physics, so
 * the toggle turns them all off together. The Sun directional light is NOT fill — it is
 * the epoch-accurate solar illumination and stays on.
 */
export interface FillLightingTargets {
  ambientLight: THREE.AmbientLight;
  earthLight: THREE.DirectionalLight;
  bloom: { strength: number };
}

const FILL_AMBIENT_INTENSITY = AMBIENT_SPACE_LIGHT_INTENSITY;
const FILL_EARTHSHINE_INTENSITY = EARTHSHINE_LIGHT_INTENSITY;
const FILL_BLOOM_STRENGTH = 0.28;

export function applyFillLightingState(targets: FillLightingTargets, enabled: boolean): void {
  targets.ambientLight.intensity = enabled ? FILL_AMBIENT_INTENSITY : 0;
  targets.earthLight.intensity = enabled ? FILL_EARTHSHINE_INTENSITY : 0;
  targets.bloom.strength = enabled ? FILL_BLOOM_STRENGTH : 0;
}

/** Aim the Sun and Earthshine lights at the sub-solar and sub-Earth points of the epoch. */
export function syncCelestialLighting(
  scene: GlobeScene,
  subSolarLatDeg: SelenographicLatitudeDeg,
  subSolarLonDeg: SelenographicLongitudeDeg,
  subEarthLatDeg: SelenographicLatitudeDeg,
  subEarthLonDeg: SelenographicLongitudeDeg,
): void {
  scene.sunLight.position.copy(latLonToVector3(subSolarLatDeg, subSolarLonDeg, SUN_LIGHT_DISTANCE));
  scene.earthLight.position.copy(
    latLonToVector3(subEarthLatDeg, subEarthLonDeg, EARTHSHINE_LIGHT_DISTANCE),
  );
}

/** ResizeObserver wiring for the builder (keeps the builder under its line cap). */
export function attachResizeHandling(container: HTMLElement, globe: GlobeScene): ResizeObserver {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const { width, height } of entries.map((e) => e.contentRect)) {
      if (width <= 0 || height <= 0) continue;
      globe.camera.aspect = width / height;
      globe.camera.updateProjectionMatrix();
      globe.renderer.setSize(width, height);
      globe.composer?.setSize(width, height);
    }
  });
  resizeObserver.observe(container);
  return resizeObserver;
}

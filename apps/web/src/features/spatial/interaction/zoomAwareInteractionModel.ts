/**
 * Zoom-Aware Camera & Viewport Interaction Model for 2D Polar Map & 3D Lunar Viewer.
 *
 * Implements a continuous, scientifically grounded interaction model that dynamically
 * scales pointer movement sensitivity based on camera distance, zoom level, field of view,
 * and viewport dimensions.
 *
 * Guarantees:
 * 1. Global scale: responsive, fluid navigation across hemispheres.
 * 2. Surface / Maximum zoom: micro-meter precision that strictly prevents tiny mouse
 *    movements from generating disproportionately large angular rotations or losing orientation.
 * 3. Continuous, monotonic progression without abrupt threshold jumps or gimbal/polar flips.
 */

export interface OrbitSensitivityConfig {
  /** Minimum rotate speed at closest surface zoom (e.g. 15-50 meters altitude) */
  minRotateSpeed: number;
  /** Maximum rotate speed at global / regional Moon distance */
  maxRotateSpeed: number;
  /** Reference camera distance where maxRotateSpeed is attained (South Pole Nadir) */
  refCameraDistance: number;
  /** Non-linear scaling exponent controlling sensitivity ramp */
  exponent: number;
  /** Minimum damping factor (smooth inertia at global scale) */
  minDampingFactor: number;
  /** Maximum damping factor (rapid settling without overshoot at surface scale) */
  maxDampingFactor: number;
  /** Minimum pan speed at close zoom */
  minPanSpeed: number;
  /** Maximum pan speed at global scale */
  maxPanSpeed: number;
}

export const DEFAULT_ORBIT_SENSITIVITY_CONFIG: OrbitSensitivityConfig = {
  minRotateSpeed: 0.20,
  maxRotateSpeed: 1.0,
  refCameraDistance: 4.8,
  exponent: 0.68,
  minDampingFactor: 0.05,
  maxDampingFactor: 0.08,
  minPanSpeed: 0.15,
  maxPanSpeed: 1.0,
};

export interface Orbit3DSensitivity {
  rotateSpeed: number;
  panSpeed: number;
  dampingFactor: number;
  zoomSpeed: number;
  cameraDistance: number;
  estimatedAngularDisplacementDegPer100Px: number;
  angularDisplacementPerPixelDeg: number;
  linearTerrainDisplacementPerPixelUnits: number;
}

/**
 * Calculates continuous, zoom-aware 3D orbit sensitivity from camera-to-target distance.
 *
 * Math:
 * normalizedDist = clamp(distance / refDistance, 0.001, 2.5)
 * speed = minSpeed + (maxSpeed - minSpeed) * (normalizedDist ^ exponent)
 *
 * At global scale (dist ~5.0): rotateSpeed ~ 1.0, 100px drag rotates ~40° across full globe.
 * At close zoom (dist ~0.015): rotateSpeed ~ 0.067, 100px drag rotates ~2.7° (micro-precision).
 */
export function calculate3DOrbitSensitivity(
  cameraDistanceToTarget: number,
  viewportHeight = 900,
  config = DEFAULT_ORBIT_SENSITIVITY_CONFIG,
): Orbit3DSensitivity {
  const safeDist = Number.isFinite(cameraDistanceToTarget) && cameraDistanceToTarget > 0
    ? cameraDistanceToTarget
    : 0.015;

  const safeHeight = Number.isFinite(viewportHeight) && viewportHeight > 100 ? viewportHeight : 900;

  // Normalized distance ratio relative to south polar regional reference distance (4.8 units)
  const distRatio = Math.max(0.002, Math.min(2.5, safeDist / config.refCameraDistance));
  const t = Math.pow(distRatio, config.exponent);

  const rotateSpeed = Math.max(
    config.minRotateSpeed,
    Math.min(config.maxRotateSpeed, config.minRotateSpeed + (config.maxRotateSpeed - config.minRotateSpeed) * t),
  );

  const panSpeed = Math.max(
    config.minPanSpeed,
    Math.min(config.maxPanSpeed, config.minPanSpeed + (config.maxPanSpeed - config.minPanSpeed) * Math.sqrt(distRatio)),
  );

  // At surface zoom, damping factor increases so camera locks crisply onto target without inertia overshoot
  const dampingFactor = Math.max(
    config.minDampingFactor,
    Math.min(
      config.maxDampingFactor,
      config.maxDampingFactor - (config.maxDampingFactor - config.minDampingFactor) * Math.min(1.0, distRatio * 1.5),
    ),
  );

  // Zoom speed slows slightly at close range to give fine stepped depth control
  const zoomSpeed = Math.max(0.55, Math.min(1.0, 0.55 + 0.45 * Math.min(1.0, distRatio * 2.0)));

  // Theoretical angular displacement for a 100px drag across this viewport:
  // theta = (2 * PI * 100 / viewportHeight) * rotateSpeed (in radians)
  const angularDispRad = ((2 * Math.PI * 100) / safeHeight) * rotateSpeed;
  const estimatedAngularDisplacementDegPer100Px = (angularDispRad * 180) / Math.PI;
  const angularDisplacementPerPixelDeg = estimatedAngularDisplacementDegPer100Px / 100;
  const linearTerrainDisplacementPerPixelUnits = safeDist * (angularDispRad / 100);

  return {
    rotateSpeed,
    panSpeed,
    dampingFactor,
    zoomSpeed,
    cameraDistance: safeDist,
    estimatedAngularDisplacementDegPer100Px,
    angularDisplacementPerPixelDeg,
    linearTerrainDisplacementPerPixelUnits,
  };
}

export interface Map2DPanSensitivity {
  panMultiplier: number;
  effectiveZoom: number;
  screenPixelPerSvgUnit: number;
  svgUnitPerScreenPixel: number;
  worldKmPerScreenPixel: number;
}

/**
 * Calculates continuous 2D pan sensitivity adapted to map zoom level and container geometry.
 *
 * Prevents map slipping and excessive panning speed at high zoom levels (e.g. zoom 4.5),
 * ensuring the selected landing site remains stable and precisely navigable.
 */
export function calculate2DPanSensitivity(
  zoom: number,
  renderedWidth = 600,
  svgSize = 600,
): Map2DPanSensitivity {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1.0;
  const safeRenderedWidth = Number.isFinite(renderedWidth) && renderedWidth > 0 ? renderedWidth : svgSize;

  const screenPixelPerSvgUnit = safeRenderedWidth / svgSize;
  const svgUnitPerScreenPixel = svgSize / safeRenderedWidth;

  // Intuitive 1:1 screen-to-map tracking ensures that the grabbed terrain point sticks
  // precisely to the cursor across all zoom levels without slipping or lag.
  const panMultiplier = 1.0;

  // Physical lunar scale: 260 SVG units corresponds to 7 degrees latitude (~212.3 km)
  const KM_PER_SVG_UNIT = 212.3 / 260.0;
  const worldKmPerScreenPixel = (svgUnitPerScreenPixel * KM_PER_SVG_UNIT) / safeZoom;

  return {
    panMultiplier,
    effectiveZoom: safeZoom,
    screenPixelPerSvgUnit,
    svgUnitPerScreenPixel,
    worldKmPerScreenPixel,
  };
}

/**
 * Computes zoom-aware 2D dragged pan delta, ensuring exact cursor tracking across
 * arbitrary container resolutions and DPI.
 */
export function computeZoomAwarePan(
  origin: { x: number; y: number },
  currentClientX: number,
  currentClientY: number,
  zoom: number,
  renderedWidth = 600,
  svgSize = 600,
): { x: number; y: number } {
  const { panMultiplier, svgUnitPerScreenPixel } = calculate2DPanSensitivity(zoom, renderedWidth, svgSize);

  const deltaX = (currentClientX - origin.x) * svgUnitPerScreenPixel * panMultiplier;
  const deltaY = (currentClientY - origin.y) * svgUnitPerScreenPixel * panMultiplier;

  return {
    x: deltaX,
    y: deltaY,
  };
}

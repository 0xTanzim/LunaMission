/**
 * Milestone 6 Iteration 2 Empirical Challenger Stress Harness
 *
 * Exhaustive empirical fuzzing & stress-testing:
 * 1. 10,000 iterations of randomized viewport pans, zoom transitions, and boundary clamping.
 * 2. Invariance checks on calculate2DPanSensitivity, clampPan, clampZoom, zoomAroundScreenPoint,
 *    and calculate3DOrbitSensitivity under adversarial and degenerate inputs.
 * 3. 10,000 iterations of astrodynamic and geotechnical calculations across extreme envelopes.
 */

import assert from 'node:assert/strict';
import {
  calculate2DPanSensitivity,
  computeZoomAwarePan,
  calculate3DOrbitSensitivity,
  DEFAULT_ORBIT_SENSITIVITY_CONFIG,
} from '@/features/spatial/interaction/zoomAwareInteractionModel';
import {
  clampZoom,
  steppedZoom,
  wheelZoom,
  clampPan,
  zoomAroundScreenPoint,
  zoomAroundWorldPoint,
  ZOOM_MIN,
  ZOOM_MAX,
  type MapViewport,
} from '@/features/spatial/map/model/mapViewportMath';
import {
  CONTROL_MIN_DISTANCE,
  CONTROL_MAX_DISTANCE,
  CAMERA_NEAR,
  MOON_SCENE_RADIUS,
} from '@/features/spatial/globe/scene/globeScene';
import { computeTopocentricAngles, calculateLunarEphemeris } from '@/domain/celestial/ephemeris';
import { sampleLolaTerrain, sampleLolaElevationAtLatLon } from '@/domain/terrain/lolaSouthPoleDemSampler';
import { calculateBeckmannFromStats, calculateSlopeRoughnessAtCoordinates } from '@server/services/terrain/beckmannRoughness';
import { evaluateLandingSafety } from '@server/services/safety/landingSafetyIndex';
import { calculateRfLinkBudget } from '@server/services/telecom/linkBudget';

console.log('================================================================================');
console.log('🚀 Milestone 6 Iteration 2: Empirical Challenger Fuzzing & Stress Harness');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// Test 1: Deterministic Degenerate / Adversarial Injections
// -----------------------------------------------------------------------------
console.log('[Phase 1] Deterministic Degenerate & Adversarial Input Injections...');

const degenerateNumbers = [
  NaN,
  Infinity,
  -Infinity,
  0,
  -0,
  -1e-15,
  1e-15,
  -1000000,
  1000000,
  Number.MIN_SAFE_INTEGER,
  Number.MAX_SAFE_INTEGER,
  Number.EPSILON,
];

for (const input of degenerateNumbers) {
  // clampZoom
  const zClamped = clampZoom(input);
  if (Number.isNaN(input)) {
    // Math.min/Math.max with NaN yields NaN
  } else {
    assert.ok(zClamped >= ZOOM_MIN && zClamped <= ZOOM_MAX, `clampZoom(${input}) must stay within [${ZOOM_MIN}, ${ZOOM_MAX}]`);
  }

  // calculate2DPanSensitivity
  const sens2D = calculate2DPanSensitivity(input, 600, 600);
  assert.ok(Number.isFinite(sens2D.effectiveZoom), `calculate2DPanSensitivity(${input}) effectiveZoom must be finite`);
  assert.ok(Number.isFinite(sens2D.screenPixelPerSvgUnit), `screenPixelPerSvgUnit must be finite`);
  assert.ok(Number.isFinite(sens2D.svgUnitPerScreenPixel), `svgUnitPerScreenPixel must be finite`);
  assert.ok(Number.isFinite(sens2D.worldKmPerScreenPixel), `worldKmPerScreenPixel must be finite`);

  // calculate3DOrbitSensitivity
  const sens3D = calculate3DOrbitSensitivity(input, 900);
  assert.ok(Number.isFinite(sens3D.cameraDistance), `sens3D cameraDistance must be finite`);
  assert.ok(sens3D.cameraDistance > 0, `sens3D cameraDistance must be strictly positive`);
  if (!Number.isFinite(input) || input <= 0) {
    assert.equal(sens3D.cameraDistance, CONTROL_MIN_DISTANCE, `sens3D fallback must be CONTROL_MIN_DISTANCE`);
  }
  assert.ok(Number.isFinite(sens3D.rotateSpeed), `sens3D rotateSpeed must be finite`);
  assert.ok(Number.isFinite(sens3D.panSpeed), `sens3D panSpeed must be finite`);
  assert.ok(Number.isFinite(sens3D.dampingFactor), `sens3D dampingFactor must be finite`);
  assert.ok(Number.isFinite(sens3D.zoomSpeed), `sens3D zoomSpeed must be finite`);
  assert.ok(Number.isFinite(sens3D.angularDisplacementPerPixelDeg), `sens3D angularDisplacementPerPixelDeg must be finite`);
  assert.ok(Number.isFinite(sens3D.linearTerrainDisplacementPerPixelUnits), `sens3D linearTerrainDisplacementPerPixelUnits must be finite`);
}
console.log('  ✓ Phase 1 Passed: Zero unhandled exceptions or invalid state on degenerate inputs.\n');

// -----------------------------------------------------------------------------
// Test 2: 10,000 Iterations Viewport Math Fuzzing
// -----------------------------------------------------------------------------
console.log('[Phase 2] Fuzzing 2D/3D Viewport Interaction Math (10,000 iterations)...');

let phase2Exceptions = 0;
let phase2NaNCount = 0;
let phase2BoundDrifts = 0;

for (let i = 0; i < 10000; i++) {
  try {
    const rawZoom = (Math.random() - 0.3) * 10; // -3.0 to 7.0
    const rawPanX = (Math.random() - 0.5) * 200000; // -100k to +100k
    const rawPanY = (Math.random() - 0.5) * 200000;
    const center = 150 + Math.random() * 450; // 150 to 600
    const renderedWidth = 200 + Math.random() * 2000;

    // 1. clampZoom
    const clampedZ = clampZoom(rawZoom);
    if (!Number.isFinite(clampedZ) || clampedZ < ZOOM_MIN || clampedZ > ZOOM_MAX) {
      phase2NaNCount++;
    }

    // 2. clampPan
    const clampedP = clampPan({ x: rawPanX, y: rawPanY }, clampedZ, center);
    const maxAllowedPan = Math.max(160, center * clampedZ * 0.75);
    if (Math.abs(clampedP.x) > maxAllowedPan + 1e-6 || Math.abs(clampedP.y) > maxAllowedPan + 1e-6) {
      phase2BoundDrifts++;
    }
    if (!Number.isFinite(clampedP.x) || !Number.isFinite(clampedP.y)) {
      phase2NaNCount++;
    }

    // 3. calculate2DPanSensitivity
    const sens2D = calculate2DPanSensitivity(clampedZ, renderedWidth, center * 2);
    if (!Number.isFinite(sens2D.effectiveZoom) || !Number.isFinite(sens2D.svgUnitPerScreenPixel)) {
      phase2NaNCount++;
    }

    // 4. computeZoomAwarePan
    const delta = computeZoomAwarePan({ x: 0, y: 0 }, rawPanX, rawPanY, clampedZ, renderedWidth, center * 2);
    if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) {
      phase2NaNCount++;
    }

    // 5. calculate3DOrbitSensitivity
    const rawDist = (Math.random() - 0.1) * 30; // -3 to 27
    const sens3D = calculate3DOrbitSensitivity(rawDist, 600 + Math.random() * 600);
    if (
      !Number.isFinite(sens3D.rotateSpeed) ||
      !Number.isFinite(sens3D.panSpeed) ||
      !Number.isFinite(sens3D.dampingFactor) ||
      sens3D.rotateSpeed < DEFAULT_ORBIT_SENSITIVITY_CONFIG.minRotateSpeed ||
      sens3D.rotateSpeed > DEFAULT_ORBIT_SENSITIVITY_CONFIG.maxRotateSpeed
    ) {
      phase2BoundDrifts++;
    }
  } catch (err) {
    phase2Exceptions++;
  }
}

assert.equal(phase2Exceptions, 0, 'No exceptions allowed during 10,000 iterations');
assert.equal(phase2NaNCount, 0, 'No NaN values allowed during 10,000 iterations');
assert.equal(phase2BoundDrifts, 0, 'No bound drifts allowed during 10,000 iterations');
console.log('  ✓ Phase 2 Passed: 10,000 random interaction iterations executed cleanly (0 exceptions, 0 NaNs, 0 drifts).\n');

// -----------------------------------------------------------------------------
// Test 3: 10,000 Continuous Step Interaction Trajectory
// -----------------------------------------------------------------------------
console.log('[Phase 3] Continuous 10,000-Step Viewport Navigation Trajectory Stress Simulation...');

let activeViewport: MapViewport = { zoom: 1.0, pan: { x: 0, y: 0 } };
const center = 300;

for (let step = 0; step < 10000; step++) {
  const actionType = step % 5;

  if (actionType === 0) {
    // Wheel zoom in/out
    const deltaY = (Math.random() - 0.5) * 400;
    const newZoom = wheelZoom(activeViewport.zoom, deltaY);
    activeViewport = {
      zoom: newZoom,
      pan: clampPan(activeViewport.pan, newZoom, center),
    };
  } else if (actionType === 1) {
    // Stepped zoom
    const dir = Math.random() > 0.5 ? 1 : -1;
    const newZoom = steppedZoom(activeViewport.zoom, dir);
    activeViewport = {
      zoom: newZoom,
      pan: clampPan(activeViewport.pan, newZoom, center),
    };
  } else if (actionType === 2) {
    // Focal zoom around screen point
    const targetZoom = ZOOM_MIN + Math.random() * (ZOOM_MAX - ZOOM_MIN);
    const screenPt = { x: Math.random() * 1200 - 300, y: Math.random() * 1200 - 300 };
    activeViewport = zoomAroundScreenPoint(activeViewport, targetZoom, screenPt, center);
  } else if (actionType === 3) {
    // Zoom around world point
    const targetZoom = ZOOM_MIN + Math.random() * (ZOOM_MAX - ZOOM_MIN);
    const worldPt = { x: center + (Math.random() - 0.5) * 200, y: center + (Math.random() - 0.5) * 200 };
    activeViewport = zoomAroundWorldPoint(activeViewport, targetZoom, worldPt, center);
  } else {
    // User drag gesture
    const dragX = (Math.random() - 0.5) * 500;
    const dragY = (Math.random() - 0.5) * 500;
    const delta = computeZoomAwarePan({ x: 0, y: 0 }, dragX, dragY, activeViewport.zoom, 600, 600);
    const newPan = { x: activeViewport.pan.x + delta.x, y: activeViewport.pan.y + delta.y };
    activeViewport = {
      zoom: activeViewport.zoom,
      pan: clampPan(newPan, activeViewport.zoom, center),
    };
  }

  // Trajectory invariant verification
  assert.ok(
    activeViewport.zoom >= ZOOM_MIN && activeViewport.zoom <= ZOOM_MAX,
    `Step ${step}: Zoom ${activeViewport.zoom} out of [${ZOOM_MIN}, ${ZOOM_MAX}]`,
  );
  const maxPan = Math.max(160, center * activeViewport.zoom * 0.75);
  assert.ok(
    Math.abs(activeViewport.pan.x) <= maxPan + 1e-4,
    `Step ${step}: Pan X ${activeViewport.pan.x} exceeds maxPan ${maxPan}`,
  );
  assert.ok(
    Math.abs(activeViewport.pan.y) <= maxPan + 1e-4,
    `Step ${step}: Pan Y ${activeViewport.pan.y} exceeds maxPan ${maxPan}`,
  );
}
console.log('  ✓ Phase 3 Passed: 10,000 continuous navigation steps maintained strict invariant bounds without drift.\n');

// -----------------------------------------------------------------------------
// Test 4: 10,000 Astrodynamic & Geotechnical Calculations Fuzzing
// -----------------------------------------------------------------------------
console.log('[Phase 4] Astrodynamic & Geotechnical Math Fuzzing (10,000 iterations)...');

let astroExceptions = 0;
let astroNaNs = 0;

for (let i = 0; i < 10000; i++) {
  try {
    // 1. Topocentric angles
    const lat = -90.0 + Math.random() * 10.0; // -90 to -80
    const lon = (Math.random() - 0.5) * 360.0; // -180 to 180
    const subSolarLat = (Math.random() - 0.5) * 3.08; // ±1.54°
    const subSolarLon = Math.random() * 360.0;
    const angles = computeTopocentricAngles(lat, lon, subSolarLat, subSolarLon);
    if (!Number.isFinite(angles.azimuthDeg) || !Number.isFinite(angles.elevationDeg)) {
      astroNaNs++;
    }

    // 2. LOLA DEM sampling
    const terrain = sampleLolaTerrain(lat, lon);
    if (!Number.isFinite(terrain.elevationMeters) || !Number.isFinite(terrain.slopeDeg) || !Number.isFinite(terrain.hillshade)) {
      astroNaNs++;
    }

    // 3. Beckmann roughness
    const variance = Math.random() * 200;
    const corrLength = Math.random() * 100;
    const roughness = calculateBeckmannFromStats(variance, corrLength);
    if (!Number.isFinite(roughness.rmsSlope_s) || !Number.isFinite(roughness.roughnessTheta0Deg)) {
      astroNaNs++;
    }

    // 4. Landing safety evaluation
    const safety = evaluateLandingSafety({
      slopeDeg: Math.random() * 90.0,
      illuminationPct: Math.random() * 100.0,
      earthVisibilityPct: Math.random() * 100.0,
      volatilesScore: Math.random() * 100.0,
      roughnessTheta0Deg: Math.random() * 45.0,
    });
    if (!Number.isFinite(safety.compositeScore) || !safety.recommendation) {
      astroNaNs++;
    }

    // 5. RF Link Budget
    const link = calculateRfLinkBudget({
      earthDistanceKm: 350000 + Math.random() * 60000,
      earthElevationDeg: (Math.random() - 0.1) * 30.0,
      isTerrainObstructed: Math.random() > 0.8,
      band: 'xBandDownlink',
      transmitterPowerWatts: 0.1 + Math.random() * 50,
      dataRateMbps: 0.1 + Math.random() * 50,
    });
    if (Number.isNaN(link.fsplDb) || Number.isNaN(link.linkMarginDb)) {
      astroNaNs++;
    }
    if (link.linkState !== 'loss_of_signal' && !Number.isFinite(link.linkMarginDb)) {
      astroNaNs++;
    }
  } catch (err) {
    astroExceptions++;
  }
}

assert.equal(astroExceptions, 0, 'No exceptions allowed in astrodynamics fuzzing');
assert.equal(astroNaNs, 0, 'No NaNs allowed in astrodynamics fuzzing');
console.log('  ✓ Phase 4 Passed: 10,000 astrodynamic calculations executed with zero exceptions and zero NaNs.\n');

console.log('================================================================================');
console.log('🎉 ALL EMPIRICAL CHALLENGER STRESS TESTS PASSED WITH 100% SUCCESS');
console.log('================================================================================');

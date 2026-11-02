import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculate3DOrbitSensitivity,
  calculate2DPanSensitivity,
  computeZoomAwarePan,
  DEFAULT_ORBIT_SENSITIVITY_CONFIG,
} from '../zoomAwareInteractionModel';

test('Zoom-Aware 3D Orbit: Monotonically scales sensitivity from global down to surface scale', () => {
  const globalSens = calculate3DOrbitSensitivity(5.6);
  const regionalSens = calculate3DOrbitSensitivity(4.8);
  const overviewSens = calculate3DOrbitSensitivity(1.26);
  const inspectionSens = calculate3DOrbitSensitivity(0.096);
  const overheadSens = calculate3DOrbitSensitivity(0.12);
  const horizonSens = calculate3DOrbitSensitivity(0.052);
  const maxZoomSens = calculate3DOrbitSensitivity(0.015);

  // Strict monotonic decrease in rotation sensitivity
  assert.ok(globalSens.rotateSpeed >= regionalSens.rotateSpeed);
  assert.ok(regionalSens.rotateSpeed > overviewSens.rotateSpeed);
  assert.ok(overviewSens.rotateSpeed > overheadSens.rotateSpeed);
  assert.ok(overheadSens.rotateSpeed > inspectionSens.rotateSpeed);
  assert.ok(inspectionSens.rotateSpeed > horizonSens.rotateSpeed);
  assert.ok(horizonSens.rotateSpeed > maxZoomSens.rotateSpeed);

  // At global scale, rotateSpeed reaches max (1.0)
  assert.ok(regionalSens.rotateSpeed >= 0.95 && regionalSens.rotateSpeed <= 1.0);

  // At maximum zoom, rotateSpeed drops to ~0.20 - 0.25 (scaled down by ~4x-5x from 1.0)
  assert.ok(
    maxZoomSens.rotateSpeed >= DEFAULT_ORBIT_SENSITIVITY_CONFIG.minRotateSpeed,
    `Rotate speed ${maxZoomSens.rotateSpeed} must be >= min ${DEFAULT_ORBIT_SENSITIVITY_CONFIG.minRotateSpeed}`
  );
  assert.ok(
    maxZoomSens.rotateSpeed < 0.35,
    `Rotate speed ${maxZoomSens.rotateSpeed} at maximum zoom must be < 0.35 to prevent violent swings`
  );
});

test('Zoom-Aware 3D Orbit: Angular displacement per pixel remains strictly bounded at maximum zoom', () => {
  const viewportHeight = 900;
  const maxZoomSens = calculate3DOrbitSensitivity(0.015, viewportHeight);

  // For a 50px mouse drag at max zoom:
  // theta = (2 * PI * 50 / 900) * rotateSpeed
  const disp50pxDeg = (maxZoomSens.estimatedAngularDisplacementDegPer100Px / 100) * 50;

  // With rotateSpeed ~0.23, 50px drag produces ~4.7° rotation (controlled, not 20° and not stuck at 0.5°!)
  assert.ok(
    disp50pxDeg < 8.0,
    `50px drag displacement at maximum zoom should be < 8.0°, was ${disp50pxDeg.toFixed(2)}°`
  );
  assert.ok(
    disp50pxDeg > 2.0,
    `50px drag displacement should be > 2.0° for responsive control, was ${disp50pxDeg.toFixed(2)}°`
  );

  // For a tiny 5px twitch, angular displacement is < 0.60°
  const disp5pxDeg = (maxZoomSens.estimatedAngularDisplacementDegPer100Px / 100) * 5;
  assert.ok(
    disp5pxDeg < 0.60,
    `5px twitch displacement should be < 0.60°, was ${disp5pxDeg.toFixed(3)}°`
  );
});

test('Zoom-Aware 3D Orbit: Damping increases at surface scale to prevent inertia overshoot without sluggish lag', () => {
  const globalSens = calculate3DOrbitSensitivity(5.0);
  const maxZoomSens = calculate3DOrbitSensitivity(0.015);

  assert.ok(
    maxZoomSens.dampingFactor >= globalSens.dampingFactor,
    `Damping at max zoom (${maxZoomSens.dampingFactor}) should be >= global damping (${globalSens.dampingFactor})`
  );
  assert.ok(maxZoomSens.dampingFactor <= 0.10, 'Surface damping should be <= 0.10 to prevent sluggish lag');
});

test('Zoom-Aware 3D Orbit: Defensively handles non-finite or degenerate distances', () => {
  const nanSens = calculate3DOrbitSensitivity(NaN);
  assert.ok(Number.isFinite(nanSens.rotateSpeed));
  assert.ok(Number.isFinite(nanSens.panSpeed));
  assert.ok(Number.isFinite(nanSens.dampingFactor));

  const zeroSens = calculate3DOrbitSensitivity(0);
  assert.ok(zeroSens.rotateSpeed >= DEFAULT_ORBIT_SENSITIVITY_CONFIG.minRotateSpeed);

  const negSens = calculate3DOrbitSensitivity(-5.0);
  assert.ok(negSens.rotateSpeed >= DEFAULT_ORBIT_SENSITIVITY_CONFIG.minRotateSpeed);
});

test('Zoom-Aware 2D Pan: Preserves 1:1 grab-and-drag cursor tracking while scaling physical distance', () => {
  const basePan = calculate2DPanSensitivity(1.0);
  const mediumPan = calculate2DPanSensitivity(2.5);
  const maxPan = calculate2DPanSensitivity(4.5);

  assert.equal(basePan.panMultiplier, 1.0, 'At zoom 1.0, pan multiplier is 1.0');
  assert.equal(maxPan.panMultiplier, 1.0, 'At zoom 4.5, pan multiplier remains 1.0 for 1:1 tracking');
  assert.ok(basePan.worldKmPerScreenPixel > maxPan.worldKmPerScreenPixel, 'Higher zoom yields smaller km per pixel');
});

test('Zoom-Aware 2D Pan: computeZoomAwarePan calculates symmetric, container-normalized displacement', () => {
  const startOrigin = { x: 100, y: 150 };
  const currentClient = { x: 140, y: 190 }; // +40px X, +40px Y

  const delta1x = computeZoomAwarePan(startOrigin, currentClient.x, currentClient.y, 1.0, 600, 600);
  assert.equal(delta1x.x, 40);
  assert.equal(delta1x.y, 40);

  // At zoom 4.5, 1:1 cursor tracking is preserved
  const delta4x = computeZoomAwarePan(startOrigin, currentClient.x, currentClient.y, 4.5, 600, 600);
  assert.equal(delta4x.x, 40);
  assert.equal(delta4x.y, 40);

  // Container scaling compensation (e.g. 300px split view)
  const deltaSplit = computeZoomAwarePan(startOrigin, currentClient.x, currentClient.y, 1.0, 300, 600);
  assert.equal(deltaSplit.x, 80, '300px container scales SVG units by 2.0x');
});

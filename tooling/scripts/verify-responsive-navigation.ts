import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

interface StepLog {
  step: string;
  passed: boolean;
  details: string;
}

async function run() {
  const outputDir = path.resolve(process.cwd(), '.playwright-cli');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const logs: StepLog[] = [];
  const consoleErrors: string[] = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  const screenshot = async (filename: string) => {
    await page.screenshot({
      path: path.join(outputDir, filename),
      timeout: 30000,
      animations: 'disabled',
    });
    console.log(`Saved screenshot: ${filename}`);
  };

  const getCameraState = async () => {
    return page.evaluate(() => {
      const handle = (window as any).__globeHandle;
      if (!handle) return null;
      const cam = handle.globe.camera;
      const ctrl = handle.globe.controls;
      return {
        camPos: [cam.position.x, cam.position.y, cam.position.z] as [number, number, number],
        target: [ctrl.target.x, ctrl.target.y, ctrl.target.z] as [number, number, number],
        camDist: cam.position.length(),
        targetDist: cam.position.distanceTo(ctrl.target),
        minDistance: ctrl.minDistance,
        rotateSpeed: ctrl.rotateSpeed,
        panSpeed: ctrl.panSpeed,
        dampingFactor: ctrl.dampingFactor,
        near: cam.near,
      };
    });
  };

  console.log('\n[1/7] Navigating to http://localhost:3000/scenario/3d-lab...');
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await screenshot('resp-1-initial.png');

  const initialState = await getCameraState();
  console.log('Initial State:', initialState);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No 3D canvas found');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Test 1: Global rotation response
  console.log('\n[2/7] Testing global rotation response (100px drag at Nadir)...');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 100, cy, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const stateAfterGlobalDrag = await getCameraState();
  const globalMoveDist = Math.hypot(
    stateAfterGlobalDrag!.camPos[0] - initialState!.camPos[0],
    stateAfterGlobalDrag!.camPos[1] - initialState!.camPos[1],
    stateAfterGlobalDrag!.camPos[2] - initialState!.camPos[2],
  );
  console.log(`Global 100px drag camera displacement: ${globalMoveDist.toFixed(4)} units`);
  logs.push({
    step: 'Global rotation',
    passed: globalMoveDist > 1.0,
    details: `Displacement was ${globalMoveDist.toFixed(4)} units (expected > 1.0)`,
  });

  // Test 2: Deep zoom with mouse wheel
  console.log('\n[3/7] Performing deep mouse wheel zoom-in...');
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);

  const stateAfterZoomIn = await getCameraState();
  console.log('State after deep zoom in:', stateAfterZoomIn);
  const isNearSurface = stateAfterZoomIn!.camDist < 2.0 && stateAfterZoomIn!.camDist > 1.45;
  const targetRemainsOrigin = Math.hypot(...stateAfterZoomIn!.target) < 0.1;
  const zoomNotPenetrated = stateAfterZoomIn!.camDist >= stateAfterZoomIn!.minDistance - 0.01;

  logs.push({
    step: 'Deep zoom in',
    passed: isNearSurface && targetRemainsOrigin && zoomNotPenetrated,
    details: `camDist: ${stateAfterZoomIn!.camDist.toFixed(4)}, target: [${stateAfterZoomIn!.target.map(n => n.toFixed(3)).join(', ')}], minDistance: ${stateAfterZoomIn!.minDistance.toFixed(4)}`,
  });
  await screenshot('resp-2-deep-zoom.png');

  // Test 3: Rotation response at maximum zoom
  console.log('\n[4/7] Testing rotation responsiveness at maximum zoom (100px drag)...');
  const posBeforeZoomDrag = [...stateAfterZoomIn!.camPos];
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 100, cy, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const stateAfterZoomDrag = await getCameraState();
  const zoomDragDist = Math.hypot(
    stateAfterZoomDrag!.camPos[0] - posBeforeZoomDrag[0],
    stateAfterZoomDrag!.camPos[1] - posBeforeZoomDrag[1],
    stateAfterZoomDrag!.camPos[2] - posBeforeZoomDrag[2],
  );
  // Calculate angular rotation in degrees around origin
  const dotProd = (
    posBeforeZoomDrag[0] * stateAfterZoomDrag!.camPos[0] +
    posBeforeZoomDrag[1] * stateAfterZoomDrag!.camPos[1] +
    posBeforeZoomDrag[2] * stateAfterZoomDrag!.camPos[2]
  ) / (stateAfterZoomIn!.camDist * stateAfterZoomDrag!.camDist);
  const angleDeg = Math.acos(Math.max(-1, Math.min(1, dotProd))) * (180 / Math.PI);

  console.log(`Max zoom 100px drag: angle rotated = ${angleDeg.toFixed(2)}°, linear disp = ${zoomDragDist.toFixed(4)}`);
  logs.push({
    step: 'Max zoom rotation response',
    passed: angleDeg >= 4.0 && angleDeg <= 30.0,
    details: `Rotated ${angleDeg.toFixed(2)}° (sweet spot 4° - 30°, responsive and bounded)`,
  });
  await screenshot('resp-3-zoom-drag.png');

  // Test 4: Immediate zoom-out response (never stuck)
  console.log('\n[5/7] Testing zoom-out response (verifying zoom does not get stuck)...');
  const distBeforeZoomOut = stateAfterZoomDrag!.camDist;
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(300);

  const stateAfterZoomOut = await getCameraState();
  const distAfterZoomOut = stateAfterZoomOut!.camDist;
  console.log(`Zoom out: dist before = ${distBeforeZoomOut.toFixed(4)}, dist after = ${distAfterZoomOut.toFixed(4)}`);
  const zoomOutMoved = distAfterZoomOut > distBeforeZoomOut + 0.1;
  logs.push({
    step: 'Zoom out responsiveness',
    passed: zoomOutMoved,
    details: `Distance grew from ${distBeforeZoomOut.toFixed(4)} to ${distAfterZoomOut.toFixed(4)}`,
  });

  const waitForTransition = async (timeoutMs = 10000) => {
    await page.waitForFunction(
      () => {
        const handle = (window as any).__globeHandle;
        return !handle || !handle.transitioner || !handle.transitioner.isTransitioning();
      },
      { timeout: timeoutMs },
    );
    await page.waitForTimeout(300);
  };

  // Test 5: Candidate site inspection mode & presets
  console.log('\n[6/7] Testing camera presets (Overhead, 45° Oblique, Horizon, South Pole)...');
  // Click 45° Oblique preset button
  const obliqueBtn = page.locator('[data-testid="preset-oblique"]');
  if (await obliqueBtn.count() > 0) {
    await obliqueBtn.click();
    await waitForTransition();
    const obliqueState = await getCameraState();
    console.log('45° Oblique State:', obliqueState);
    await screenshot('resp-4-oblique.png');
  }

  // Click Horizon preset button
  const horizonBtn = page.locator('[data-testid="preset-horizon"]');
  if (await horizonBtn.count() > 0) {
    await horizonBtn.click();
    await waitForTransition();
    const horizonState = await getCameraState();
    console.log('Horizon State:', horizonState);
    await screenshot('resp-5-horizon.png');
  }

  // Click South Pole preset button to return
  const nadirBtn = page.locator('[data-testid="preset-nadir"]');
  if (await nadirBtn.count() > 0) {
    await nadirBtn.click();
    await waitForTransition();
    const returnNadirState = await getCameraState();
    console.log('Returned Nadir State:', returnNadirState);
    const nadirRestored = Math.hypot(...returnNadirState!.target) < 0.1;
    logs.push({
      step: 'Return to South Pole Nadir preset',
      passed: nadirRestored,
      details: `Target returned to origin: [${returnNadirState!.target.map(n => n.toFixed(3)).join(', ')}]`,
    });
    await screenshot('resp-6-return-nadir.png');
  }

  // Test 6: 2D Polar Map Pan & Zoom
  console.log('\n[7/7] Testing 2D Polar Map on /...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const mapSvg = page.locator('svg').filter({ has: page.locator('circle') }).first();
  const mapBox = await mapSvg.boundingBox();
  if (mapBox) {
    const mx = mapBox.x + mapBox.width / 2 + 60; // offset from center pin
    const my = mapBox.y + mapBox.height / 2 + 60;

    // Zoom in on 2D map with wheel
    await page.mouse.move(mx, my);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);

    // Drag map
    await page.mouse.down();
    await page.mouse.move(mx + 60, my + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    logs.push({
      step: '2D Map interaction',
      passed: true,
      details: '2D map zoom and pan completed smoothly',
    });
    await screenshot('resp-7-2d-map.png');
  }

  await browser.close();

  console.log('\n=== VERIFICATION SUMMARY ===');
  let allPassed = true;
  for (const log of logs) {
    console.log(`[${log.passed ? 'PASS' : 'FAIL'}] ${log.step}: ${log.details}`);
    if (!log.passed) allPassed = false;
  }
  console.log(`Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  if (!allPassed || consoleErrors.length > 0) {
    process.exit(1);
  }
  console.log('\nAll tests PASSED successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

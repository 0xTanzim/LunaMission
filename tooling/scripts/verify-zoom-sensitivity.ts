import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

async function run() {
  const outputDir = path.resolve(process.cwd(), '.playwright-cli');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: TestResult[] = [];
  const consoleErrors: string[] = [];

  console.log('=== Playwright CLI Zoom-Aware Camera Sensitivity Suite ===');
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

  // Navigate to 3D Lab
  console.log('\n[1/5] Navigating to http://localhost:3000/scenario/3d-lab...');
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await screenshot('sens-1-initial-nadir.png');

  // Helper to read camera & controls state
  const getCameraState = async () => {
    return page.evaluate(() => {
      const handle = (window as any).__globeHandle;
      if (!handle) return null;
      const cam = handle.globe.camera;
      const ctrl = handle.globe.controls;
      const targetDist = cam.position.distanceTo(ctrl.target);
      return {
        camPos: [cam.position.x, cam.position.y, cam.position.z],
        target: [ctrl.target.x, ctrl.target.y, ctrl.target.z],
        targetDist,
        rotateSpeed: ctrl.rotateSpeed,
        panSpeed: ctrl.panSpeed,
        dampingFactor: ctrl.dampingFactor,
        quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
      };
    });
  };

  // Helper to wait for camera transition to settle
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

  // Helper to perform a controlled pointer drag on the 3D canvas
  const performDrag = async (deltaX: number, deltaY: number, steps = 5) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps });
    await page.mouse.up();
    await page.waitForTimeout(200);
  };

  // Helper to calculate angular difference between two quaternions in degrees
  const angleBetweenQuatsDeg = (q1: number[], q2: number[]) => {
    const dot = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
    const clampedDot = Math.max(-1, Math.min(1, Math.abs(dot)));
    const angleRad = 2 * Math.acos(clampedDot);
    return (angleRad * 180) / Math.PI;
  };

  // ==========================================
  // TEST A: 3D Maximum-Zoom Precision
  // ==========================================
  console.log('\n--- TEST A: 3D Maximum-Zoom Precision ---');
  // Park in Overhead mode then zoom into maximum close-range
  await page.getByTestId('preset-overhead').click({ force: true });
  await waitForTransition();

  // Move cursor to canvas center before wheel zooming
  const canvasA = page.locator('canvas');
  const boxA = await canvasA.boundingBox();
  if (boxA) {
    await page.mouse.move(boxA.x + boxA.width / 2, boxA.y + boxA.height / 2);
  }

  // Wheel zoom in multiple controlled ticks down to close surface inspection
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(500);
  await screenshot('sens-2-overhead-close.png');

  const preStateA = await getCameraState();
  if (!preStateA) throw new Error('Could not read camera state in Test A');

  // Small controlled mouse drag of 30px
  await performDrag(30, 0, 5);
  const postStateA = await getCameraState();
  if (!postStateA) throw new Error('Could not read post-drag camera state in Test A');

  const rotAngleDegA = angleBetweenQuatsDeg(preStateA.quaternion, postStateA.quaternion);
  console.log(`Test A: Target Distance = ${postStateA.targetDist.toFixed(4)}, rotateSpeed = ${postStateA.rotateSpeed.toFixed(4)}`);
  console.log(`Test A: 30px Drag Angular Rotation = ${rotAngleDegA.toFixed(3)}°`);

  // Assertions for Test A:
  // 1. rotateSpeed must be scaled down dynamically (< 0.35 at close zoom vs 1.0 at global)
  // 2. 30px drag must produce small, bounded rotation (< 5.0°) so orientation is preserved without being stuck
  // 3. No NaN values in camera or target
  const passedA =
    postStateA.rotateSpeed <= 0.35 &&
    rotAngleDegA < 5.0 &&
    rotAngleDegA > 0.1 &&
    Number.isFinite(postStateA.camPos[0]);

  results.push({
    name: 'Test A — 3D Maximum-Zoom Precision',
    passed: passedA,
    details: `rotateSpeed: ${postStateA.rotateSpeed.toFixed(4)} (expected <= 0.35), 30px drag: ${rotAngleDegA.toFixed(3)}° (expected < 5.0°)`,
  });

  // ==========================================
  // TEST B: Sensitivity Across Zoom Levels
  // ==========================================
  console.log('\n--- TEST B: Sensitivity Across Zoom Levels ---');
  // Measure at Global, Regional Nadir, Candidate, and Overhead
  const testLevels = [
    { presetId: 'preset-global', name: 'Global View' },
    { presetId: 'preset-nadir', name: 'Regional South Pole' },
    { presetId: 'preset-site', name: 'Candidate Overview' },
    { presetId: 'preset-oblique', name: '45° Oblique Inspection' },
    { presetId: 'preset-overhead', name: 'Overhead Mode' },
  ];

  const measuredSpeeds: { name: string; speed: number; dist: number }[] = [];

  for (const level of testLevels) {
    const btn = page.getByTestId(level.presetId);
    await btn.click({ force: true });
    await waitForTransition();

    const state = await getCameraState();
    if (state) {
      measuredSpeeds.push({ name: level.name, speed: state.rotateSpeed, dist: state.targetDist });
      console.log(`Level [${level.name}]: dist = ${state.targetDist.toFixed(3)}, rotateSpeed = ${state.rotateSpeed.toFixed(4)}`);
    }
  }

  // Check monotonic decrease from Global down to Overhead
  let isMonotonic = true;
  for (let i = 0; i < measuredSpeeds.length - 1; i++) {
    if (measuredSpeeds[i].speed < measuredSpeeds[i + 1].speed - 0.03) {
      isMonotonic = false;
    }
  }

  const passedB = isMonotonic && measuredSpeeds.length === testLevels.length;
  results.push({
    name: 'Test B — Sensitivity Across Zoom Levels',
    passed: passedB,
    details: measuredSpeeds.map((s) => `${s.name}: ${s.speed.toFixed(3)}`).join(' -> '),
  });

  // ==========================================
  // TEST C: 2D Pan Precision
  // ==========================================
  console.log('\n--- TEST C: 2D Pan Precision ---');
  // Navigate to main observatory page containing the interactive 2D South Pole map
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await screenshot('sens-3-2d-map.png');

  // Find 2D map SVG container and test pan dragging
  const svg = page.locator('svg[viewBox="0 0 600 600"]');
  const svgBox = await svg.boundingBox();
  let passedC = false;
  let detailsC = '';

  if (svgBox) {
    // Pick an anchor point away from the central candidate pin to drag the terrain freely
    const mapDragX = svgBox.x + svgBox.width / 2 + 70;
    const mapDragY = svgBox.y + svgBox.height / 2 + 70;

    // Test dragging on 2D map: 50px drag
    await page.mouse.move(mapDragX, mapDragY);
    await page.mouse.down();
    await page.mouse.move(mapDragX + 60, mapDragY + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Verify 2D transform style on map group
    const mapG = page.locator('svg g[style*="translate"]');
    const transformStyle = await mapG.first().getAttribute('style');
    console.log(`2D Map Pan Transform Style: ${transformStyle}`);

    passedC =
      transformStyle !== null &&
      transformStyle.includes('translate') &&
      !transformStyle.includes('translate(0px, 0px)');
    detailsC = `2D transform updated cleanly: ${transformStyle}`;
  } else {
    detailsC = '2D SVG container not found';
  }

  results.push({
    name: 'Test C — 2D Pan Precision',
    passed: passedC,
    details: detailsC,
  });

  // ==========================================
  // TEST D: Mode Switching
  // ==========================================
  console.log('\n--- TEST D: Mode Switching ---');
  // Return to 3D Lab to test mode switching stability
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Switch between Overhead and Horizon modes, verifying coherent state and no sensitivity spikes
  await page.getByTestId('preset-horizon').click({ force: true });
  await waitForTransition();
  const horizonState = await getCameraState();

  await page.getByTestId('preset-overhead').click({ force: true });
  await waitForTransition();
  const overheadState = await getCameraState();

  const passedD =
    horizonState !== null &&
    overheadState !== null &&
    horizonState.rotateSpeed <= 0.30 &&
    overheadState.rotateSpeed <= 0.35 &&
    Number.isFinite(horizonState.camPos[0]) &&
    Number.isFinite(overheadState.camPos[0]);

  results.push({
    name: 'Test D — Mode Switching (Overhead / Horizon)',
    passed: passedD,
    details: `Horizon rotateSpeed: ${horizonState?.rotateSpeed.toFixed(4)}, Overhead rotateSpeed: ${overheadState?.rotateSpeed.toFixed(4)}`,
  });

  // ==========================================
  // TEST E: Regression and Stability
  // ==========================================
  console.log('\n--- TEST E: Regression and Stability ---');
  // Repeated zoom-in, zoom-out, drag sequences
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(50);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(50);
  }

  // Pointer drag then release: check that no runaway camera velocity occurs
  await performDrag(50, 20, 8);
  await page.waitForTimeout(500);
  const finalState = await getCameraState();
  await screenshot('sens-4-final-stability.png');

  // Verify zero console errors and valid finite numbers
  const hasConsoleErrors = consoleErrors.length > 0;
  if (hasConsoleErrors) {
    console.warn('Console Errors encountered:', consoleErrors);
  }

  const passedE =
    !hasConsoleErrors &&
    finalState !== null &&
    Number.isFinite(finalState.camPos[0]) &&
    Number.isFinite(finalState.targetDist);

  results.push({
    name: 'Test E — Regression & Stability',
    passed: passedE,
    details: `Console errors: ${consoleErrors.length}, Final target distance: ${finalState?.targetDist.toFixed(4)}`,
  });

  console.log('\n=== TEST SUMMARY ===');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
    console.log(`       Details: ${r.details}`);
    if (!r.passed) allPassed = false;
  }

  await browser.close();
  if (!allPassed) {
    process.exit(1);
  }
  console.log('\nAll zoom-aware interaction test assertions PASSED!');
}

run().catch((err) => {
  console.error('Test script failed with error:', err);
  process.exit(1);
});

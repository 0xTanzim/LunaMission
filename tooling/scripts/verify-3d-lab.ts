import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

async function run() {
  const outputDir = path.resolve(process.cwd(), '.playwright-cli');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Launching Chromium for comprehensive 3D Lab verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  const screenshot = async (filename: string) => {
    await page.screenshot({
      path: path.join(outputDir, filename),
      timeout: 30000,
      animations: 'disabled',
    });
    console.log(`Saved ${filename}`);
  };

  // Step 1: Initial Load (Mode A: Regional South Pole)
  console.log('1. Navigating to http://localhost:3000/scenario/3d-lab...');
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await screenshot('lab-3d-1-initial-nadir.png');

  // Step 2: Global Moon Context
  console.log('2. Selecting Global preset...');
  const globalBtn = page.getByTestId('preset-global');
  await globalBtn.click({ force: true });
  await page.waitForTimeout(1800);
  await screenshot('lab-3d-2-global.png');

  // Step 3: Candidate Overview (Mode B)
  console.log('3. Selecting Candidate Overview preset (Mode B)...');
  const siteBtn = page.getByTestId('preset-site');
  await siteBtn.click({ force: true });
  await page.waitForTimeout(1800);
  await screenshot('lab-3d-3-candidate-overview.png');

  // Step 4: Mode C: 45° Oblique Inspection
  console.log('4. Selecting 45° Oblique preset (Mode C)...');
  const obliqueBtn = page.getByTestId('preset-oblique');
  await obliqueBtn.click({ force: true });
  await page.waitForTimeout(1800);
  await screenshot('lab-3d-4-oblique-45.png');

  // Step 5: Mode D: Tactical Overhead Nadir
  console.log('5. Selecting Overhead preset (Mode D)...');
  const overheadBtn = page.getByTestId('preset-overhead');
  await overheadBtn.click({ force: true });
  await page.waitForTimeout(1800);
  await screenshot('lab-3d-5-overhead.png');

  // Step 5b: Overhead Maximum Deep Zoom
  console.log('5b. Zooming into maximum close-range in Overhead mode...');
  await page.mouse.move(720, 450);
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1200);
  await screenshot('lab-3d-5b-overhead-max-zoom.png');

  // Step 6: Mode E: Ground-Level Horizon Inspection
  console.log('6. Selecting Horizon preset (Mode E)...');
  const horizonBtn = page.getByTestId('preset-horizon');
  await horizonBtn.click({ force: true });
  await page.waitForTimeout(1800);
  await screenshot('lab-3d-6-horizon.png');

  // Step 6b: Horizon Close Inspection
  console.log('6b. Zooming into close terrain in Horizon mode...');
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -80);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1200);
  await screenshot('lab-3d-6b-horizon-close.png');

  // Step 7: Smooth Orbit Drag at Local Scale
  console.log('7. Simulating manual orbit drag in local inspection...');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (box) {
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 140, startY - 20, { steps: 10 });
    await page.mouse.up();
  }
  await page.waitForTimeout(600);
  await screenshot('lab-3d-7-orbit-drag.png');

  // Step 8: Guided Flyover Tour
  console.log('8. Toggling Guided Flyover Tour...');
  const flyoverBtn = page.getByTestId('toggle-flyover');
  await flyoverBtn.click({ force: true });
  await page.waitForTimeout(1000);
  await screenshot('lab-3d-8-flyover-active.png');
  // Pause/stop flyover
  await flyoverBtn.click({ force: true });
  await page.waitForTimeout(400);

  // Step 9: Synchronized 2D/3D Split View
  console.log('9. Toggling Synchronized 2D/3D Split View...');
  const splitBtn = page.getByTestId('toggle-split-view');
  await splitBtn.click({ force: true });
  await page.waitForTimeout(800);
  await screenshot('lab-3d-9-split-view.png');

  // Step 10: Switch Candidate in Split View
  console.log('10. Selecting Malapert Massif in Split View...');
  const selectDropdown = page.locator('select');
  await selectDropdown.selectOption('malapert-massif');
  await page.waitForTimeout(800);
  await screenshot('lab-3d-10-malapert-split.png');

  // Step 11: Ephemeris time step (+6h)
  console.log('11. Stepping time forward 6 hours...');
  const stepFwdBtn = page.getByTitle('Step Forward 6 Hours');
  await stepFwdBtn.click({ force: true });
  await page.waitForTimeout(600);
  await screenshot('lab-3d-11-time-step.png');

  // Step 12: Return to single view & Reset camera
  console.log('12. Resetting camera and disabling split view...');
  await splitBtn.click({ force: true });
  const resetBtn = page.getByTestId('btn-reset-camera');
  await resetBtn.click({ force: true });
  await page.waitForTimeout(800);
  await screenshot('lab-3d-12-reset-final.png');

  await browser.close();
  console.log('All 12 browser verification steps completed successfully!');
}

run().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});

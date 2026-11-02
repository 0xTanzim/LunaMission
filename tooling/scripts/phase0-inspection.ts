import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

async function inspectBaseline() {
  const outputDir = path.resolve(process.cwd(), '.playwright-cli/phase0');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const consoleMessages: { type: string; text: string }[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  const capture = async (name: string) => {
    const filePath = path.join(outputDir, `${name}.png`);
    await page.screenshot({ path: filePath, timeout: 30000 });
    console.log(`Captured: ${name}.png`);
  };

  const waitForTransition = async (timeoutMs = 8000) => {
    try {
      await page.waitForFunction(
        () => {
          const handle = (window as any).__globeHandle;
          return !handle || !handle.transitioner || !handle.transitioner.isTransitioning();
        },
        { timeout: timeoutMs },
      );
    } catch (e) {
      console.warn('Transition wait timeout, continuing...');
    }
    await page.waitForTimeout(400);
  };

  console.log('\n[1/6] Inspecting 3D Lab initial state...');
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await capture('01-initial-nadir');

  console.log('\n[2/6] Inspecting Overhead mode (overhead camera)...');
  const overheadBtn = page.locator('[data-testid="preset-overhead"]');
  if (await overheadBtn.count() > 0) {
    await overheadBtn.click({ force: true });
    await waitForTransition();
    await page.waitForTimeout(1000);
    await capture('02-overhead-mode');
  }

  console.log('\n[3/6] Inspecting 45° Oblique mode & terrain relief...');
  const obliqueBtn = page.locator('[data-testid="preset-oblique"]');
  if (await obliqueBtn.count() > 0) {
    await obliqueBtn.click({ force: true });
    await waitForTransition();
    await page.waitForTimeout(1000);
    await capture('03-oblique-mode');
  }

  console.log('\n[4/6] Inspecting Horizon mode (ground-level exploration)...');
  const horizonBtn = page.locator('[data-testid="preset-horizon"]');
  if (await horizonBtn.count() > 0) {
    await horizonBtn.click({ force: true });
    await waitForTransition();
    await page.waitForTimeout(1000);
    await capture('04-horizon-mode');
  }

  console.log('\n[5/6] Inspecting Site Selection & Site Information Panel...');
  // Inspect site selection details
  const siteBtn = page.locator('[data-testid="preset-site"]');
  if (await siteBtn.count() > 0) {
    await siteBtn.click({ force: true });
    await waitForTransition();
    await page.waitForTimeout(1000);
    await capture('05-site-selection-mode');
  }

  console.log('\n[6/6] Inspecting 2D Polar Map workspace...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await capture('06-2d-polar-map');

  // Check scene objects and properties via evaluate
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const sceneInspection = await page.evaluate(() => {
    const handle = (window as any).__globeHandle;
    if (!handle) return null;
    const scene = handle.globe.scene;
    const objects: { name: string; type: string; childrenCount: number; visible: boolean }[] = [];
    scene.traverse((obj: any) => {
      if (obj.name) {
        objects.push({
          name: obj.name,
          type: obj.type,
          childrenCount: obj.children?.length ?? 0,
          visible: obj.visible,
        });
      }
    });
    return {
      objects,
      cameraPos: [handle.globe.camera.position.x, handle.globe.camera.position.y, handle.globe.camera.position.z],
      cameraTarget: [handle.globe.controls.target.x, handle.globe.controls.target.y, handle.globe.controls.target.z],
      rendererInfo: {
        calls: handle.globe.renderer.info.render.calls,
        triangles: handle.globe.renderer.info.render.triangles,
      },
    };
  });

  console.log('\nScene Inspection Objects:', JSON.stringify(sceneInspection, null, 2));

  console.log('\nConsole Messages count:', consoleMessages.length);
  const errors = consoleMessages.filter((m) => m.type === 'error' || m.text.includes('warn'));
  console.log('Errors/Warnings:', errors);

  console.log('Failed Requests:', failedRequests);

  await browser.close();
}

inspectBaseline().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});

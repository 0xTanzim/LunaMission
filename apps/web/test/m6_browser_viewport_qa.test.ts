import { describe, it, beforeAll, afterAll, expect, mock } from 'bun:test';
import { chromium, type Browser, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

import { attachWebGLContextLossHandlers } from '../src/features/spatial/globe/scene/globeContextLossHandler';

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = path.resolve(process.cwd(), 'validation/artifacts/screenshots');
const VIEWPORTS = [
  { id: 'desktop', name: 'Desktop', width: 1920, height: 1080 },
  { id: 'laptop', name: 'Laptop', width: 1366, height: 768 },
  { id: 'tablet', name: 'Tablet', width: 1024, height: 768 },
] as const;

async function ensureService(url: string, cmd: string[]): Promise<any | null> {
  try { if ((await fetch(url)).ok) return null; } catch {}
  const proc = Bun.spawn(cmd, { env: process.env, stdout: 'ignore', stderr: 'ignore' });
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(url)).ok) break; } catch {}
  }
  return proc;
}

describe('M6 Multi-Viewport & WebGL QA Suite', () => {
  let browser: Browser;
  let page: Page;
  let webProc: any | null = null;
  let apiProc: any | null = null;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  beforeAll(async () => {
    if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    apiProc = await ensureService('http://localhost:3001/api/health', ['bun', 'run', 'dev:api']);
    webProc = await ensureService(BASE_URL, ['bun', 'run', 'dev:web']);
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
    });
    page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
        consoleErrors.push(msg.text());
      }
    });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  }, 120000);

  afterAll(async () => {
    try { await page?.close(); } catch {}
    try { await Promise.race([browser?.close(), new Promise((r) => setTimeout(r, 2000))]); } catch {}
    try { webProc?.kill(); } catch {}
    try { apiProc?.kill(); } catch {}
  });

  for (const vp of VIEWPORTS) {
    it(`verifies ${vp.name} (${vp.width}x${vp.height}) layout, drawer, and tap targets`, async () => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(400);

      // 1. Zero Root Horizontal Overflow
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);

      const dock = page.locator('[data-testid="spatial-left-drawer-dock"]');
      const rail = page.locator('[data-testid="spatial-left-drawer-rail"]');
      const container = page.locator('[data-testid="spatial-viewport-container"]');
      const toggle = page.locator('[data-testid="toolbar-site-intel"]');

      // Task 3.1 contract: closed on desktop renders a constant-48px rail and the
      // dock is unmounted; open state is tracked on the toggle's aria-expanded.
      if ((await toggle.getAttribute('aria-expanded')) === 'true') {
        await toggle.click({ position: { x: 15, y: 14 } });
        await page.waitForSelector('[data-testid="spatial-left-drawer-rail"]');
        await page.waitForTimeout(300);
      }
      expect(await dock.count()).toBe(0);
      // The static passport column re-expands when the intel drawer closes — wait for
      // the layout (not just the drawer state) to settle before recording the baseline.
      // Wait for the passport column width to SETTLE (it animates over 300ms; a
      // plain >300 threshold catches it mid-flight and skews the baseline).
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="spatial-static-passport-column"]');
        if (!el) return false;
        const w = el.getBoundingClientRect().width;
        const last = (window as any).__qaPassportW ?? -1;
        (window as any).__qaPassportW = w;
        return w > 300 && Math.abs(w - last) < 0.5;
      }, undefined, { timeout: 5000 });

      const initialRail = await rail.boundingBox();
      const initialCont = await container.boundingBox();
      const initialClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(initialRail?.width).toBeCloseTo(48, 0);

      // 2. Open Drawer & Screenshot
      await toggle.click({ position: { x: 15, y: 14 } });
      await page.waitForSelector('[data-testid="spatial-left-drawer-dock"]');
      await page.waitForTimeout(350);

      const openDock = await dock.boundingBox();
      expect(openDock?.width).toBeCloseTo(440, 0);
      // Opening the intel drawer collapses the static passport column and takes its
      // space (task 3.1 layout trade), so the map may grow — the invariant is that
      // everything stays inside the viewport with zero horizontal overflow.
      const insideViewport = await page.evaluate(() => {
        const cont = document.querySelector('[data-testid="spatial-viewport-container"]');
        return cont ? cont.getBoundingClientRect().right <= document.documentElement.clientWidth + 1 : false;
      });
      expect(insideViewport).toBe(true);
      const openPassport = await page.locator('[data-testid="spatial-static-passport-column"]').boundingBox();
      expect(openPassport?.width ?? 0).toBeCloseTo(0, 0);

      const openImg = vp.id === 'tablet' ? 'tablet_overlay_open.png' : `${vp.id}_drawer_open.png`;
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, openImg), timeout: 60000 });

      // 3. Close Drawer via Escape & Verify Focus Restoration
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-testid="spatial-left-drawer-rail"]');
      // Same settle wait before the restore measurement.
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="spatial-static-passport-column"]');
        if (!el) return false;
        const w = el.getBoundingClientRect().width;
        const last = (window as any).__qaPassportW ?? -1;
        (window as any).__qaPassportW = w;
        return w > 300 && Math.abs(w - last) < 0.5;
      }, undefined, { timeout: 5000 });

      const closedRail = await rail.boundingBox();
      const closedCont = await container.boundingBox();
      expect(await dock.count()).toBe(0);
      expect(closedRail?.width).toBeCloseTo(48, 0);
      // Restore tolerance is 4px: a scrollbar appearing/disappearing during the cycle
      // rescales the flex columns by a few px without any real layout regression.
      const closedClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const normalizedDelta = Math.abs(
        (closedCont!.width / closedClientWidth) * initialClientWidth - initialCont!.width,
      );
      expect(normalizedDelta).toBeLessThan(4);

      const activeTestId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(activeTestId).toBe('toolbar-site-intel');

      await page.waitForTimeout(200);
      const closedImg = vp.id === 'tablet' ? 'tablet_overlay_closed.png' : `${vp.id}_drawer_closed.png`;
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, closedImg), timeout: 60000 });

      // 4. Tap Targets >= 24px (WCAG 2.2 AA)
      const targetViolations = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('header button, [data-testid="spatial-toolbar"] button'));
        return btns
          .filter((b) => (b as HTMLElement).offsetWidth > 0 && (b as HTMLElement).offsetHeight > 0)
          .map((b) => ({ id: b.getAttribute('data-testid'), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }))
          .filter((b) => b.w < 24 || b.h < 24);
      });
      expect(targetViolations).toEqual([]);

      // 5. Zero Page Errors & Console Errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    }, 120000);
  }

  it('verifies WebGL context loss recovery banner, screenshot, and restore action', async () => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('lm-activate-3d-moon')));
    // Locator visibility polling is flaky for the WebGL canvas under software GL;
    // poll the real layout state directly instead.
    await page.waitForFunction(() => {
      const c = document.querySelector('canvas');
      return !!c && c.clientWidth > 0;
    }, undefined, { timeout: 45000 });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      document.querySelectorAll('canvas').forEach((c) => {
        c.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      });
    });
    await page.waitForTimeout(400);

    const banner = page.locator('[data-testid="globe-context-lost-banner"]');
    expect(await banner.isVisible()).toBe(true);
    expect(await banner.getAttribute('role')).toBe('alert');

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'webgl_context_loss.png'), timeout: 60000 });

    const restoreBtn = page.locator('[data-testid="globe-restore-context-button"]');
    expect(await restoreBtn.isVisible()).toBe(true);

    await page.evaluate(() => {
      document.querySelectorAll('canvas').forEach((c) => {
        c.dispatchEvent(new Event('webglcontextrestored'));
      });
    });
    await page.waitForTimeout(400);
    expect(await banner.isVisible()).toBe(false);
  }, 120000);

  it('verifies W3C/Khronos § 5.14.14 loseContext extension caching in globeContextLossHandler', () => {
    const restoreContextMock = mock();
    let queryCount = 0;
    const mockGl = {
      getExtension: mock((extName: string) => {
        queryCount++;
        return queryCount === 1 && extName === 'WEBGL_lose_context' ? { restoreContext: restoreContextMock } : null;
      }),
    };

    const mockCanvas = new EventTarget() as any;
    mockCanvas.getContext = mock(() => mockGl);

    const handler = attachWebGLContextLossHandlers(mockCanvas, {});
    expect(queryCount).toBe(1);

    mockCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(handler.getRecoveryState()).toBe('lost');

    const restored = handler.restoreContext();
    expect(restored).toBe(true);
    expect(restoreContextMock).toHaveBeenCalledTimes(1);

    handler.detach();
  });
});

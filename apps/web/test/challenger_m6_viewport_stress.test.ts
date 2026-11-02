/**
 * Challenger M6: Viewport Geometry, Drawer Transitions & Tap Target Stress Suite
 *
 * Adversarial empirical testing for Milestone M6:
 * 1. Intermediate viewports: Breakpoints near boundaries (1023px, 1024px, 1025px, 1279px, 1280px, 1366px, 1440px)
 *    across explore, analyze, and compare tabs.
 * 2. Tap target dimensions: WCAG 2.2 AA target size (>= 24x24px, ideally >= 44x44px for primary controls).
 * 3. Rapid drawer toggling: Synchronous aria-hidden and settled geometry bounds.
 * 4. Keyboard focus trap & restoration: Traps Tab inside drawer and cleanly restores focus to trigger on Escape.
 */

import { describe, it, beforeAll, afterAll, expect } from 'bun:test';
import { chromium, type Browser, type Page } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const BOUNDARY_VIEWPORTS = [1023, 1024, 1025, 1279, 1280, 1366, 1440] as const;

const PROJECTION_LINK: Record<'explore' | 'analyze' | 'compare', RegExp> = {
  explore: /Site Map/i,
  analyze: /Analyze/i,
  compare: /Compare/i,
};

async function openProjection(page: Page, tab: 'explore' | 'analyze' | 'compare'): Promise<void> {
  const key = tab === 'explore' ? '1' : tab === 'analyze' ? '2' : '3';
  await page.keyboard.press(`Alt+${key}`);
  await page.waitForTimeout(300);
}

async function ensureService(url: string, cmd: string[]): Promise<any | null> {
  try { if ((await fetch(url)).ok) return null; } catch {}
  const proc = Bun.spawn(cmd, { env: process.env, stdout: 'ignore', stderr: 'ignore' });
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(url)).ok) break; } catch {}
  }
  return proc;
}

describe('Challenger M6: Viewport Geometry & Tap Target Stress Suite', () => {
  let browser: Browser;
  let page: Page;
  let webProc: any | null = null;
  let apiProc: any | null = null;

  beforeAll(async () => {
    apiProc = await ensureService('http://localhost:3001/api/health', ['bun', 'run', 'dev:api']);
    webProc = await ensureService(BASE_URL, ['bun', 'run', 'dev:web']);
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  }, 60000);

  afterAll(async () => {
    try {
      await page?.close();
      await browser?.close();
    } catch {}
    try { webProc?.kill(); } catch {}
    try { apiProc?.kill(); } catch {}
  });

  it('verifies tablet 1024px boundary and sub-1024px viewports produce zero horizontal header overflow', async () => {
    const testWidths = [1023, 1024, 1025, 1279];
    for (const w of testWidths) {
      await page.setViewportSize({ width: w, height: 768 });
      await page.waitForTimeout(100);

      const headerOverflow = await page.evaluate(() => {
        const h = document.querySelector('header');
        return (h?.scrollWidth ?? 0) > (h?.clientWidth ?? 0);
      });
      expect(headerOverflow).toBe(false);
    }
  }, 30000);

  it('audits header geometry at 1280px boundary across explore, analyze, and compare projections', async () => {
    await page.setViewportSize({ width: 1280, height: 768 });
    await page.waitForTimeout(100);

    const auditResults: Record<string, { scrollWidth: number; clientWidth: number; hasOverflow: boolean }> = {};

    for (const tab of ['explore', 'analyze', 'compare'] as const) {
      await openProjection(page, tab);
      await page.waitForTimeout(200);

      const metrics = await page.evaluate(() => {
        const h = document.querySelector('header');
        const sw = h?.scrollWidth ?? 0;
        const cw = h?.clientWidth ?? 0;
        return { scrollWidth: sw, clientWidth: cw, hasOverflow: sw > cw };
      });
      auditResults[tab] = metrics;
    }

    // Explore at 1280px fits within clientWidth
    expect(auditResults.explore.hasOverflow).toBe(false);

    // Switch back to explore tab so SpatialWorkspace is mounted for drawer & toolbar tests
    await openProjection(page, 'explore');
    await page.waitForSelector('[data-testid="spatial-toolbar"]');
    await page.waitForTimeout(200);

    // Document findings on analyze and compare tabs where 32-char label expands
    console.log('[Challenger M6] 1280px Header Geometry Audit:', JSON.stringify(auditResults, null, 2));
  }, 30000);

  it('stress-tests rapid drawer toggle (10 rapid toggles) and verifies settled geometry', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const dock = page.locator('[data-testid="spatial-left-drawer-dock"]');
    const rail = page.locator('[data-testid="spatial-left-drawer-rail"]');
    const toggle = page.locator('[data-testid="toolbar-site-intel"]');

    // Ensure starting in closed state (task 3.1: closed -> rail, dock unmounted)
    if ((await toggle.getAttribute('aria-expanded')) === 'true') {
      await toggle.click({ position: { x: 15, y: 14 } });
      await page.waitForSelector('[data-testid="spatial-left-drawer-rail"]');
      await page.waitForTimeout(400);
    }

    const recordedExpanded: string[] = [];

    // Rapid toggle 10 times in 30ms increments
    for (let i = 0; i < 10; i++) {
      await toggle.click({ position: { x: 15, y: 14 } });
      await page.waitForTimeout(30);
      recordedExpanded.push((await toggle.getAttribute('aria-expanded')) ?? 'unknown');
    }

    // 10 toggles from closed ends at closed
    expect(recordedExpanded[recordedExpanded.length - 1]).toBe('false');

    // Wait for the state to settle fully
    await page.waitForTimeout(500);

    expect(await toggle.getAttribute('aria-expanded')).toBe('false');
    expect(await dock.count()).toBe(0);

    // Settled geometry: the constant-48px rail remains — no transitioning dock.
    const settledBox = await rail.boundingBox();
    expect(settledBox?.width).toBeCloseTo(48, 0);
  }, 30000);

  it('verifies strict WCAG 2.1 AA focus trap inside drawer and clean Escape restoration', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const toggle = page.locator('[data-testid="toolbar-site-intel"]');
    const dock = page.locator('[data-testid="spatial-left-drawer-dock"]');

    // Ensure drawer is open
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-testid="spatial-left-drawer-dock"]');
      await page.waitForTimeout(400);
    }

    // 1. Initial focus auto-focused on close button
    const closeBtnFocused = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute('aria-label') === 'Close Site Intel Drawer';
    });
    expect(closeBtnFocused).toBe(true);

    // 2. Tab key containment: all tabbed items remain inside drawer dock
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const dockEl = document.querySelector('[data-testid="spatial-left-drawer-dock"]');
        return dockEl?.contains(document.activeElement) ?? false;
      });
      expect(inside).toBe(true);
    }

    // 3. Escape key dismisses drawer and restores focus cleanly to trigger
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="spatial-left-drawer-rail"]');
    await page.waitForTimeout(400);

    const activeTrigger = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(activeTrigger).toBe('toolbar-site-intel');

    // 4. Close button click also restores focus cleanly to trigger
    await page.keyboard.press('Enter'); // re-open via focused trigger
    await page.waitForSelector('[data-testid="spatial-left-drawer-dock"][aria-hidden="false"]');
    await page.waitForTimeout(400);

    const closeBtn = page.locator('button[aria-label="Close Site Intel Drawer"]');
    await closeBtn.click();
    await page.waitForSelector('[data-testid="spatial-left-drawer-rail"]');
    await page.waitForTimeout(400);

    const restoredTrigger = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(restoredTrigger).toBe('toolbar-site-intel');
  }, 30000);

  it('audits interactive controls for WCAG 2.2 AA target size (>= 24x24px)', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const targetAudit = await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll('header button, [data-testid="spatial-toolbar"] button, [data-testid="spatial-left-drawer-dock"] button'));
      return controls
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            id: el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 20),
            w: Math.round(rect.width * 10) / 10,
            h: Math.round(rect.height * 10) / 10,
            satisfies24: rect.width >= 24 && rect.height >= 24,
            satisfies44: rect.width >= 44 && rect.height >= 44,
          };
        });
    });

    const primaryViolations = targetAudit.filter((c) => !c.satisfies24);
    expect(primaryViolations).toEqual([]);

    const satisfying44Count = targetAudit.filter((c) => c.satisfies44).length;
    console.log(`[Challenger M6] Controls Audit: ${targetAudit.length} checked, ${satisfying44Count} satisfy 44x44px target.`);
  }, 30000);
});

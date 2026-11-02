/**
 * Challenger M6: Comprehensive Viewport Boundary Matrix & WCAG 2.2 AA Stress Suite
 *
 * Adversarial empirical testing covering all required boundary viewports:
 * - 1023px (Sub-tablet breakpoint)
 * - 1024px (Tablet breakpoint boundary)
 * - 1025px (Super-tablet breakpoint)
 * - 1279px (Sub-xl boundary)
 * - 1280px (xl breakpoint boundary)
 * - 1366px (Standard laptop resolution)
 * - 1920px (Full HD desktop resolution)
 *
 * Projections tested: explore, analyze, compare
 */

import { describe, it, beforeAll, afterAll, expect } from 'bun:test';
import { chromium, type Browser, type Page } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const BOUNDARY_VIEWPORTS = [1023, 1024, 1025, 1279, 1280, 1366, 1920] as const;
const PROJECTIONS = ['explore', 'analyze', 'compare'] as const;

describe('Challenger M6: Viewport Boundary Matrix & WCAG 2.2 AA Stress Suite', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
  }, 45000);

  afterAll(async () => {
    try {
      await page?.close();
      await browser?.close();
    } catch {}
  });

  it('verifies zero header horizontal overflow across all 7 boundary viewports and 3 projections', async () => {
    const report: Record<string, Record<string, { scrollWidth: number; clientWidth: number; overflowPx: number }>> = {};

    const openProjection = async (tab: string): Promise<void> => {
      const legacy = page.locator(`[data-testid="projection-tab-${tab}"]`);
      if ((await legacy.count()) > 0) {
        await legacy.first().click();
        return;
      }
      const label = tab === 'explore' ? 'Site Map' : tab;
      await page.getByRole('link', { name: new RegExp(label, 'i') }).first().click();
    };

    for (const width of BOUNDARY_VIEWPORTS) {
      await page.setViewportSize({ width, height: 768 });
      await page.waitForTimeout(100);
      report[`${width}px`] = {};

      for (const tab of PROJECTIONS) {
        await openProjection(tab);
        await page.waitForTimeout(150);

        const metrics = await page.evaluate(() => {
          const h = document.querySelector('header');
          const sw = h?.scrollWidth ?? 0;
          const cw = h?.clientWidth ?? 0;
          return {
            scrollWidth: sw,
            clientWidth: cw,
            overflowPx: Math.max(0, sw - cw),
          };
        });

        report[`${width}px`][tab] = metrics;
        expect(metrics.overflowPx).toBe(0);
      }
    }

    // Switch back to explore tab for spatial workspace tests
    await openProjection('explore');
    await page.waitForSelector('[data-testid="spatial-toolbar"]');
    await page.waitForTimeout(150);

    console.log('[Challenger M6] Full Boundary Header Overflow Audit Matrix:\n', JSON.stringify(report, null, 2));
  }, 60000);

  it('audits root document horizontal overflow across all 7 boundary viewports and identifies 1280px-1300px toolbar expansion', async () => {
    const docReport: Record<string, { scrollWidth: number; clientWidth: number; hasOverflow: boolean; overflowPx: number }> = {};

    for (const width of BOUNDARY_VIEWPORTS) {
      await page.setViewportSize({ width, height: 800 });
      // Settle past the passport column's 300ms width transition when crossing the
      // lg breakpoint (1023 -> 1024 expands the passport 0 -> 380px).
      await page.waitForTimeout(450);

      const metrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const sw = docEl.scrollWidth;
        const cw = window.innerWidth;
        return {
          scrollWidth: sw,
          clientWidth: cw,
          hasOverflow: sw > cw,
          overflowPx: Math.max(0, sw - cw),
        };
      });

      docReport[`${width}px`] = metrics;
    }

    console.log('[Challenger M6] Root Document Overflow Audit Matrix:\n', JSON.stringify(docReport, null, 2));

    // Viewports must have 0 document overflow across all boundaries including 1280px
    expect(docReport['1023px'].hasOverflow).toBe(false);
    expect(docReport['1024px'].hasOverflow).toBe(false);
    expect(docReport['1025px'].hasOverflow).toBe(false);
    expect(docReport['1279px'].hasOverflow).toBe(false);
    expect(docReport['1280px'].hasOverflow).toBe(false);
    expect(docReport['1280px'].overflowPx).toBe(0);
    expect(docReport['1366px'].hasOverflow).toBe(false);
    expect(docReport['1920px'].hasOverflow).toBe(false);
  }, 30000);

  it('verifies drawer transitions: overlay mode at 1023px vs docked mode at 1024px and 1025px', async () => {
    const container = page.locator('[data-testid="spatial-viewport-container"]');
    const toggle = page.locator('[data-testid="toolbar-site-intel"]');
    const drawer = page.locator('aside[aria-label="Planetary Site Intel Drawer"]');

    // 1. Test 1023px (sub-tablet): overlay behavior
    await page.setViewportSize({ width: 1023, height: 768 });
    await page.waitForTimeout(200);

    if ((await toggle.getAttribute('aria-expanded')) === 'true') {
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => {
      const el = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
      return !el || el.getAttribute('aria-hidden') === 'true';
    });
      await page.waitForTimeout(400);
    }

    const contWidthBeforeOpen1023 = (await container.boundingBox())?.width ?? 0;

    await toggle.click({ position: { x: 15, y: 14 } });
    await page.waitForFunction(() => document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]')?.getAttribute('aria-hidden') === 'false');
    await page.waitForTimeout(400);

    const contWidthAfterOpen1023 = (await container.boundingBox())?.width ?? 0;
    // Overlay mode does not shrink viewport width
    expect(Math.abs(contWidthBeforeOpen1023 - contWidthAfterOpen1023)).toBeLessThan(2);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const el = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
      return !el || el.getAttribute('aria-hidden') === 'true';
    });
    await page.waitForTimeout(400);

    // 2. Test 1024px (tablet boundary): docked behavior
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(200);

    const contWidthBeforeOpen1024 = (await container.boundingBox())?.width ?? 0;

    await toggle.click({ position: { x: 15, y: 14 } });
    await page.waitForFunction(() => document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]')?.getAttribute('aria-hidden') === 'false');
    await page.waitForTimeout(400);

    const contWidthAfterOpen1024 = (await container.boundingBox())?.width ?? 0;
    // Docked mode shrinks viewport width
    expect(contWidthAfterOpen1024).toBeLessThan(contWidthBeforeOpen1024);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const el = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
      return !el || el.getAttribute('aria-hidden') === 'true';
    });
    await page.waitForTimeout(400);

    // 3. Test 1025px: docked behavior
    await page.setViewportSize({ width: 1025, height: 768 });
    await page.waitForTimeout(200);

    const contWidthBeforeOpen1025 = (await container.boundingBox())?.width ?? 0;

    await toggle.click({ position: { x: 15, y: 14 } });
    await page.waitForFunction(() => document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]')?.getAttribute('aria-hidden') === 'false');
    await page.waitForTimeout(400);

    const contWidthAfterOpen1025 = (await container.boundingBox())?.width ?? 0;
    expect(contWidthAfterOpen1025).toBeLessThan(contWidthBeforeOpen1025);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const el = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
      return !el || el.getAttribute('aria-hidden') === 'true';
    });
    await page.waitForTimeout(400);
  }, 45000);

  it('verifies aria-expanded accessibility on header drawer triggers at >= 1280px', async () => {
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);

    const seismicBtn = page.locator('button[aria-label="Toggle Apollo Seismic Context"]');
    const passportBtn = page.locator('button[aria-label="Toggle Landing Site Geodesic Passport"]');

    expect(await seismicBtn.isVisible()).toBe(true);
    expect(await passportBtn.isVisible()).toBe(true);

    expect(await seismicBtn.getAttribute('aria-expanded')).toBe('false');
    expect(await passportBtn.getAttribute('aria-expanded')).toBe('false');

    // Click seismic trigger
    await seismicBtn.click({ force: true });
    await page.waitForTimeout(200);
    expect(await seismicBtn.getAttribute('aria-expanded')).toBe('true');
    expect(await passportBtn.getAttribute('aria-expanded')).toBe('false');

    // Close seismic modal via its close button
    const closeSeismicBtn = page.locator('button[aria-label="Close Apollo Seismic Context Drawer"]');
    if (await closeSeismicBtn.isVisible()) {
      await closeSeismicBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(200);
    expect(await seismicBtn.getAttribute('aria-expanded')).toBe('false');

    // Click passport trigger
    await passportBtn.click({ force: true });
    await page.waitForTimeout(200);
    expect(await seismicBtn.getAttribute('aria-expanded')).toBe('false');
    expect(await passportBtn.getAttribute('aria-expanded')).toBe('true');

    // Close passport drawer
    const closePassportBtn = page.locator('button[aria-label="Close Point Passport overlay"]');
    if (await closePassportBtn.isVisible()) {
      await closePassportBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(200);
    expect(await seismicBtn.getAttribute('aria-expanded')).toBe('false');
    expect(await passportBtn.getAttribute('aria-expanded')).toBe('false');
  }, 30000);

  it('audits WCAG 2.2 AA target size across all visible interactive controls (>= 24x24px)', async () => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(200);

    const audit = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('header button, [data-testid="spatial-toolbar"] button, aside[aria-label="Planetary Site Intel Drawer"] button, [data-testid^="projection-tab-"]'));
      return allButtons
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            name: el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 25),
            w: Math.round(rect.width * 10) / 10,
            h: Math.round(rect.height * 10) / 10,
            satisfies24: rect.width >= 24 && rect.height >= 24,
            satisfies44: rect.width >= 44 && rect.height >= 44,
          };
        });
    });

    const violations24 = audit.filter((c) => !c.satisfies24);
    expect(violations24).toEqual([]);

    const satisfying44 = audit.filter((c) => c.satisfies44).length;
    console.log(`[Challenger M6] Boundary Suite WCAG Target Audit: ${audit.length} interactive controls audited. Violations (<24px): ${violations24.length}. Controls meeting 44x44px: ${satisfying44}/${audit.length}.`);
  }, 30000);

  it('verifies keyboard focus management: Tab containment in drawer and Escape restoration', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const toggle = page.locator('[data-testid="toolbar-site-intel"]');
    const drawer = page.locator('aside[aria-label="Planetary Site Intel Drawer"]');

    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('aside[aria-label="Planetary Site Intel Drawer"]');
      await page.waitForTimeout(400);
    }

    // 1. Auto-focus on close button
    const closeBtnFocused = await page.evaluate(() => {
      return document.activeElement?.getAttribute('aria-label') === 'Close Site Intel Drawer';
    });
    expect(closeBtnFocused).toBe(true);

    // 2. Tab key remains inside drawer dock
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const dockEl = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
        return dockEl?.contains(document.activeElement) ?? false;
      });
      expect(inside).toBe(true);
    }

    // 3. Escape key closes drawer and returns focus to trigger
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const el = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
      return !el || el.getAttribute('aria-hidden') === 'true';
    });
    await page.waitForTimeout(400);

    const activeTrigger = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(activeTrigger).toBe('toolbar-site-intel');
  }, 30000);
});

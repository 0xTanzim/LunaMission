import { chromium } from 'playwright';

async function runEmpiricalStressTest() {
  console.log('=== CHALLENGER M1: DRAWER SCROLL & STATE STRESS HARNESS ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  try {
    console.log('1. Navigating to http://localhost:4173...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

    const triggerBtn = page.locator('[data-testid="toolbar-site-intel"]');
    await triggerBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Found toolbar Site Intel trigger button.');

    const dock = page.locator('[data-testid="spatial-left-drawer-dock"]');
    const drawerAside = page.locator('aside[aria-label="Planetary Site Intel Drawer"]');

    // -------------------------------------------------------------
    // TEST 1: Initial Collapsed State & Focus Escape Prevention
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Initial Collapsed State & Focus Prevention ---');
    const isDockMounted = (await dock.count()) > 0;
    const isAsideMounted = (await drawerAside.count()) > 0;
    const dockAriaHidden = await dock.getAttribute('aria-hidden');
    const asideAriaHidden = await drawerAside.getAttribute('aria-hidden');
    const asideInert = await drawerAside.getAttribute('inert');
    const asideClass = (await drawerAside.getAttribute('class')) || '';

    if (
      isDockMounted &&
      isAsideMounted &&
      dockAriaHidden === 'true' &&
      asideAriaHidden === 'true' &&
      asideInert !== null &&
      asideClass.includes('invisible')
    ) {
      results.push({
        test: 'Initial Collapsed State & Attributes',
        status: 'PASS',
        details: 'Drawer is persistently mounted in DOM with aria-hidden="true", inert, and invisible.',
      });
    } else {
      results.push({
        test: 'Initial Collapsed State & Attributes',
        status: 'FAIL',
        details: `Unexpected collapsed attributes: dockAriaHidden=${dockAriaHidden}, asideAriaHidden=${asideAriaHidden}, inert=${asideInert}`,
      });
    }

    // Test whether keyboard focus can enter the collapsed drawer
    console.log('Testing keyboard Tab navigation when collapsed (must NEVER enter drawer)...');
    await triggerBtn.focus();
    let focusEnteredDrawer = false;
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab');
      const activeInfo = await page.evaluate(() => {
        const el = document.activeElement;
        const drawer = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
        const inside = drawer ? drawer.contains(el) : false;
        return { tag: el?.tagName, id: el?.id, inside };
      });
      if (activeInfo.inside) {
        focusEnteredDrawer = true;
        console.error(`Focus leaked into collapsed drawer at tab ${i}:`, activeInfo);
        break;
      }
    }

    // Direct programmatic .focus() attempt while inert
    const canDirectFocus = await page.evaluate(() => {
      const closeBtn = document.querySelector(
        'aside[aria-label="Planetary Site Intel Drawer"] button[aria-label="Close Site Intel Drawer"]'
      );
      if (!closeBtn) return true;
      (closeBtn as HTMLElement).focus();
      return document.activeElement === closeBtn;
    });

    if (!focusEnteredDrawer && !canDirectFocus) {
      results.push({
        test: 'Keyboard Focus Exclusion when Collapsed',
        status: 'PASS',
        details: '50 sequential Tab presses and programmatic .focus() confirmed keyboard focus never enters collapsed drawer.',
      });
    } else {
      results.push({
        test: 'Keyboard Focus Exclusion when Collapsed',
        status: 'FAIL',
        details: `Keyboard focus leaked (tabLeaked=${focusEnteredDrawer}, programmaticFocusable=${canDirectFocus}).`,
      });
    }

    // -------------------------------------------------------------
    // TEST 2: Open Drawer, Focus Containment & Escape Restoration
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Focus Trapping & Restoration on Open/Close ---');
    await triggerBtn.click();
    await page.waitForTimeout(400);

    const isOpenAside = await drawerAside.isVisible();
    const asideAriaHiddenOpen = await drawerAside.getAttribute('aria-hidden');

    let focusTrapped = true;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const el = document.activeElement;
        const drawer = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
        return drawer ? drawer.contains(el) : false;
      });
      if (!inside) {
        focusTrapped = false;
        console.error(`Focus escaped open drawer at tab ${i}`);
        break;
      }
    }

    // Press Escape to close and check focus restoration to trigger
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const isClosedAfterEscape = await drawerAside.getAttribute('aria-hidden');
    const focusedAfterEscape = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));

    // Check next tab moves freely outside
    await page.keyboard.press('Tab');
    const focusOutside = await page.evaluate(() => {
      const el = document.activeElement;
      const drawer = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
      return { inside: drawer ? drawer.contains(el) : false };
    });

    if (
      focusTrapped &&
      isClosedAfterEscape === 'true' &&
      focusedAfterEscape === 'toolbar-site-intel' &&
      !focusOutside.inside
    ) {
      results.push({
        test: 'Focus Trapping, Escape Restoration & Post-Close Escape',
        status: 'PASS',
        details: 'Focus strictly trapped inside open drawer; Escape closes drawer and restores focus to trigger; subsequent Tab moves freely.',
      });
    } else {
      results.push({
        test: 'Focus Trapping, Escape Restoration & Post-Close Escape',
        status: 'FAIL',
        details: `focusTrapped=${focusTrapped}, isClosedAfterEscape=${isClosedAfterEscape}, focusedAfterEscape=${focusedAfterEscape}, focusOutsideInside=${focusOutside.inside}`,
      });
    }

    // -------------------------------------------------------------
    // TEST 3: Scroll Position Persistence Across 10 Toggle Cycles
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Scroll Persistence Across 10 Consecutive Toggle Cycles ---');
    // Open drawer
    await triggerBtn.click();
    await page.waitForTimeout(400);

    // Set dock height constraint to simulate standard viewport height and activate vertical scrolling
    await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="spatial-left-drawer-dock"]');
      if (dock) (dock as HTMLElement).style.height = '500px';
      const panel = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"] div[role="tabpanel"]');
      if (panel) {
        panel.scrollTop = 300;
        panel.dispatchEvent(new Event('scroll'));
      }
    });

    await page.waitForTimeout(200);
    const initialScrollTop = await page.evaluate(() => {
      const panel = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"] div[role="tabpanel"]');
      return panel ? panel.scrollTop : -1;
    });
    console.log(`Initial panel.scrollTop set to: ${initialScrollTop}`);

    let scrollPreservedAll10 = true;
    const cycleReadings: number[] = [];

    for (let cycle = 1; cycle <= 10; cycle++) {
      // Toggle closed
      await triggerBtn.click();
      await page.waitForTimeout(350);

      // Verify closed state
      const closedHidden = await drawerAside.getAttribute('aria-hidden');
      if (closedHidden !== 'true') {
        console.error(`Cycle ${cycle}: Drawer failed to close cleanly`);
        scrollPreservedAll10 = false;
      }

      // Toggle open
      await triggerBtn.click();
      await page.waitForTimeout(350);

      // Re-apply dock height constraint
      await page.evaluate(() => {
        const dock = document.querySelector('[data-testid="spatial-left-drawer-dock"]');
        if (dock) (dock as HTMLElement).style.height = '500px';
      });

      // Read restored scrollTop
      const restoredScrollTop = await page.evaluate(() => {
        const panel = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"] div[role="tabpanel"]');
        return panel ? panel.scrollTop : -1;
      });
      cycleReadings.push(restoredScrollTop);

      if (Math.abs(restoredScrollTop - initialScrollTop) > 2) {
        console.error(`Cycle ${cycle}: Scroll drift detected! Expected ${initialScrollTop}, got ${restoredScrollTop}`);
        scrollPreservedAll10 = false;
      }
    }

    console.log('10 Cycle Scroll Readings:', cycleReadings);

    if (scrollPreservedAll10 && cycleReadings.length === 10 && initialScrollTop === 300) {
      results.push({
        test: '10 Consecutive Toggle Cycles Scroll Retention',
        status: 'PASS',
        details: `Scroll position (${initialScrollTop}px) strictly survived all 10 toggle cycles without drift. Readings: [${cycleReadings.join(', ')}]`,
      });
    } else {
      results.push({
        test: '10 Consecutive Toggle Cycles Scroll Retention',
        status: 'FAIL',
        details: `Scroll failed to survive 10 cycles. Expected ${initialScrollTop}, readings: [${cycleReadings.join(', ')}]`,
      });
    }

    // -------------------------------------------------------------
    // TEST 4: Scroll Position Reset on Landing Site Switch
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Scroll Position Reset on Site Switch ---');
    const siteSelect = page.locator('[data-testid="scenario-site-select"]');

    // Currently on Shackleton Crater Rim with scrollTop = 300px
    console.log('Switching landing site to de Gerlache Rim 1 while drawer is OPEN...');
    await siteSelect.selectOption('de-gerlache-rim-1');
    await page.waitForTimeout(600);

    const scrollAfterSwitchOpen = await page.evaluate(() => {
      const panel = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"] div[role="tabpanel"]');
      const aside = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
      return {
        scrollTop: panel ? panel.scrollTop : -1,
        text: aside?.textContent?.slice(0, 80),
      };
    });
    console.log(`Scroll position after site switch (open): ${scrollAfterSwitchOpen.scrollTop}px (${scrollAfterSwitchOpen.text})`);

    // Now test switching site while drawer is CLOSED
    console.log('Testing site switch while drawer is CLOSED, then re-opening...');
    // Scroll down to 250px on de Gerlache
    await page.evaluate(() => {
      const panel = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"] div[role="tabpanel"]');
      if (panel) {
        panel.scrollTop = 250;
        panel.dispatchEvent(new Event('scroll'));
      }
    });
    await page.waitForTimeout(200);

    // Close drawer
    await triggerBtn.click();
    await page.waitForTimeout(350);

    // Switch site to Amundsen Crater Rim while closed
    await siteSelect.selectOption('amundsen-rim');
    await page.waitForTimeout(600);

    // Re-open drawer
    await triggerBtn.click();
    await page.waitForTimeout(350);

    await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="spatial-left-drawer-dock"]');
      if (dock) (dock as HTMLElement).style.height = '500px';
    });

    const scrollAfterReopenClosedSwitch = await page.evaluate(() => {
      const panel = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"] div[role="tabpanel"]');
      const aside = document.querySelector('aside[aria-label="Planetary Site Intel Drawer"]');
      return {
        scrollTop: panel ? panel.scrollTop : -1,
        text: aside?.textContent?.slice(0, 80),
      };
    });
    console.log(`Scroll position after re-open with site changed while closed: ${scrollAfterReopenClosedSwitch.scrollTop}px (${scrollAfterReopenClosedSwitch.text})`);

    const openResetPassed = scrollAfterSwitchOpen.scrollTop === 0;
    const closedResetPassed = scrollAfterReopenClosedSwitch.scrollTop === 0;

    if (openResetPassed && closedResetPassed) {
      results.push({
        test: 'Scroll Position Reset to 0 on Site Switch',
        status: 'PASS',
        details: 'Scroll resets to 0 both when switching site while drawer is open, and when switching while closed and subsequently re-opened.',
      });
    } else {
      results.push({
        test: 'Scroll Position Reset to 0 on Site Switch',
        status: 'FAIL',
        details: `openResetPassed=${openResetPassed} (scrollTop: ${scrollAfterSwitchOpen.scrollTop}), closedResetPassed=${closedResetPassed} (scrollTop: ${scrollAfterReopenClosedSwitch.scrollTop})`,
      });
    }

  } catch (err: any) {
    console.error('Test execution error:', err);
    results.push({
      test: 'Harness Execution',
      status: 'FAIL',
      details: `Exception thrown: ${err.message}`,
    });
  } finally {
    await browser.close();
  }

  console.log('\n=== EMPIRICAL STRESS TEST RESULTS ===');
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}: ${r.details}`);
  }

  const allPassed = results.length > 0 && results.every((r) => r.status === 'PASS');
  console.log(`\nOVERALL VERDICT: ${allPassed ? 'ALL TESTS PASSED' : 'TESTS FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

runEmpiricalStressTest();

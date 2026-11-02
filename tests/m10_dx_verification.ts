import { chromium } from 'playwright';

async function verifyInteractiveNavigation() {
  console.log('--- Starting DX & Interactive UI Verification ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  try {
    // 1. Initial Load at /
    console.log('[Step 1] Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    console.log(`[After Step 1] URL: ${page.url()}, History: ${await page.evaluate(() => window.history.length)}`);

    // Verify deduplicated header: only 1 tablist with projection tabs
    const tablists = await page.locator('nav[role="tablist"]').all();
    console.log(`Found ${tablists.length} tablist(s) on the page.`);
    const tabExploreCount = await page.locator('[data-testid="projection-tab-explore"]').count();
    const tabAnalyzeCount = await page.locator('[data-testid="projection-tab-analyze"]').count();
    const tabCompareCount = await page.locator('[data-testid="projection-tab-compare"]').count();
    console.log(`Tab counts: Explore=${tabExploreCount}, Analyze=${tabAnalyzeCount}, Compare=${tabCompareCount}`);
    if (tabExploreCount !== 1 || tabAnalyzeCount !== 1 || tabCompareCount !== 1) {
      throw new Error(`Duplicate tabs detected! Expected exactly 1 of each, got ${tabExploreCount}, ${tabAnalyzeCount}, ${tabCompareCount}`);
    }

    // Verify deduplicated controls: only 1 site selector
    const siteSelectCount = await page.locator('select#cfg-site-selector').count();
    const duplicateSiteSelectCount = await page.locator('select#site-selector').count();
    console.log(`Site selectors: cfg-site-selector=${siteSelectCount}, header-site-selector=${duplicateSiteSelectCount}`);
    if (duplicateSiteSelectCount > 0) {
      throw new Error('Duplicate site selector found in header!');
    }
    if (siteSelectCount !== 1) {
      throw new Error(`Expected 1 site selector, found ${siteSelectCount}`);
    }

    // 2. Tab Navigation to 2. ANALYZE
    console.log('[Step 2] Clicking 2. ANALYZE tab...');
    await page.locator('[data-testid="projection-tab-analyze"]').click();
    await page.waitForTimeout(800);
    console.log(`[After Step 2] URL: ${page.url()}, History: ${await page.evaluate(() => window.history.length)}`);
    const analyzeViewCount = await page.locator('[data-testid="projection-analyze"]').count();
    console.log(`Projection Analyze rendered: ${analyzeViewCount === 1}`);
    if (analyzeViewCount !== 1) {
      throw new Error('Failed to switch to Analyze projection!');
    }

    // 3. Tab Navigation to 3. COMPARE
    console.log('[Step 3] Clicking 3. COMPARE tab...');
    await page.locator('[data-testid="projection-tab-compare"]').click();
    await page.waitForTimeout(800);
    console.log(`[After Step 3] URL: ${page.url()}, History: ${await page.evaluate(() => window.history.length)}`);
    const compareViewCount = await page.locator('[data-testid="projection-compare"]').count();
    console.log(`Projection Compare rendered: ${compareViewCount === 1}`);
    if (compareViewCount !== 1) {
      throw new Error('Failed to switch to Compare projection!');
    }

    // 4. Return to 1. EXPLORE
    console.log('[Step 4] Clicking 1. EXPLORE tab...');
    await page.locator('[data-testid="projection-tab-explore"]').click();
    await page.waitForTimeout(800);
    console.log(`[After Step 4] URL: ${page.url()}, History: ${await page.evaluate(() => window.history.length)}`);
    const exploreViewCount = await page.locator('[data-testid="projection-explore"]').count();
    console.log(`Projection Explore rendered: ${exploreViewCount === 1}`);
    if (exploreViewCount !== 1) {
      throw new Error('Failed to return to Explore projection!');
    }

    // 5. Test Site Selection in ScenarioConfigBar
    console.log('[Step 5] Changing target site to "malapert-massif"...');
    await page.locator('select#cfg-site-selector').selectOption('malapert-massif');
    await page.waitForTimeout(600);
    const selectedSite = await page.locator('select#cfg-site-selector').inputValue();
    console.log(`Selected site in dropdown: ${selectedSite}`);
    if (selectedSite !== 'malapert-massif') {
      throw new Error(`Site change failed, got: ${selectedSite}`);
    }

    // 6. Test Mast Height Button
    console.log('[Step 6] Testing Mast Height button (10m)...');
    const mast10Btn = page.locator('[data-testid="mast-10m"]');
    await mast10Btn.click();
    await page.waitForTimeout(300);
    const isPressed = await mast10Btn.getAttribute('aria-pressed');
    console.log(`Mast 10m aria-pressed: ${isPressed}`);
    if (isPressed !== 'true') {
      throw new Error('Mast 10m button not pressed');
    }

    // 7. Test Passport Drawer
    console.log('[Step 7] Testing Passport Drawer toggle...');
    const passportBtn = page.locator('button', { hasText: 'PASSPORT' });
    await passportBtn.click();
    await page.waitForTimeout(500);
    const passportDrawer = page.locator('aside[aria-label="Selected Site Point Passport"]');
    const drawerOpen = (await passportDrawer.count()) > 0;
    console.log(`Passport drawer open: ${drawerOpen}`);
    if (!drawerOpen) {
      throw new Error('Passport drawer failed to open');
    }
    // Close passport drawer via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const drawerCountAfterEsc = await passportDrawer.count();
    console.log(`Passport drawer count after Escape: ${drawerCountAfterEsc}`);
    if (drawerCountAfterEsc !== 0) {
      throw new Error('Passport drawer failed to close on Escape');
    }

    // 8. Test Mission Dossier Modal
    console.log('[Step 8] Testing Mission Dossier Modal...');
    const dossierBtn = page.locator('[data-testid="scenario-export-dossier"]');
    await dossierBtn.click();
    await page.waitForTimeout(500);
    const dialog = page.locator('[role="dialog"]');
    const dialogCount = await dialog.count();
    console.log(`Dossier dialog count: ${dialogCount}`);
    if (dialogCount === 0) {
      throw new Error('Dossier dialog failed to open');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const dialogCountAfterEsc = await dialog.count();
    console.log(`Dossier dialog count after Escape: ${dialogCountAfterEsc}`);
    if (dialogCountAfterEsc !== 0) {
      throw new Error('Dossier dialog failed to close on Escape');
    }

    // 9. Test Browser Back and Forward Navigation (popstate)
    console.log('[Step 9] Testing Browser Back/Forward navigation...');
    const histLen = await page.evaluate(() => window.history.length);
    console.log(`History length before goBack: ${histLen}, current URL: ${page.url()}`);

    await page.goBack();
    await page.waitForTimeout(600);
    console.log(`URL after first goBack: ${page.url()}`);
    const backToCompare = await page.locator('[data-testid="projection-compare"]').count();
    console.log(`Navigated Back to Compare: ${backToCompare === 1}`);

    await page.goBack();
    await page.waitForTimeout(600);
    console.log(`URL after second goBack: ${page.url()}`);
    const backToAnalyze = await page.locator('[data-testid="projection-analyze"]').count();
    console.log(`Navigated Back to Analyze: ${backToAnalyze === 1}`);
    if (backToAnalyze !== 1) {
      throw new Error('Browser Back failed to switch to Analyze projection!');
    }

    // Go forward to compare:
    await page.goForward();
    await page.waitForTimeout(600);
    const forwardToCompare = await page.locator('[data-testid="projection-compare"]').count();
    console.log(`Navigated Forward to Compare: ${forwardToCompare === 1}`);
    if (forwardToCompare !== 1) {
      throw new Error('Browser Forward failed to switch to Compare projection!');
    }

    console.log('\n=== ALL INTERACTIVE VERIFICATIONS PASSED CLEANLY! ===');
  } finally {
    await browser.close();
  }
}

verifyInteractiveNavigation().catch((err) => {
  console.error('[FAILED]', err);
  process.exit(1);
});

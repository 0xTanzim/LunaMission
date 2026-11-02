import { chromium, type Browser, type Page } from 'playwright';

async function runBrowserEmpiricalChallenge() {
  console.log('🧪 Starting Challenger Empirical Real-Browser Verification on http://localhost:3000...');

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page: Page = await context.newPage();

  const report = {
    ephemerisTelecom: {
      passed: false,
      details: [] as string[],
    },
    cassaCompare: {
      passed: false,
      renderedCandidateCount: 0,
      epochFilterTested: '',
      hasAll13Sites: false,
      details: [] as string[],
    },
    wcagDrawers: {
      copilot: {
        escapeCloses: false,
        focusTrapped: false,
        focusRestored: false,
        details: [] as string[],
      },
      passport: {
        escapeCloses: false,
        focusTrapped: false,
        focusRestored: false,
        details: [] as string[],
      },
    },
  };

  try {
    // =========================================================================
    // 1. Physical Ephemeris & DSN Telecom on /horizon
    // =========================================================================
    console.log('\n--- 1. Testing Physical Ephemeris & DSN Telecom on /horizon ---');
    await page.goto('http://localhost:3000/horizon', { waitUntil: 'networkidle' });

    // Read initial DSN Distance and FSPL
    const initialText = await page.textContent('body');
    const distMatch1 = initialText?.match(/Dist:\s*([0-9,]+)\s*km/);
    const fsplMatch1 = initialText?.match(/Path Loss \(FSPL\):\s*([0-9.]+)\s*dB/);

    const dist1Str = distMatch1 ? distMatch1[1] : 'NOT_FOUND';
    const fspl1Str = fsplMatch1 ? fsplMatch1[1] : 'NOT_FOUND';
    report.ephemerisTelecom.details.push(`Initial readout: Dist = ${dist1Str} km, FSPL = ${fspl1Str} dB`);

    // Verify distance is NOT hardcoded static 384,400 km if epoch is different
    const isStaticPlaceholder = dist1Str === '384,400';
    report.ephemerisTelecom.details.push(`Is static 384,400 placeholder? ${isStaticPlaceholder}`);

    // Step time forward to observe dynamic modulation
    const stepForwardBtn = page.locator('button[aria-label*="Step forward"]').first();
    if (await stepForwardBtn.count() > 0) {
      for (let i = 0; i < 24; i++) {
        await stepForwardBtn.click();
      }
      await page.waitForTimeout(300);

      const afterStepText = await page.textContent('body');
      const distMatch2 = afterStepText?.match(/Dist:\s*([0-9,]+)\s*km/);
      const fsplMatch2 = afterStepText?.match(/Path Loss \(FSPL\):\s*([0-9.]+)\s*dB/);
      const dist2Str = distMatch2 ? distMatch2[1] : 'NOT_FOUND';
      const fspl2Str = fsplMatch2 ? fsplMatch2[1] : 'NOT_FOUND';

      report.ephemerisTelecom.details.push(`After 24h step: Dist = ${dist2Str} km, FSPL = ${fspl2Str} dB`);
      const changed = dist1Str !== dist2Str && fspl1Str !== fspl2Str;
      report.ephemerisTelecom.details.push(`Did distance & FSPL modulate dynamically? ${changed}`);
      report.ephemerisTelecom.passed = changed || (!isStaticPlaceholder && dist1Str !== 'NOT_FOUND');
    }

    // =========================================================================
    // 2. CASSA Decision Gates on /compare (CandidateSiteCompare.tsx)
    // =========================================================================
    console.log('\n--- 2. Testing CASSA Decision Gates on /compare ---');
    await page.goto('http://localhost:3000/compare', { waitUntil: 'networkidle' });

    // Ensure Decision Workbench is active
    const workbenchBtn = page.locator('[data-testid="compare-subview-workbench"]');
    if (await workbenchBtn.count() > 0) {
      await workbenchBtn.click();
      await page.waitForTimeout(300);
    }

    // Check Candidate cards rendered
    const candidateCards = page.locator('h3.font-semibold');
    const count = await candidateCards.count();
    report.cassaCompare.renderedCandidateCount = count;
    const siteNames: string[] = [];
    for (let i = 0; i < count; i++) {
      siteNames.push((await candidateCards.nth(i).textContent()) || '');
    }
    report.cassaCompare.details.push(`Rendered candidate cards count: ${count}`);
    report.cassaCompare.details.push(`Candidate names: ${siteNames.join(', ')}`);

    // Check CASSA badges
    const cassaBadges = page.locator('text=/CASSA:/');
    const badgeCount = await cassaBadges.count();
    report.cassaCompare.details.push(`CASSA badges count: ${badgeCount}`);

    // Click "Legacy 2022 (13)" tab to test if 13 Artemis III sites appear
    const legacyTab = page.locator('button:has-text("Legacy 2022 (13)")');
    if (await legacyTab.count() > 0) {
      await legacyTab.click();
      await page.waitForTimeout(300);
      const countAfterTab = await candidateCards.count();
      const siteNamesAfter: string[] = [];
      for (let i = 0; i < countAfterTab; i++) {
        siteNamesAfter.push((await candidateCards.nth(i).textContent()) || '');
      }
      report.cassaCompare.details.push(`After clicking 'Legacy 2022 (13)': count = ${countAfterTab}`);
      report.cassaCompare.details.push(`Sites rendered: ${siteNamesAfter.join(', ')}`);
      report.cassaCompare.hasAll13Sites = countAfterTab === 13;
      report.cassaCompare.passed = countAfterTab === 13;
    }

    // =========================================================================
    // 3. WCAG Keyboard & Focus Trap in CopilotDrawer and PassportDrawer
    // =========================================================================
    console.log('\n--- 3. Testing WCAG Keyboard & Focus Trap on CopilotDrawer ---');
    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

    // Open Copilot Drawer
    const copilotTrigger = page.locator('[data-testid="header-copilot-trigger"]').first();
    await copilotTrigger.focus();
    await copilotTrigger.click();
    await page.waitForTimeout(300);

    const copilotDrawer = page.locator('aside[aria-label="AI Flight Copilot Workspace Drawer"]');
    const isCopilotOpen = await copilotDrawer.isVisible();
    report.wcagDrawers.copilot.details.push(`CopilotDrawer visible after trigger click: ${isCopilotOpen}`);

    // Check activeElement immediately after open
    const activeElAfterOpen = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80));
    report.wcagDrawers.copilot.details.push(`activeElement immediately after open: ${activeElAfterOpen}`);

    // Press Tab multiple times and check if focus remains inside drawer
    let focusLeakedCopilot = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const isInside = await page.evaluate(() => {
        const drawer = document.querySelector('aside[aria-label="AI Flight Copilot Workspace Drawer"]');
        return drawer ? drawer.contains(document.activeElement) : false;
      });
      if (!isInside) {
        focusLeakedCopilot = true;
        const outsideEl = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80));
        report.wcagDrawers.copilot.details.push(`Focus leaked outside CopilotDrawer on Tab #${i + 1} to: ${outsideEl}`);
        break;
      }
    }
    report.wcagDrawers.copilot.focusTrapped = !focusLeakedCopilot;
    report.wcagDrawers.copilot.details.push(`Focus strictly trapped inside CopilotDrawer? ${!focusLeakedCopilot}`);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isCopilotOpenAfterEsc = await copilotDrawer.isVisible();
    report.wcagDrawers.copilot.escapeCloses = !isCopilotOpenAfterEsc;
    report.wcagDrawers.copilot.details.push(`Closed after Escape? ${!isCopilotOpenAfterEsc}`);

    // Check if focus returned to trigger
    const activeElAfterClose = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? (el.getAttribute('data-testid') || el.tagName) : null;
    });
    report.wcagDrawers.copilot.focusRestored = activeElAfterClose === 'header-copilot-trigger';
    report.wcagDrawers.copilot.details.push(`Focus restored to trigger? ${activeElAfterClose === 'header-copilot-trigger'} (active: ${activeElAfterClose})`);

    // Test PassportDrawer in Dual View
    console.log('\n--- 4. Testing WCAG Keyboard & Focus Trap on PassportDrawer ---');
    await page.click('button:has-text("Dual View")');
    await page.waitForTimeout(300);

    const passportTrigger = page.locator('button:has-text("Point Passport")').first();
    if (await passportTrigger.count() > 0) {
      await passportTrigger.focus();
      await passportTrigger.click();
      await page.waitForTimeout(300);

      const passportDrawer = page.locator('aside[aria-label="Selected Site Point Passport"]');
      const isPassportOpen = await passportDrawer.isVisible();
      report.wcagDrawers.passport.details.push(`PassportDrawer visible after trigger click: ${isPassportOpen}`);

      // Check focus containment
      let focusLeakedPassport = false;
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        const isInside = await page.evaluate(() => {
          const drawer = document.querySelector('aside[aria-label="Selected Site Point Passport"]');
          return drawer ? drawer.contains(document.activeElement) : false;
        });
        if (!isInside) {
          focusLeakedPassport = true;
          const outsideEl = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80));
          report.wcagDrawers.passport.details.push(`Focus leaked outside PassportDrawer on Tab #${i + 1} to: ${outsideEl}`);
          break;
        }
      }
      report.wcagDrawers.passport.focusTrapped = !focusLeakedPassport;
      report.wcagDrawers.passport.details.push(`Focus strictly trapped inside PassportDrawer? ${!focusLeakedPassport}`);

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const isPassportOpenAfterEsc = await passportDrawer.isVisible();
      report.wcagDrawers.passport.escapeCloses = !isPassportOpenAfterEsc;
      report.wcagDrawers.passport.details.push(`Closed after Escape? ${!isPassportOpenAfterEsc}`);
    } else {
      report.wcagDrawers.passport.details.push('Point Passport button not found in Dual View');
    }

    console.log('\n================ EMPIRICAL BROWSER RESULTS ================');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

runBrowserEmpiricalChallenge().catch((err) => {
  console.error('Browser challenge execution error:', err);
  process.exit(1);
});

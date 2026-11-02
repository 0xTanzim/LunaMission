import { chromium, type Browser, type Page } from 'playwright';

async function testDrawerWcagFocusTrap() {
  console.log('🧪 Starting Dedicated Challenger WCAG 2.1 AA Focus Trap Stress Test...');

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page: Page = await context.newPage();

  try {
    // -------------------------------------------------------------------------
    // 1. CopilotDrawer Focus Trap Stress
    // -------------------------------------------------------------------------
    console.log('\n--- Stress Testing CopilotDrawer Initial Focus & Focus Trap ---');
    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

    const copilotTrigger = page.locator('[data-testid="header-copilot-trigger"]').first();
    await copilotTrigger.focus();
    await copilotTrigger.click();
    await page.waitForTimeout(300);

    const copilotDrawer = page.locator('aside[aria-label="AI Flight Copilot Workspace Drawer"]');
    const isVisible = await copilotDrawer.isVisible();
    if (!isVisible) throw new Error('CopilotDrawer failed to open.');

    // 1.1 Verify initial focus is on close button
    const initialActive = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName.toLowerCase(),
        ariaLabel: el?.getAttribute('aria-label'),
        isInsideDrawer: document.querySelector('aside[aria-label="AI Flight Copilot Workspace Drawer"]')?.contains(el),
      };
    });
    console.log('CopilotDrawer initial active element:', initialActive);
    if (!initialActive.isInsideDrawer) {
      throw new Error(`Initial active element is OUTSIDE drawer: ${JSON.stringify(initialActive)}`);
    }
    if (initialActive.ariaLabel !== 'Close copilot drawer') {
      throw new Error(`Initial active element is not the close button! Found: ${initialActive.ariaLabel}`);
    }

    // 1.2 Press Tab from initial focus and verify it advances inside drawer without escaping
    await page.keyboard.press('Tab');
    const tab1Active = await page.evaluate(() => {
      const el = document.activeElement;
      const drawer = document.querySelector('aside[aria-label="AI Flight Copilot Workspace Drawer"]');
      return {
        tag: el?.tagName.toLowerCase(),
        text: el?.textContent?.slice(0, 30),
        isInsideDrawer: drawer ? drawer.contains(el) : false,
      };
    });
    console.log('After 1st Tab from close button:', tab1Active);
    if (!tab1Active.isInsideDrawer) {
      throw new Error(`Focus escaped drawer on first Tab press! Active: ${JSON.stringify(tab1Active)}`);
    }

    // 1.3 Press Shift+Tab to verify reverse wrap
    // Currently on 2nd element, Shift+Tab goes to close button
    await page.keyboard.press('Shift+Tab');
    const closeBtnActive = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    if (closeBtnActive !== 'Close copilot drawer') {
      throw new Error(`Shift+Tab did not return to close button. Found: ${closeBtnActive}`);
    }

    // Shift+Tab from close button (first focusable element) should WRAP to last focusable element
    await page.keyboard.press('Shift+Tab');
    const wrappedLast = await page.evaluate(() => {
      const el = document.activeElement;
      const drawer = document.querySelector('aside[aria-label="AI Flight Copilot Workspace Drawer"]');
      return {
        tag: el?.tagName.toLowerCase(),
        type: el?.getAttribute('type'),
        placeholder: el?.getAttribute('placeholder'),
        ariaLabel: el?.getAttribute('aria-label'),
        isInsideDrawer: drawer ? drawer.contains(el) : false,
      };
    });
    console.log('After Shift+Tab on first element (wrap to last):', wrappedLast);
    if (!wrappedLast.isInsideDrawer) {
      throw new Error(`Shift+Tab on first element leaked outside! Active: ${JSON.stringify(wrappedLast)}`);
    }

    // 1.4 Test forward wrap: Tab repeatedly until wrap back to first element
    let wrappedToFirst = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const cur = await page.evaluate(() => {
        const el = document.activeElement;
        const drawer = document.querySelector('aside[aria-label="AI Flight Copilot Workspace Drawer"]');
        return {
          isInside: drawer ? drawer.contains(el) : false,
          isCloseBtn: el?.getAttribute('aria-label') === 'Close copilot drawer',
        };
      });
      if (!cur.isInside) {
        throw new Error(`Focus leaked outside on Tab step ${i + 1}`);
      }
      if (cur.isCloseBtn) {
        wrappedToFirst = true;
        console.log(`Successfully wrapped forward to first element (Close button) on Tab step ${i + 1}`);
        break;
      }
    }
    if (!wrappedToFirst) {
      throw new Error('Tab cycle did not wrap back to Close button within 20 presses');
    }

    // 1.5 Test rogue external focus containment: if focus is manually stolen outside, does Tab recover it?
    await page.evaluate(() => {
      const headerGuide = document.querySelector('button[aria-label="Observatory Guide & Documentation"]') as HTMLElement;
      headerGuide?.focus();
    });
    const stolenActive = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    console.log('Artificially stolen focus element:', stolenActive);

    await page.keyboard.press('Tab');
    const recoveredActive = await page.evaluate(() => {
      const el = document.activeElement;
      const drawer = document.querySelector('aside[aria-label="AI Flight Copilot Workspace Drawer"]');
      return {
        isInsideDrawer: drawer ? drawer.contains(el) : false,
        ariaLabel: el?.getAttribute('aria-label'),
      };
    });
    console.log('After Tab with stolen external focus:', recoveredActive);
    if (!recoveredActive.isInsideDrawer) {
      throw new Error('Rogue external focus was not recaptured into drawer on Tab press');
    }

    // 1.6 Escape key closes drawer and restores focus to trigger
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isCopilotStillOpen = await copilotDrawer.isVisible();
    if (isCopilotStillOpen) {
      throw new Error('Escape key failed to close CopilotDrawer');
    }
    const restoredTrigger = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    console.log('Restored focus element after Escape:', restoredTrigger);
    if (restoredTrigger !== 'header-copilot-trigger') {
      throw new Error(`Focus not restored to header-copilot-trigger. Got: ${restoredTrigger}`);
    }

    // -------------------------------------------------------------------------
    // 2. PassportDrawer Focus Trap Stress
    // -------------------------------------------------------------------------
    console.log('\n--- Stress Testing PassportDrawer Initial Focus & Focus Trap ---');
    await page.click('button:has-text("Dual View")');
    await page.waitForTimeout(300);

    const passportTrigger = page.locator('button:has-text("Point Passport")').first();
    await passportTrigger.focus();
    await passportTrigger.click();
    await page.waitForTimeout(300);

    const passportDrawer = page.locator('aside[aria-label="Selected Site Point Passport"]');
    const isPassportVisible = await passportDrawer.isVisible();
    if (!isPassportVisible) throw new Error('PassportDrawer failed to open.');

    // 2.1 Initial focus must be close button
    const passportInitialActive = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName.toLowerCase(),
        ariaLabel: el?.getAttribute('aria-label'),
        isInsideDrawer: document.querySelector('aside[aria-label="Selected Site Point Passport"]')?.contains(el),
      };
    });
    console.log('PassportDrawer initial active element:', passportInitialActive);
    if (!passportInitialActive.isInsideDrawer) {
      throw new Error(`PassportDrawer initial focus is outside! ${JSON.stringify(passportInitialActive)}`);
    }
    if (passportInitialActive.ariaLabel !== 'Close Point Passport overlay') {
      throw new Error(`PassportDrawer initial focus is not Close button! Found: ${passportInitialActive.ariaLabel}`);
    }

    // 2.2 Tab cycling: 15 Tab presses must all remain strictly inside PassportDrawer
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const isInside = await page.evaluate(() => {
        const drawer = document.querySelector('aside[aria-label="Selected Site Point Passport"]');
        return drawer ? drawer.contains(document.activeElement) : false;
      });
      if (!isInside) {
        const leaked = await page.evaluate(() => document.activeElement?.outerHTML);
        throw new Error(`Focus leaked from PassportDrawer on Tab ${i + 1}: ${leaked}`);
      }
    }
    console.log('All 15 Tab presses remained strictly contained inside PassportDrawer');

    // 2.3 Escape key closes PassportDrawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isPassportStillOpen = await passportDrawer.isVisible();
    if (isPassportStillOpen) {
      throw new Error('Escape key failed to close PassportDrawer');
    }
    console.log('PassportDrawer closed cleanly on Escape');

    console.log('\n✅ ALL WCAG 2.1 AA FOCUS TRAP INVARIANTS EMPIRICALLY CONFIRMED!');
  } finally {
    await browser.close();
  }
}

testDrawerWcagFocusTrap().catch((err) => {
  console.error('\n❌ WCAG FOCUS TRAP EMPIRICAL VERIFICATION FAILED:', err);
  process.exit(1);
});

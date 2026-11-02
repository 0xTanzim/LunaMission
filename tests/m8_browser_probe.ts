import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('--- 1. Navigating to http://localhost:3000 ---');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Check if export dossier button exists
  const exportBtn = page.locator('[data-testid="scenario-export-dossier"]');
  const count = await exportBtn.count();
  console.log(`Dossier trigger button count: ${count}`);
  if (count === 0) {
    console.error('Trigger button not found on page');
    await browser.close();
    return;
  }

  // Focus trigger button
  await exportBtn.focus();
  const focusedBeforeOpen = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  console.log(`Focused element before modal open: ${focusedBeforeOpen}`);

  // Click trigger button
  await exportBtn.click();
  await page.waitForTimeout(300);

  // Check if dialog is open
  const dialog = page.locator('[role="dialog"]');
  console.log(`Dialog open count: ${await dialog.count()}`);

  // Check focused element immediately after open
  const focusedAfterOpen = await page.evaluate(() => ({
    tagName: document.activeElement?.tagName,
    id: document.activeElement?.id,
    role: document.activeElement?.getAttribute('role'),
    className: document.activeElement?.className,
    tabIndex: (document.activeElement as HTMLElement)?.tabIndex,
  }));
  console.log('Focused element after modal open:', JSON.stringify(focusedAfterOpen));

  // Press Tab 10 times and log where focus goes
  console.log('\n--- 2. Tabbing through modal elements ---');
  for (let i = 1; i <= 10; i++) {
    await page.keyboard.press('Tab');
    const tabbedFocus = await page.evaluate(() => {
      const el = document.activeElement;
      const isInsideDialog = el ? document.querySelector('[role="dialog"]')?.contains(el) : false;
      return {
        tag: el?.tagName,
        id: el?.id,
        role: el?.getAttribute('role'),
        ariaLabel: el?.getAttribute('aria-label'),
        text: el?.textContent?.slice(0, 30)?.trim(),
        isInsideDialog,
      };
    });
    console.log(`Tab ${i}:`, JSON.stringify(tabbedFocus));
  }

  // Test Escape key handling
  console.log('\n--- 3. Testing Escape key press ---');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  console.log(`Dialog count after Escape: ${await page.locator('[role="dialog"]').count()}`);
  const focusedAfterEscape = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  console.log(`Focused element after Escape: ${focusedAfterEscape} (expected: scenario-export-dossier)`);

  // Test Backdrop clicking vs Inner Card clicking
  console.log('\n--- 4. Testing Backdrop vs Inner Card Click ---');
  await exportBtn.click();
  await page.waitForTimeout(200);
  console.log(`Dialog re-opened: ${await page.locator('[role="dialog"]').count()}`);

  // Click inner card
  const innerCard = page.locator('[role="dialog"] > div');
  const box = await innerCard.boundingBox();
  if (box) {
    // Click center of inner card
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    console.log(`Dialog count after clicking inner card center: ${await page.locator('[role="dialog"]').count()}`);
  }

  // Click backdrop outside the inner card (e.g. at x=10, y=10)
  await page.mouse.click(10, 10);
  await page.waitForTimeout(200);
  console.log(`Dialog count after clicking backdrop (10, 10): ${await page.locator('[role="dialog"]').count()}`);

  // Test Custom Coordinate Scenario Context
  console.log('\n--- 5. Testing Custom Coordinate URL navigation ---');
  // Navigate with custom coordinate in URL if supported or check shell state
  await page.goto('http://localhost:3000/?lat=-85.5&lon=120.0&custom=true', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Check if dossier modal displays custom target
  const exportBtnCustom = page.locator('[data-testid="scenario-export-dossier"]');
  if (await exportBtnCustom.count() > 0) {
    await exportBtnCustom.click();
    await page.waitForTimeout(500);
    const modalText = await page.locator('[role="dialog"]').textContent();
    console.log(`Modal contains 'Custom Landing Target': ${modalText?.includes('Custom Landing Target')}`);
    console.log(`Modal contains '-85.5': ${modalText?.includes('-85.5')}`);
    console.log(`Modal contains '120': ${modalText?.includes('120')}`);
  }

  await browser.close();
}

main().catch(console.error);

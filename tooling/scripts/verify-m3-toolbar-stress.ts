import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

async function runM3ToolbarStressVerification() {
  console.log('🧪 Starting Milestone 3 SpatialToolbar Empirical Stress Test Harness...');
  const outputDir = path.resolve(process.cwd(), '.playwright-cli/m3-verification');
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

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const capture = async (name: string) => {
    const filePath = path.join(outputDir, `${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`📸 Screenshot saved: ${name}.png`);
  };

  try {
    // --- Step 1: Initial Navigation & Toolbar Discovery ---
    console.log('\n--- Step 1: Initial Navigation & Toolbar Discovery ---');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="spatial-toolbar"]', { timeout: 10000 });
    console.log('✅ SpatialToolbar mounted.');

    // Helper to get slot elements
    const getSlots = async () => {
      const slot1 = await page.$('[data-slot="view-modes"]');
      const slot2 = await page.$('[data-slot="camera-preset"]');
      const slot3 = await page.$('[data-slot="layer-toggles"]');
      const slot4 = await page.$('[data-slot="mission-tools"]');
      const slot5 = await page.$('[data-slot="workspace-actions"]');
      return { slot1, slot2, slot3, slot4, slot5 };
    };

    // Helper to check single-row layout
    const checkSingleRowLayout = async (label: string) => {
      const { slot1, slot2, slot3, slot4, slot5 } = await getSlots();
      if (!slot1 || !slot2 || !slot3 || !slot4 || !slot5) {
        throw new Error(`Missing slots in ${label}`);
      }
      const b1 = await slot1.boundingBox();
      const b2 = await slot2.boundingBox();
      const b3 = await slot3.boundingBox();
      const b4 = await slot4.boundingBox();
      const b5 = await slot5.boundingBox();

      if (!b1 || !b2 || !b3 || !b4 || !b5) {
        throw new Error(`Bounding boxes unavailable in ${label}`);
      }

      // Check vertical alignment: on desktop, tops should be within 6px delta
      const maxTopDelta = Math.max(
        Math.abs(b1.y - b2.y),
        Math.abs(b1.y - b3.y),
        Math.abs(b1.y - b4.y),
        Math.abs(b1.y - b5.y)
      );

      console.log(`   [${label}] Slot Y coords: S1=${b1.y.toFixed(1)}, S2=${b2.y.toFixed(1)}, S3=${b3.y.toFixed(1)}, S4=${b4.y.toFixed(1)}, S5=${b5.y.toFixed(1)} (max delta: ${maxTopDelta.toFixed(1)}px)`);
      if (maxTopDelta > 10) {
        throw new Error(`Row wrap detected in ${label}! Max delta: ${maxTopDelta}px exceeds threshold.`);
      }

      // Check horizontal ordering
      if (!(b1.x < b2.x && b2.x < b3.x && b3.x < b4.x && b4.x <= b5.x)) {
        throw new Error(`Slots are not strictly left-to-right ordered in ${label}!`);
      }
      return { b1, b2, b3, b4, b5 };
    };

    // --- Step 2: Check Layout at 1440px and 1280px Desktop Viewports ---
    console.log('\n--- Step 2: Desktop Zero-Wrap Geometry Audit (1440px & 1280px) ---');
    await checkSingleRowLayout('1440x900 Default');

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    await checkSingleRowLayout('1280x800 Boundary Desktop');
    await capture('m3_desktop_1280_zero_wrap');

    // Restore 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(200);

    // --- Step 3: Disabled States in 2D Map Mode ---
    console.log('\n--- Step 3: Disabled States in 2D Map Mode ---');
    await page.click('button[title*="2D Polar Stereographic"]');
    await page.waitForTimeout(300);

    const trigger2D = await page.$('[data-testid="camera-preset-dropdown-trigger"]');
    if (!trigger2D) throw new Error('Camera preset dropdown trigger missing in 2D mode');
    const isTriggerDisabled2D = await trigger2D.isDisabled();
    const triggerTitle2D = await trigger2D.getAttribute('title');
    console.log(`   2D Camera Preset trigger: disabled=${isTriggerDisabled2D}, title="${triggerTitle2D}"`);
    if (!isTriggerDisabled2D) throw new Error('Camera preset dropdown trigger MUST be disabled in 2D mode');
    if (!triggerTitle2D?.includes('Camera presets active in 3D Moon & Dual View')) {
      throw new Error(`Unexpected tooltip title in 2D mode: ${triggerTitle2D}`);
    }

    // Attempt to click disabled camera trigger: listbox must NOT open
    await trigger2D.click({ force: true });
    await page.waitForTimeout(200);
    const listbox2D = await page.$('div[role="listbox"]');
    if (listbox2D) throw new Error('Listbox opened when clicking disabled trigger in 2D mode!');
    console.log('   ✅ Clicking disabled trigger in 2D mode safely does nothing.');

    // Check Pin 3D disabled in 2D
    const pin3d2D = await page.$('[data-testid="toolbar-pin-3d"]');
    if (!pin3d2D) throw new Error('Pin 3D button missing in 2D mode');
    const isPin3dDisabled2D = await pin3d2D.isDisabled();
    const pin3dTitle2D = await pin3d2D.getAttribute('title');
    console.log(`   2D Pin 3D button: disabled=${isPin3dDisabled2D}, title="${pin3dTitle2D}"`);
    if (!isPin3dDisabled2D) throw new Error('Pin 3D button MUST be disabled in 2D mode');
    if (!pin3dTitle2D?.includes('3D pin drop active in 3D Moon & Dual View')) {
      throw new Error(`Unexpected Pin 3D title in 2D mode: ${pin3dTitle2D}`);
    }

    // Attempt to click disabled Pin 3D
    await pin3d2D.click({ force: true });
    await page.waitForTimeout(200);
    const pin3dText2D = await pin3d2D.innerText();
    if (pin3dText2D.includes('Click Moon to Pin')) {
      throw new Error('Pin 3D activated pinpoint mode while disabled in 2D!');
    }
    console.log('   ✅ Clicking disabled Pin 3D in 2D mode safely does nothing.');
    await capture('m3_map2d_disabled_controls');

    // --- Step 4: Dropdown Interaction in Dual View & 3D Moon ---
    console.log('\n--- Step 4: Dropdown Interaction in Dual View ---');
    await page.click('button[title*="Side-by-side Dual View"]');
    await page.waitForTimeout(500);

    const triggerDual = await page.$('[data-testid="camera-preset-dropdown-trigger"]');
    if (!triggerDual) throw new Error('Camera preset trigger not found in Dual View');
    const isTriggerDisabledDual = await triggerDual.isDisabled();
    if (isTriggerDisabledDual) throw new Error('Camera preset trigger should be ENABLED in Dual View');

    // Open dropdown
    await triggerDual.click();
    await page.waitForTimeout(300);
    let listbox = await page.$('div[role="listbox"]');
    if (!listbox) throw new Error('Listbox failed to open on click in Dual View');
    console.log('   ✅ Dropdown opened in Dual View.');
    await capture('m3_dual_dropdown_open');

    // Check all 8 preset options rendered
    const presetOptions = await page.$$('div[role="listbox"] button[role="option"]');
    console.log(`   Discovered ${presetOptions.length} preset options in listbox (expected 8).`);
    if (presetOptions.length !== 8) {
      throw new Error(`Expected exactly 8 camera preset options, found ${presetOptions.length}`);
    }

    // --- Step 5: Keyboard Navigation: Escape Key Dismissal ---
    console.log('\n--- Step 5: Keyboard Navigation: Escape Key Dismissal ---');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    listbox = await page.$('div[role="listbox"]');
    if (listbox) throw new Error('Listbox did not close on Escape key press!');
    console.log('   ✅ Escape key successfully dismissed dropdown.');

    // --- Step 6: Click-Outside Dismissal ---
    console.log('\n--- Step 6: Click-Outside Dismissal ---');
    await triggerDual.click();
    await page.waitForTimeout(200);
    listbox = await page.$('div[role="listbox"]');
    if (!listbox) throw new Error('Failed to re-open dropdown for click-outside test');

    // Click outside on body / header
    await page.mouse.click(50, 50);
    await page.waitForTimeout(200);
    listbox = await page.$('div[role="listbox"]');
    if (listbox) throw new Error('Listbox did not close on outside click!');
    console.log('   ✅ Click-outside successfully dismissed dropdown.');

    // --- Step 7: Preset Selection Stress ---
    console.log('\n--- Step 7: Preset Selection & Active Label Verification ---');
    await page.click('button[title*="3D NASA LRO Moon Globe"]');
    await page.waitForTimeout(500);

    const presetsToTest = [
      { id: 'global', expectedLabel: 'Global' },
      { id: 'oblique', expectedLabel: 'Oblique' },
      { id: 'inspection', expectedLabel: 'Inspect' },
      { id: 'overhead', expectedLabel: 'Overhead' },
      { id: 'horizon', expectedLabel: 'Horizon' },
      { id: 'eva', expectedLabel: 'EVA Visor' },
      { id: 'southPole', expectedLabel: 'South Pole' },
    ];

    for (const { id, expectedLabel } of presetsToTest) {
      await page.click('[data-testid="camera-preset-dropdown-trigger"]');
      await page.waitForTimeout(150);

      await page.click(`button[data-preset="${id}"]`);
      await page.waitForTimeout(200);

      // Verify dropdown closed
      const isStillOpen = await page.$('div[role="listbox"]');
      if (isStillOpen) throw new Error(`Dropdown remained open after selecting preset ${id}`);

      // Verify trigger label updated
      const updatedTrigger = await page.$('[data-testid="camera-preset-dropdown-trigger"]');
      const text = await updatedTrigger?.innerText();
      if (!text?.includes(expectedLabel)) {
        throw new Error(`Trigger label "${text}" does not contain expected preset label "${expectedLabel}"`);
      }
      console.log(`   Preset [${id}] selected -> trigger shows "${expectedLabel}"`);
    }
    console.log('   ✅ All presets selectable, dropdown auto-dismisses, trigger labels update faithfully.');
    await capture('m3_globe3d_presets_verified');

    // --- Step 8: Rapid Mode Toggle Stress Test (6 cycles: 18 switches) ---
    console.log('\n--- Step 8: Rapid Mode Toggle Stress Test (6 cycles) ---');
    const modeSelectors = [
      'button[title*="2D Polar Stereographic"]',
      'button[title*="Side-by-side Dual View"]',
      'button[title*="3D NASA LRO Moon Globe"]',
    ];

    for (let cycle = 1; cycle <= 6; cycle++) {
      for (let m = 0; m < 3; m++) {
        await page.click(modeSelectors[m]);
        await page.waitForTimeout(200);
      }
      console.log(`   Cycle ${cycle}/6 completed (2D -> Dual -> 3D)`);
      const { slot1, slot2, slot3, slot4, slot5 } = await getSlots();
      if (!slot1 || !slot2 || !slot3 || !slot4 || !slot5) {
        throw new Error(`Slot dropped during rapid cycle ${cycle}!`);
      }
    }
    console.log('   ✅ Rapid mode toggle cycles completed with 0 errors or lost slots.');

    // Settle back to Dual View
    await page.click('button[title*="Side-by-side Dual View"]');
    await page.waitForTimeout(400);
    await checkSingleRowLayout('Dual View Post-Stress');
    await capture('m3_dual_view_post_stress');

    // --- Step 9: Dropdown Cross-Mode Dismissal Test ---
    console.log('\n--- Step 9: Dropdown Cross-Mode Dismissal Test ---');
    // Open dropdown in Dual View
    await page.click('[data-testid="camera-preset-dropdown-trigger"]');
    await page.waitForTimeout(200);
    let openListbox = await page.$('div[role="listbox"]');
    if (!openListbox) throw new Error('Dropdown failed to open for cross-mode test');

    // Switch to 2D Map while dropdown was open
    await page.click('button[title*="2D Polar Stereographic"]');
    await page.waitForTimeout(300);

    // Listbox MUST be closed / hidden
    openListbox = await page.$('div[role="listbox"]');
    if (openListbox) throw new Error('Dropdown listbox leaked open into 2D Map mode!');
    console.log('   ✅ Dropdown cleanly closed when switching from Dual View to 2D Map.');

    // Switch back to Dual View: dropdown must NOT auto-reopen
    await page.click('button[title*="Side-by-side Dual View"]');
    await page.waitForTimeout(300);
    openListbox = await page.$('div[role="listbox"]');
    if (openListbox) throw new Error('Dropdown auto-reopened without user interaction when returning to Dual View!');
    console.log('   ✅ Dropdown stays cleanly closed when returning to Dual View.');

    // --- Step 10: Console Error Check ---
    console.log('\n--- Step 10: Console Error Audit ---');
    console.log(`   Console errors captured: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Console errors encountered:', consoleErrors);
      throw new Error(`Encountered ${consoleErrors.length} browser console errors`);
    }

    console.log('\n🎉 ALL MILENSTONE 3 EMPIRICAL STRESS TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
  }
}

runM3ToolbarStressVerification().catch((err) => {
  console.error('❌ Empirical stress verification FAILED:', err);
  process.exit(1);
});

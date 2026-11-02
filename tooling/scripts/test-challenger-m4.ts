import { chromium } from 'playwright';

async function testChallengerScenarios() {
  console.log('=== Challenger 2 Deep Adversarial Verification ===');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const getWorkspaceMode = async () => {
    const text = await page.locator('section[aria-label="Spatial Workspace"] header').first().textContent();
    if (text?.includes('3D NASA LRO Moon Globe')) return 'globe3d';
    if (text?.includes('2D Polar Stereographic')) return 'map2d';
    if (text?.includes('Dual View') || text?.includes('2D + 3D')) return 'dual';
    return text || 'unknown';
  };

  // Scenario 1: Initial load on /scenario/3d-lab
  console.log('\n--- Scenario 1: Initial direct load of /scenario/3d-lab ---');
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const s1Header = await page.locator('header').first().isVisible();
  const s1Footer = await page.getByRole('contentinfo').isVisible();
  const s1Mode = await getWorkspaceMode();
  console.log('Scenario 1 - Header visible:', s1Header);
  console.log('Scenario 1 - Footer visible:', s1Footer);
  console.log('Scenario 1 - Workspace viewMode:', s1Mode);

  // Scenario 2: On /scenario/3d-lab, switch to 2D Map, then click header "🪐 3D Moon"
  console.log('\n--- Scenario 2: From /scenario/3d-lab, switch to 2D Map via toolbar, then click header "🪐 3D Moon" ---');
  const btn2D = page.locator('button:has-text("2D Map")').first();
  await btn2D.click();
  await page.waitForTimeout(600);
  const s2ModeAfter2D = await getWorkspaceMode();
  console.log('Scenario 2 - Mode after clicking 2D Map in toolbar:', s2ModeAfter2D);

  console.log('Scenario 2 - Clicking header "🪐 3D Moon" trigger button...');
  const triggerBtn = page.getByTestId('header-3d-moon-trigger');
  await triggerBtn.click();
  await page.waitForTimeout(1000);
  const s2ModeAfterTrigger = await getWorkspaceMode();
  console.log('Scenario 2 - Mode after clicking header "🪐 3D Moon":', s2ModeAfterTrigger);
  const s2BugReproduced = s2ModeAfterTrigger === 'map2d';
  console.log('Scenario 2 - BUG REPRODUCED (header button failed to switch to 3D):', s2BugReproduced);

  // Scenario 3: From root /, initial mode is map2d, click header "🪐 3D Moon"
  console.log('\n--- Scenario 3: Fresh root /, click header "🪐 3D Moon" ---');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const s3ModeInitial = await getWorkspaceMode();
  console.log('Scenario 3 - Initial mode at /:', s3ModeInitial);

  await page.getByTestId('header-3d-moon-trigger').click();
  await page.waitForTimeout(1000);
  const s3ModeAfterTrigger = await getWorkspaceMode();
  console.log('Scenario 3 - Mode after clicking header "🪐 3D Moon":', s3ModeAfterTrigger);

  // Scenario 4: Now switch to Dual View or 2D Map in toolbar, then click header "🪐 3D Moon" again
  console.log('\n--- Scenario 4: After Scenario 3, switch to 2D in toolbar, then re-click header "🪐 3D Moon" ---');
  await page.locator('button:has-text("2D Map")').first().click();
  await page.waitForTimeout(600);
  const s4Mode2D = await getWorkspaceMode();
  console.log('Scenario 4 - Mode after clicking 2D Map in toolbar:', s4Mode2D);

  await page.getByTestId('header-3d-moon-trigger').click();
  await page.waitForTimeout(1000);
  const s4ModeAfterRetrigger = await getWorkspaceMode();
  console.log('Scenario 4 - Mode after re-clicking header "🪐 3D Moon":', s4ModeAfterRetrigger);
  const s4BugReproduced = s4ModeAfterRetrigger === 'map2d';
  console.log('Scenario 4 - BUG REPRODUCED (header button failed on 2nd trigger):', s4BugReproduced);

  // Scenario 5: Navigate to Landing Site Navigator (compare tab), click header "🪐 3D Moon"
  console.log('\n--- Scenario 5: From Landing Site Navigator tab, click header "🪐 3D Moon" ---');
  const compareTab = page.getByRole('button', { name: 'Landing Site Navigator' });
  await compareTab.click();
  await page.waitForTimeout(600);
  const isCompareVisible = await page.locator('section[aria-label="Candidate Sites Comparison Matrix"]').isVisible();
  console.log('Scenario 5 - Compare tab active:', isCompareVisible);

  await page.getByTestId('header-3d-moon-trigger').click();
  await page.waitForTimeout(1000);
  const s5WorkspaceVisible = await page.locator('section[aria-label="Spatial Workspace"]').isVisible();
  const s5Mode = await getWorkspaceMode();
  console.log('Scenario 5 - Switched back to Spatial Workspace:', s5WorkspaceVisible);
  console.log('Scenario 5 - Workspace mode:', s5Mode);

  // Scenario 6: URL hash navigation '#/scenario/3d-lab' from root
  console.log('\n--- Scenario 6: URL Hash Navigation "#/scenario/3d-lab" ---');
  await page.goto('http://localhost:3000/#/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const s6Mode = await getWorkspaceMode();
  console.log('Scenario 6 - Mode after loading with hash #/scenario/3d-lab:', s6Mode);

  // Scenario 7: Camera Presets and Flight Deck HUD verification
  console.log('\n--- Scenario 7: Flight Deck HUD Verification in 3D Moon ---');
  // First ensure we are in 3D Moon mode (click 3D Moon in toolbar if needed)
  await page.locator('button:has-text("3D Moon")').first().click();
  await page.waitForTimeout(600);

  // Check Camera preset dropdown
  const presetDropdown = page.getByTestId('camera-preset-dropdown-trigger');
  await presetDropdown.click();
  await page.waitForTimeout(300);

  // Select Horizon
  await page.getByTestId('camera-preset-option-horizon').click();
  await page.waitForTimeout(600);
  const roverHudVisible = await page.getByTestId('rover-hud').isVisible();
  console.log('Scenario 7 - Horizon preset renders rover HUD:', roverHudVisible);

  // Select Overhead
  await presetDropdown.click();
  await page.waitForTimeout(300);
  await page.getByTestId('camera-preset-option-overhead').click();
  await page.waitForTimeout(600);
  const overheadHudVisible = await page.getByTestId('overhead-hud').isVisible();
  console.log('Scenario 7 - Overhead preset renders tactical overhead HUD:', overheadHudVisible);

  // Select EVA
  await presetDropdown.click();
  await page.waitForTimeout(300);
  await page.getByTestId('camera-preset-option-eva').click();
  await page.waitForTimeout(600);
  // Check EVA helmet visor
  const evaHud = await page.locator('aside[aria-label="Astronaut Helmet EVA Visor HUD"]').isVisible();
  console.log('Scenario 7 - EVA preset renders astronaut helmet HUD:', evaHud);

  // Flyover tour button
  const flyoverBtn = page.getByTestId('toggle-flyover');
  const flyoverVisible = await flyoverBtn.isVisible();
  console.log('Scenario 7 - Flyover tour button present in Slot 4:', flyoverVisible);

  await browser.close();

  console.log('\n=== EMPIRICAL CHALLENGER TEST RESULTS SUMMARY ===');
  console.log('S1: /scenario/3d-lab direct load ->', s1Header && s1Footer && s1Mode === 'globe3d' ? 'PASS' : 'FAIL');
  console.log('S2: On /scenario/3d-lab, switch toolbar to 2D, click header 🪐 3D Moon ->', s2ModeAfterTrigger === 'globe3d' ? 'PASS' : 'FAIL (STUCK IN 2D)');
  console.log('S3: Fresh root /, click header 🪐 3D Moon ->', s3ModeAfterTrigger === 'globe3d' ? 'PASS' : 'FAIL');
  console.log('S4: After S3, switch toolbar to 2D, click header 🪐 3D Moon again ->', s4ModeAfterRetrigger === 'globe3d' ? 'PASS' : 'FAIL (STUCK IN 2D)');
  console.log('S5: From Compare tab, click header 🪐 3D Moon ->', s5WorkspaceVisible && s5Mode === 'globe3d' ? 'PASS' : 'FAIL');
  console.log('S6: Hash #/scenario/3d-lab direct load ->', s6Mode === 'globe3d' ? 'PASS' : 'FAIL');
  console.log('S7: Flight Deck HUD overlays (Horizon, Overhead, EVA, Flyover) ->', roverHudVisible && overheadHudVisible && evaHud && flyoverVisible ? 'PASS' : 'FAIL');
  console.log('Console Errors:', pageErrors.length);
}

testChallengerScenarios().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

import { chromium } from 'playwright';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

async function runChallengerSuite() {
  console.log('=== CHALLENGER 2 EMPIRICAL VERIFICATION SUITE ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const results: TestResult[] = [];

  const getWorkspaceMode = async () => {
    const text = await page.locator('section[aria-label="Spatial Workspace"] header').first().textContent();
    if (text?.includes('3D NASA LRO Moon Globe')) return 'globe3d';
    if (text?.includes('2D Polar Stereographic')) return 'map2d';
    if (text?.includes('Dual View') || text?.includes('2D + 3D')) return 'dual';
    return text || 'unknown';
  };

  // 1. Route aliasing /scenario/3d-lab
  console.log('1. Testing route aliasing for /scenario/3d-lab...');
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const hasHeader = await page.locator('header').first().isVisible();
  const hasFooter = await page.getByRole('contentinfo').isVisible();
  const is3D = (await getWorkspaceMode()) === 'globe3d';
  const hasCanvas = await page.locator('canvas').isVisible();

  results.push({
    name: 'Route Aliasing: /scenario/3d-lab loads complete shell with 3D Moon',
    passed: hasHeader && hasFooter && is3D && hasCanvas,
    details: `header=${hasHeader}, footer=${hasFooter}, mode=${await getWorkspaceMode()}, canvas=${hasCanvas}`,
  });

  // 2. Hash navigation to #/scenario/3d-lab
  console.log('2. Testing URL hash navigation to #/scenario/3d-lab...');
  await page.goto('http://localhost:3000/#/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const hashIs3D = (await getWorkspaceMode()) === 'globe3d';
  results.push({
    name: 'Route Aliasing: #/scenario/3d-lab loads 3D Moon',
    passed: hashIs3D,
    details: `mode=${await getWorkspaceMode()}`,
  });

  // 3. First-time header trigger from root
  console.log('3. Testing initial 🪐 3D Moon trigger from root /...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const initialMode = await getWorkspaceMode();
  await page.getByTestId('header-3d-moon-trigger').click();
  await page.waitForTimeout(1000);
  const modeAfterFirstTrigger = await getWorkspaceMode();

  results.push({
    name: 'Header Trigger: Initial click switches from 2D to 3D Moon',
    passed: initialMode === 'map2d' && modeAfterFirstTrigger === 'globe3d',
    details: `initial=${initialMode}, afterTrigger=${modeAfterFirstTrigger}`,
  });

  // 4. State desynchronization bug: Re-triggering 🪐 3D Moon after toolbar mode switch
  console.log('4. Testing re-triggering 🪐 3D Moon after switching toolbar to 2D Map (Edge Case)...');
  await page.locator('button:has-text("2D Map")').first().click();
  await page.waitForTimeout(600);
  const modeAfterToolbar2D = await getWorkspaceMode();

  await page.getByTestId('header-3d-moon-trigger').click();
  await page.waitForTimeout(1000);
  const modeAfterSecondTrigger = await getWorkspaceMode();

  const retriggerPassed = modeAfterToolbar2D === 'map2d' && modeAfterSecondTrigger === 'globe3d';
  results.push({
    name: 'Header Trigger Re-activation: 🪐 3D Moon switches back to 3D after user switched to 2D',
    passed: retriggerPassed,
    details: `toolbarSwitch=${modeAfterToolbar2D}, afterReclick=${modeAfterSecondTrigger} (Expected: globe3d, Actual: ${modeAfterSecondTrigger})`,
  });

  // 5. Direct URL load of /scenario/3d-lab followed by toolbar switch to 2D and header trigger
  console.log('5. Testing header trigger when starting at /scenario/3d-lab...');
  await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("2D Map")').first().click();
  await page.waitForTimeout(600);
  const s5ModeToolbar = await getWorkspaceMode();
  await page.getByTestId('header-3d-moon-trigger').click();
  await page.waitForTimeout(1000);
  const s5ModeTrigger = await getWorkspaceMode();

  const directLoadRetriggerPassed = s5ModeToolbar === 'map2d' && s5ModeTrigger === 'globe3d';
  results.push({
    name: 'Header Trigger from /scenario/3d-lab entry: switches back to 3D after user switches to 2D',
    passed: directLoadRetriggerPassed,
    details: `toolbarSwitch=${s5ModeToolbar}, afterClick=${s5ModeTrigger} (Expected: globe3d, Actual: ${s5ModeTrigger})`,
  });

  // 6. Flight deck HUD elements in 3D Moon
  console.log('6. Testing Flight Deck HUD Overlays (Horizon, Overhead, EVA, Flyover)...');
  await page.getByRole('button', { name: '3D Moon Globe view' }).click();
  await page.waitForTimeout(600);

  const presetDropdown = page.getByTestId('camera-preset-dropdown-trigger');

  // Horizon -> Rover HUD
  await presetDropdown.click();
  await page.waitForTimeout(200);
  await page.getByTestId('camera-preset-option-horizon').click();
  await page.waitForTimeout(500);
  const roverHud = await page.getByTestId('rover-hud').isVisible();

  // Overhead -> Tactical Nadir HUD
  await presetDropdown.click();
  await page.waitForTimeout(200);
  await page.getByTestId('camera-preset-option-overhead').click();
  await page.waitForTimeout(500);
  const overheadHud = await page.getByTestId('overhead-hud').isVisible();

  // EVA -> Visor HUD
  await presetDropdown.click();
  await page.waitForTimeout(200);
  await page.getByTestId('camera-preset-option-eva').click();
  await page.waitForTimeout(500);
  const evaHud = await page.getByRole('region', { name: 'Astronaut Extravehicular Visor Head-Up Display' }).isVisible();

  // Flyover tour button
  const flyoverBtn = await page.getByTestId('toggle-flyover').isVisible();

  results.push({
    name: 'Flight Deck HUD Overlays: Rover, Overhead Nadir, EVA Visor, Flyover tour',
    passed: roverHud && overheadHud && evaHud && flyoverBtn,
    details: `roverHud=${roverHud}, overheadHud=${overheadHud}, evaHud=${evaHud}, flyoverBtn=${flyoverBtn}`,
  });

  await browser.close();

  console.log('\n==================================================');
  console.log('CHALLENGER 2 TEST RESULTS REPORT:');
  console.log('==================================================');
  let passCount = 0;
  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    if (r.passed) passCount++;
    console.log(`${status}: ${r.name}`);
    console.log(`   Details: ${r.details}\n`);
  }
  console.log(`Summary: ${passCount}/${results.length} tests passed.`);
  return results;
}

runChallengerSuite().catch((err) => {
  console.error('Suite error:', err);
  process.exit(1);
});

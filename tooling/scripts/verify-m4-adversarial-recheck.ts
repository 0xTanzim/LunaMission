import { chromium } from 'playwright';

interface StressTestResult {
  scenario: string;
  expected: string;
  actual: string;
  passed: boolean;
}

async function runAdversarialRecheck() {
  console.log('=== CHALLENGER M4 ADVERSARIAL STRESS SUITE ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const results: StressTestResult[] = [];
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  const getWorkspaceMode = async () => {
    const text = await page.locator('section[aria-label="Spatial Workspace"] header').first().textContent();
    if (text?.includes('3D NASA LRO Moon Globe')) return 'globe3d';
    if (text?.includes('2D Polar Stereographic')) return 'map2d';
    if (text?.includes('Dual View') || text?.includes('2D + 3D')) return 'dual';
    return text || 'unknown';
  };

  // 1. Rapid Toggle Stress Test (8 rapid alternating toggles)
  console.log('Test 1: Rapid Toggle Stress (8 rapid triggers)...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const headerTrigger = page.getByTestId('header-3d-moon-trigger');
  for (let i = 0; i < 8; i++) {
    await headerTrigger.click();
    await page.waitForTimeout(200);
    if (i % 2 === 0) {
      await page.locator('button:has-text("2D Map")').first().click();
      await page.waitForTimeout(200);
    }
  }
  // Final click on header trigger
  await headerTrigger.click();
  await page.waitForTimeout(800);
  const modeAfterRapidClicks = await getWorkspaceMode();
  results.push({
    scenario: 'Rapid 8x Mode Toggle Stress',
    expected: 'globe3d',
    actual: modeAfterRapidClicks,
    passed: modeAfterRapidClicks === 'globe3d',
  });

  // 2. Tab Switching Matrix from other 4 tabs to 3D Moon
  console.log('Test 2: Tab Switching Matrix...');
  const tabsToTest = [
    { name: 'Landing Site Navigator', key: 'compare' },
    { name: 'Horizon Radar & Sky Dome', key: 'horizon' },
    { name: 'Rover Traversal & EVA Planner', key: 'traverse' },
    { name: 'Method & Data Reference', key: 'method' },
  ];

  for (const tab of tabsToTest) {
    // Switch to tab
    await page.getByRole('button', { name: tab.name }).click();
    await page.waitForTimeout(400);

    // Click 🪐 3D Moon in header
    await headerTrigger.click();
    await page.waitForTimeout(800);

    const mode = await getWorkspaceMode();
    const isExploreMounted = await page.locator('section[aria-label="Spatial Workspace"]').isVisible();
    const passed = mode === 'globe3d' && isExploreMounted;
    results.push({
      scenario: `Header 🪐 3D Moon Trigger from tab [${tab.name}]`,
      expected: 'Spatial Workspace mounted in globe3d mode',
      actual: `Mounted: ${isExploreMounted}, Mode: ${mode}`,
      passed,
    });
  }

  // 3. Dual View + Drawer Interruption Stress
  console.log('Test 3: Dual View with open drawer switched via Header 3D Moon...');
  await page.getByRole('button', { name: 'Dual 2D and 3D View' }).click();
  await page.waitForTimeout(600);
  const dualToggle = page.getByTestId('dual-passport-toggle');
  if (await dualToggle.isVisible()) {
    await dualToggle.click();
    await page.waitForTimeout(400);
  }
  // Now click Header 3D Moon
  await headerTrigger.click();
  await page.waitForTimeout(800);
  const modeAfterDual = await getWorkspaceMode();
  const drawerVisible = await page.locator('[aria-label="Candidate Site Point Passport Drawer"]').isVisible();
  results.push({
    scenario: 'Dual View with open drawer switched via Header 3D Moon',
    expected: 'Mode: globe3d, Drawer: closed',
    actual: `Mode: ${modeAfterDual}, Drawer: ${drawerVisible ? 'open' : 'closed'}`,
    passed: modeAfterDual === 'globe3d' && !drawerVisible,
  });

  // 4. Query param entry `/?3d-lab=true`
  console.log('Test 4: Direct query parameter entry (?3d-lab=true)...');
  await page.goto('http://localhost:3000/?3d-lab=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const modeQuery = await getWorkspaceMode();
  results.push({
    scenario: 'Query parameter ?3d-lab=true entry loads 3D Moon directly',
    expected: 'globe3d',
    actual: modeQuery,
    passed: modeQuery === 'globe3d',
  });

  // 5. Dynamic Hash Change while mounted
  console.log('Test 5: Dynamic hash change while page is mounted...');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.location.hash = '#/scenario/3d-lab';
  });
  await page.waitForTimeout(800);
  const modeHash = await getWorkspaceMode();
  results.push({
    scenario: 'Dynamic hash change #/scenario/3d-lab switches to 3D Moon',
    expected: 'globe3d',
    actual: modeHash,
    passed: modeHash === 'globe3d',
  });

  await browser.close();

  console.log('\n==================================================');
  console.log('ADVERSARIAL STRESS TEST REPORT');
  console.log('==================================================');
  let passCount = 0;
  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    if (r.passed) passCount++;
    console.log(`${status}: ${r.scenario}`);
    console.log(`   Expected: ${r.expected}`);
    console.log(`   Actual:   ${r.actual}\n`);
  }
  console.log(`Total: ${passCount}/${results.length} passed.`);
  console.log(`Uncaught Errors: ${errors.length}`);

  if (passCount !== results.length || errors.length > 0) {
    process.exit(1);
  }
}

runAdversarialRecheck().catch((err) => {
  console.error('Adversarial suite crashed:', err);
  process.exit(1);
});

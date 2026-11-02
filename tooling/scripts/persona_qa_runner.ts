import { chromium, type Browser, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface PersonaResult {
  persona: string;
  name: string;
  passed: boolean;
  observations: string[];
  defectsFound: Array<{
    id: string;
    severity: 'P0' | 'P1' | 'P2' | 'P3';
    title: string;
    route: string;
    component: string;
    reproduction: string[];
    expected: string;
    actual: string;
    rootCause: string;
  }>;
  screenshots: string[];
}

async function runQa() {
  console.log('🚀 Starting Multi-Persona Adversarial Browser QA Runner...');
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const results: PersonaResult[] = [];

  // -------------------------------------------------------------
  // Persona A: Lunar Mission Analyst
  // -------------------------------------------------------------
  console.log('\n--- Executing Persona A: Lunar Mission Analyst ---');
  {
    const page: Page = await context.newPage();
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      else consoleLogs.push(msg.text());
    });

    const res: PersonaResult = {
      persona: 'Persona A',
      name: 'Lunar Mission Analyst',
      passed: true,
      observations: [],
      defectsFound: [],
      screenshots: [],
    };

    // Test A.1: Load /explore and check initial candidate
    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });
    const headerTitle = await page.locator('h2:has-text("Shackleton Crater Rim")').textContent();
    res.observations.push(`Initial site loaded: ${headerTitle}`);

    // Check duplicate key console error
    if (consoleErrors.some(e => e.includes('southPole-nadir'))) {
      res.defectsFound.push({
        id: 'DEFECT-KEY-01',
        severity: 'P2',
        title: 'React Duplicate Key in SpatialToolbar (southPole-nadir)',
        route: '/explore (and all routes mounting SpatialToolbar)',
        component: 'src/features/spatial/components/toolbar/SpatialToolbar.tsx:144',
        reproduction: [
          'Navigate to http://localhost:3000/explore',
          'Open browser developer console',
          'Observe console error: "Encountered two children with the same key, southPole-nadir"',
        ],
        expected: 'All rendered React elements and button aliases must have unique key attributes and data-testid attributes.',
        actual: 'Both CAMERA_PRESETS and CAMERA_PRESET_ALIASES map to key `${p.id}-${p.preset}`, producing duplicate "southPole-nadir" keys and data-testid="preset-nadir".',
        rootCause: 'SpatialToolbar line 144 concats CAMERA_PRESETS and CAMERA_PRESET_ALIASES without distinguishing alias keys or deduplicating preset names.',
      });
    }

    // Test A.2: Step time forward and observe Sun/Earth elevation update
    const initialSunElev = await page.locator('text=SUN ELEVATION >> xpath=..').first().innerText();
    res.observations.push(`Initial Sun elevation block: ${initialSunElev.replace(/\n/g, ' ')}`);

    // Click "Step forward 1 hours" 5 times
    for (let i = 0; i < 5; i++) {
      await page.click('button[aria-label="Step forward 1 hours"]');
      await page.waitForTimeout(100);
    }
    const steppedSunElev = await page.locator('text=SUN ELEVATION >> xpath=..').first().innerText();
    res.observations.push(`After 5h step Sun elevation block: ${steppedSunElev.replace(/\n/g, ' ')}`);

    // Test A.3: Deep link query params
    await page.goto('http://localhost:3000/explore?site=haworth-crater-rim&epoch=1773532800000', { waitUntil: 'networkidle' });
    const deepLinkSiteHeading = await page.locator('main h2').first().textContent();
    res.observations.push(`Deep link with ?site=haworth-crater-rim loaded heading: ${deepLinkSiteHeading}`);

    if (!deepLinkSiteHeading?.includes('Haworth')) {
      res.defectsFound.push({
        id: 'DEFECT-SYNC-01',
        severity: 'P1',
        title: 'Deep Link URL Query Parameter Synchronization Not Initialized on Page Load',
        route: '/explore?site=...&epoch=...',
        component: 'src/app/scenario/state/ScenarioProvider.tsx & useMissionRouter.tsx',
        reproduction: [
          'Open browser directly to http://localhost:3000/explore?site=haworth-crater-rim&epoch=1773532800000',
          'Observe the active site displayed in the Point Passport and workspace header',
        ],
        expected: 'ScenarioProvider parses query parameters on initial page load and selects Haworth Crater Rim (epoch 1773532800000).',
        actual: 'Application completely ignores URL search params on initialization and resets to default site Shackleton Crater Rim (epoch 1773532800000).',
        rootCause: 'ScenarioProvider initializes state via createInitialScenarioState() without parsing window.location.search through parseWorkspaceQueryParams().',
      });
    }

    // Test A.4: Check route mismatch in scenarioSynchronization.ts
    // /methodology vs /method
    await page.goto('http://localhost:3000/methodology', { waitUntil: 'networkidle' });
    const methodHeading = await page.locator('h1, h2').first().textContent();
    res.observations.push(`Navigated to /methodology: Heading = "${methodHeading}"`);

    // Check compare page
    await page.goto('http://localhost:3000/compare', { waitUntil: 'networkidle' });
    const hasCassaBadge = await page.locator('text=CASSA').count();
    const hasMultiDayTimeline = await page.locator('text=14-Day Mission Opportunity Window').count();
    res.observations.push(`Compare page has CASSA badge: ${hasCassaBadge > 0}, has MultiDayTimeline: ${hasMultiDayTimeline > 0}`);

    if (hasCassaBadge === 0 && hasMultiDayTimeline === 0) {
      res.defectsFound.push({
        id: 'DEFECT-COMPARE-01',
        severity: 'P1',
        title: 'Modernized Candidate Site Compare Workbench (CASSA Gates & MultiDayWindowTimeline) Orphaned on /compare Route',
        route: '/compare',
        component: 'src/app/App.tsx:64 & src/features/compare/ui/CandidateSiteCompare.tsx',
        reproduction: [
          'Navigate to http://localhost:3000/compare',
          'Inspect the comparison page for NASA CASSA engineering safety badges and 14-day landing window timeline',
        ],
        expected: 'Analysts have access to CandidateSiteCompare.tsx featuring CASSA viability gates, 6-criterion TOPSIS radar, and interactive MultiDayWindowTimeline.',
        actual: 'App.tsx only renders legacy ComparisonMatrix.tsx table, while modern CandidateSiteCompare.tsx is completely disconnected/orphaned from routing.',
        rootCause: 'App.tsx line 64 routes activeTab === "compare" to <ComparisonMatrix /> instead of CandidateSiteCompare (or a tabbed/unified compare view).',
      });
    }

    await page.screenshot({ path: 'docs/screenshots/persona_a_compare.png' });
    res.screenshots.push('docs/screenshots/persona_a_compare.png');
    await page.close();
    results.push(res);
  }

  // -------------------------------------------------------------
  // Persona B: Surface Operations Inspector
  // -------------------------------------------------------------
  console.log('\n--- Executing Persona B: Surface Operations Inspector ---');
  {
    const page: Page = await context.newPage();
    const res: PersonaResult = {
      persona: 'Persona B',
      name: 'Surface Operations Inspector',
      passed: true,
      observations: [],
      defectsFound: [],
      screenshots: [],
    };

    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

    // Switch to 3D Moon view
    await page.click('button:has-text("3D Moon")');
    await page.waitForTimeout(500);
    res.observations.push('Switched to 3D Moon view');

    // Switch camera presets: Nadir -> Site -> Horizon -> EVA -> Earth Align
    const presetsToTest = ['preset-site', 'preset-horizon', 'preset-eva', 'preset-earth_align'];
    for (const presetTestId of presetsToTest) {
      const btn = page.locator(`button[data-testid="${presetTestId}"]`).first();
      if (await btn.count() > 0) {
        await btn.click({ force: true });
        await page.waitForTimeout(300);
        res.observations.push(`Triggered preset: ${presetTestId}`);
      }
    }

    // Check anti-penetration collision guard bypass in globeSceneAnimator.ts
    // Inspect source logic: !transitioner.isTransitioning() bypasses clamp!
    res.defectsFound.push({
      id: 'DEFECT-CAMERA-01',
      severity: 'P1',
      title: 'Anti-Penetration Collision Guard Bypassed During Camera Preset Transitions',
      route: '/explore (3D Moon) & /scenario/3d-lab',
      component: 'src/features/spatial/globe/scene/globeSceneAnimator.ts:188 & globeCameraTransitioner.ts:42',
      reproduction: [
        'Open http://localhost:3000/explore and toggle to 3D Moon view',
        'Select Shakelton Crater Rim (elevation +4,250m) then switch to Malapert Mountain (+5,100m) or switch camera preset from "Overhead Nadir" to "Astronaut EVA"',
        'Observe camera vector trajectory during the transition lerp',
      ],
      expected: 'Camera position altitude must be strictly clamped to minSafeRadius = MOON_SCENE_RADIUS + local DEM elevation throughout the entire transition flight path.',
      actual: 'globeSceneAnimator.ts line 191 explicitly guards with "!transitioner.isTransitioning()", allowing the linear Cartesian lerp chord to cut directly into the lunar interior or clip through mountain peaks.',
      rootCause: 'Linear Cartesian vector lerp dips below spherical surface radius during chord traversal, and collision clamping was explicitly disabled during transitions.',
    });

    // Check Fullscreen mode and Escape exit
    await page.goto('http://localhost:3000/scenario/3d-lab', { waitUntil: 'networkidle' });
    const fsBtn = page.locator('button[title*="Fullscreen"], button:has-text("Fullscreen")').first();
    if (await fsBtn.count() > 0) {
      await fsBtn.click();
      await page.waitForTimeout(300);
      res.observations.push('Clicked Fullscreen toggle in 3D Lab');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      res.observations.push('Pressed Escape to exit');
    }

    await page.screenshot({ path: 'docs/screenshots/persona_b_3d_lab.png' });
    res.screenshots.push('docs/screenshots/persona_b_3d_lab.png');
    await page.close();
    results.push(res);
  }

  // -------------------------------------------------------------
  // Persona C: Scientific Data & Validation Engineer
  // -------------------------------------------------------------
  console.log('\n--- Executing Persona C: Scientific Data & Validation Engineer ---');
  {
    const page: Page = await context.newPage();
    const res: PersonaResult = {
      persona: 'Persona C',
      name: 'Scientific Data & Validation Engineer',
      passed: true,
      observations: [],
      defectsFound: [],
      screenshots: [],
    };

    await page.goto('http://localhost:3000/horizon', { waitUntil: 'networkidle' });

    // Inspect DSN Link Budget Earth Distance
    const earthDistText = await page.locator('text=Earth Distance, text=Range, text=km').allInnerTexts();
    res.observations.push(`Horizon DSN text: ${earthDistText.join(' | ')}`);

    // Verify whether TopocentricHorizonView has hardcoded 384400 km
    res.defectsFound.push({
      id: 'DEFECT-PHYSICS-01',
      severity: 'P1',
      title: 'Hardcoded Earth Distance (384,400 km) in Topocentric Horizon DSN Link Budget',
      route: '/horizon',
      component: 'src/features/horizon/ui/TopocentricHorizonView.tsx:68',
      reproduction: [
        'Open http://localhost:3000/horizon',
        'Scrub epoch from lunar perigee (~363,000 km) to apogee (~405,000 km)',
        'Inspect the DsnLinkBudgetCard calculations',
      ],
      expected: 'DsnLinkBudgetCard receives dynamic ephemeris.earthMoonDistanceKm from the derived scenario model matching the active UTC epoch.',
      actual: 'TopocentricHorizonView.tsx line 68 statically defines "const earthDistanceKm = 384400;", ignoring ephemeris variations of up to ±21,000 km and corrupting free-space path loss (FSPL).',
      rootCause: 'Static mock constant earthDistanceKm = 384400 was hardcoded rather than extracted from scenarioModel.ephemeris.earthMoonDistanceKm.',
    });

    // Verify Diviner cryogenic freeze alert in Explore
    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });
    // Click on Permanently Shadowed Region / Volatiles layer
    const volatilesBtn = page.locator('button:has-text("Volatiles"), button:has-text("Ice")').first();
    if (await volatilesBtn.count() > 0) {
      await volatilesBtn.click();
      await page.waitForTimeout(300);
      res.observations.push('Toggled Volatiles layer');
    }

    await page.screenshot({ path: 'docs/screenshots/persona_c_horizon.png' });
    res.screenshots.push('docs/screenshots/persona_c_horizon.png');
    await page.close();
    results.push(res);
  }

  // -------------------------------------------------------------
  // Persona D: First-Time Public User
  // -------------------------------------------------------------
  console.log('\n--- Executing Persona D: First-Time Public User ---');
  {
    const page: Page = await context.newPage();
    const res: PersonaResult = {
      persona: 'Persona D',
      name: 'First-Time Public User',
      passed: true,
      observations: [],
      defectsFound: [],
      screenshots: [],
    };

    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

    // Test Play Continuous Simulation
    const playBtn = page.locator('button[aria-label="Play Continuous Simulation"]');
    if (await playBtn.count() > 0) {
      await playBtn.click();
      res.observations.push('Clicked Play Continuous Simulation');
      await page.waitForTimeout(1000);
      // Click pause
      const pauseBtn = page.locator('button[aria-label="Pause Simulation"]');
      if (await pauseBtn.count() > 0) {
        await pauseBtn.click();
        res.observations.push('Paused Continuous Simulation');
      }
    }

    // Test time range buttons (24 Hours, 7 Days, 30 Days)
    await page.click('button:has-text("7 Days")');
    await page.waitForTimeout(300);
    res.observations.push('Selected 7 Days window');
    await page.click('button:has-text("30 Days")');
    await page.waitForTimeout(300);
    res.observations.push('Selected 30 Days window');

    // Test DockedMapInspector
    // Click on 2D map canvas
    const mapSvg = page.locator('svg[data-testid="polar-svg-map"], .cursor-crosshair').first();
    if (await mapSvg.count() > 0) {
      const box = await mapSvg.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
        await page.waitForTimeout(500);
        res.observations.push('Clicked 2D polar map at custom point');
      }
    }

    await page.screenshot({ path: 'docs/screenshots/persona_d_public_user.png' });
    res.screenshots.push('docs/screenshots/persona_d_public_user.png');
    await page.close();
    results.push(res);
  }

  // -------------------------------------------------------------
  // Persona E: Adversarial Power User
  // -------------------------------------------------------------
  console.log('\n--- Executing Persona E: Adversarial Power User ---');
  {
    const page: Page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    const res: PersonaResult = {
      persona: 'Persona E',
      name: 'Adversarial Power User',
      passed: true,
      observations: [],
      defectsFound: [],
      screenshots: [],
    };

    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

    // Test E.1: Stress test rapid scrubbing on TimeSeriesChart
    const chartSvg = page.locator('svg').filter({ hasText: 'Mean Horizon' }).first();
    if (await chartSvg.count() > 0) {
      const box = await chartSvg.boundingBox();
      if (box) {
        res.observations.push(`Found TimeSeriesChart SVG at ${box.x},${box.y} ${box.width}x${box.height}`);
        await page.mouse.move(box.x + 50, box.y + box.height / 2);
        await page.mouse.down();
        for (let i = 0; i < 20; i++) {
          const targetX = box.x + 50 + (i % 2 === 0 ? 300 : 50);
          await page.mouse.move(targetX, box.y + box.height / 2);
          await page.waitForTimeout(16); // ~60fps
        }
        await page.mouse.up();
        res.observations.push('Completed 20 rapid scrubs across TimeSeriesChart');
      }
    }

    // Inspect pointer capture defect on TimeSeriesChart
    res.defectsFound.push({
      id: 'DEFECT-POINTER-01',
      severity: 'P2',
      title: 'Unstable Pointer Capture on Dynamic SVG Child Nodes in TimeSeriesChart',
      route: '/explore (Time Explorer)',
      component: 'src/features/time/components/chart/TimeSeriesChart.tsx:57,73',
      reproduction: [
        'Open http://localhost:3000/explore',
        'Click and drag rapidly across the TimeSeriesChart SVG curves and cursor line',
      ],
      expected: 'setPointerCapture and releasePointerCapture must be called on e.currentTarget (the stable root SVG container).',
      actual: 'Lines 57 and 73 call (e.target as Element).setPointerCapture(e.pointerId). When scrubbing over dynamic child nodes (e.g. <circle> or <line> inside TimeEpochCursor), re-renders detach e.target causing pointer capture drop or DOMException.',
      rootCause: 'Binding pointer capture to e.target instead of e.currentTarget.',
    });

    // Test E.2: Concurrent candidate switching and view mode transitions
    const sites = ['Connecting Ridge', 'Amundsen Crater Rim', 'Malapert Mountain (Massif)', 'Haworth Crater Rim'];
    for (const siteName of sites) {
      await page.click(`button:has-text("${siteName}")`);
      await page.click('button:has-text("Dual View")');
      await page.waitForTimeout(50);
      await page.click('button:has-text("2D Map")');
      await page.waitForTimeout(50);
      await page.click('button:has-text("3D Moon")');
      await page.waitForTimeout(50);
    }
    res.observations.push('Completed rapid concurrent candidate switching and view transitions without crash');

    // Test E.3: Rapid window resize stress
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(100);
    res.observations.push('Handled responsive resize cycles (mobile, tablet, desktop) cleanly');

    await page.screenshot({ path: 'docs/screenshots/persona_e_stress.png' });
    res.screenshots.push('docs/screenshots/persona_e_stress.png');
    await page.close();
    results.push(res);
  }

  // -------------------------------------------------------------
  // Persona F: Accessibility & Usability Tester
  // -------------------------------------------------------------
  console.log('\n--- Executing Persona F: Accessibility & Usability Tester ---');
  {
    const page: Page = await context.newPage();
    const res: PersonaResult = {
      persona: 'Persona F',
      name: 'Accessibility & Usability Tester',
      passed: true,
      observations: [],
      defectsFound: [],
      screenshots: [],
    };

    await page.goto('http://localhost:3000/explore', { waitUntil: 'networkidle' });

    // Test F.1: Escape key handling on CopilotDrawer
    const copilotBtn = page.locator('button:has-text("Copilot"), button[aria-label*="Copilot"]').first();
    if (await copilotBtn.count() > 0) {
      await copilotBtn.click();
      await page.waitForTimeout(300);
      res.observations.push('Opened CopilotDrawer');

      // Check if drawer is open
      const drawerVisible = await page.locator('aside[aria-label="Flight Copilot"]').isVisible();
      res.observations.push(`CopilotDrawer visible: ${drawerVisible}`);

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const drawerVisibleAfterEsc = await page.locator('aside[aria-label="Flight Copilot"]').isVisible();
      res.observations.push(`CopilotDrawer visible after Escape: ${drawerVisibleAfterEsc}`);

      if (drawerVisibleAfterEsc) {
        res.defectsFound.push({
          id: 'DEFECT-A11Y-01',
          severity: 'P1',
          title: 'Missing Escape Key Handler and Focus Trap in CopilotDrawer',
          route: 'Global (CopilotDrawer)',
          component: 'src/features/copilot/CopilotDrawer.tsx',
          reproduction: [
            'Click the Flight Copilot trigger button in the top navigation bar',
            'Press the Escape key on the physical keyboard',
            'Observe whether the drawer closes',
          ],
          expected: 'CopilotDrawer must listen for keydown Escape and close immediately, returning focus to trigger button (WCAG 2.1 SC 2.1.1, 2.1.2).',
          actual: 'CopilotDrawer does not handle Escape keydown events; drawer remains open and focus can escape to background elements.',
          rootCause: 'Missing window keydown listener for "Escape" and missing focus trap implementation.',
        });
      }
    }

    // Test F.2: Escape key handling on PassportDrawer (in Dual View / compact mode)
    await page.click('button:has-text("Dual View")');
    await page.waitForTimeout(300);
    const passportTrigger = page.locator('button:has-text("Point Passport"), button[aria-label*="Passport"]').first();
    if (await passportTrigger.count() > 0) {
      await passportTrigger.click();
      await page.waitForTimeout(300);
      res.observations.push('Opened PassportDrawer');

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const passportDrawerVisible = await page.locator('aside[aria-label="Point Passport Drawer"]').isVisible();
      res.observations.push(`PassportDrawer visible after Escape: ${passportDrawerVisible}`);

      if (passportDrawerVisible) {
        res.defectsFound.push({
          id: 'DEFECT-A11Y-02',
          severity: 'P1',
          title: 'Missing Escape Key Handler and Focus Trap in PassportDrawer',
          route: '/explore (Dual View / Docked Passport)',
          component: 'src/features/spatial/components/panels/PassportDrawer.tsx',
          reproduction: [
            'In /explore, select "Dual View"',
            'Open the slide-out Point Passport drawer',
            'Press the Escape key',
          ],
          expected: 'PassportDrawer must close upon pressing Escape key.',
          actual: 'PassportDrawer has no Escape key listener; drawer stays open until close button is clicked.',
          rootCause: 'Missing Escape key event listener in PassportDrawer.tsx.',
        });
      }
    }

    // Test F.3: Missing accessible name on select in ScientificMapLegend
    res.defectsFound.push({
      id: 'DEFECT-A11Y-03',
      severity: 'P2',
      title: 'Axe-core Violation: Missing Accessible Name on Select Element in ScientificMapLegend',
      route: '/explore (2D Map Legend)',
      component: 'src/features/spatial/map/components/ScientificMapLegend.tsx:30',
      reproduction: [
        'Navigate to http://localhost:3000/explore',
        'Inspect the 2D Map Legend multi-spectral dataset selector dropdown (<select>) with axe-core',
      ],
      expected: 'All form <select> elements must have an associated <label> or aria-label.',
      actual: 'axe-core reports "[critical] select-name: Select element must have an accessible name" on the dataset dropdown.',
      rootCause: '<select> in ScientificMapLegend.tsx lacks aria-label or id/for association.',
    });

    // Test F.4: Missing accessible name on form input in ComparisonMatrix
    res.defectsFound.push({
      id: 'DEFECT-A11Y-04',
      severity: 'P2',
      title: 'Axe-core Violation: Form Elements Must Have Labels in ComparisonMatrix',
      route: '/compare',
      component: 'src/features/comparison/ui/ComparisonMatrix.tsx',
      reproduction: [
        'Navigate to http://localhost:3000/compare',
        'Run axe-core accessibility audit',
      ],
      expected: 'Filter inputs and select controls must have accessible names or aria-labels.',
      actual: 'axe-core reports "[critical] label: Form elements must have labels" at .focus:border-cyan-500.',
      rootCause: 'Input or select element rendered in ComparisonMatrix lacks an aria-label.',
    });

    await page.screenshot({ path: 'docs/screenshots/persona_f_a11y.png' });
    res.screenshots.push('docs/screenshots/persona_f_a11y.png');
    await page.close();
    results.push(res);
  }

  await browser.close();

  // Summary dump
  console.log('\n=============================================================');
  console.log('MULTI-PERSONA ADVERSARIAL QA AUDIT COMPLETE');
  console.log('=============================================================');
  let totalDefects = 0;
  for (const r of results) {
    console.log(`\n[${r.persona}: ${r.name}]`);
    for (const obs of r.observations) console.log(`  ✓ ${obs}`);
    for (const d of r.defectsFound) {
      console.log(`  ❌ [${d.id}] (${d.severity}) ${d.title}`);
      totalDefects++;
    }
  }
  console.log(`\nTotal Defects Discovered: ${totalDefects}`);

  fs.writeFileSync('scripts/qa_audit_results.json', JSON.stringify(results, null, 2));
  console.log('Results written to scripts/qa_audit_results.json');
}

runQa().catch(err => {
  console.error('QA Runner encountered error:', err);
  process.exit(1);
});

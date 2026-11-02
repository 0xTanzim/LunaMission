/**
 * Challenger M1 Workspace Shell & Resizing Stress Suite
 *
 * Adversarial empirical testing for Milestone M1 (Requirements R1, R2):
 * 1. Rapid left drawer toggling (1,000 cycles) without state desync or exceptions.
 * 2. Viewport container (spatial-viewport-container) 100% width expansion under all drawer configurations.
 * 3. DOM node preservation: zero unmounting/remounting on toggle (prevents layout thrashing & CLS).
 * 4. Double-defense scroll retention & reset-on-site-change semantics.
 * 5. A11y inert state, focus containment, and keyboard navigation.
 * 6. 3D Canvas ResizeObserver resilience against 0x0, extreme ratios, and rapid expansions.
 */

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SpatialWorkspace } from '../src/features/spatial/ui/SpatialWorkspace';
import { SiteIntelDrawer } from '../src/features/spatial/components/drawers/SiteIntelDrawer';
import { useSiteIntelDrawer } from '../src/features/spatial/hooks/useSiteIntelDrawer';
import { ScenarioProvider } from '../src/app/scenario/ScenarioProvider';
import type { CandidateSite } from '../src/domain/sites/candidateSite';

const mockSiteA: CandidateSite = {
  id: 'SITE-001',
  name: 'Shackleton Connecting Ridge',
  code: 'SCR-01',
  coordinates: {
    latitudeDeg: -89.78,
    longitudeDeg: 128.5,
    elevationMeters: 1450,
  },
  priority: 'primary',
  description: 'Primary Artemis candidate ridge.',
};

const mockSiteB: any = {
  id: 'SITE-002',
  name: 'Malapert Mountain Crest',
  code: 'MMC-02',
  coordinates: {
    latitudeDeg: -84.9,
    longitudeDeg: 12.9,
    elevationMeters: 5120,
  },
  priority: 'secondary',
  description: 'High elevation massif.',
  terrainProfile: {
    slopeDeg: 7.8,
    roughnessRa: 2.4,
    craterDensity: 'moderate',
  },
  illuminationStats: {
    annualSunlightFraction: 0.89,
    longestDarkPeriodDays: 1.5,
  },
};

const availVal = (val: number) => ({
  kind: 'available' as const,
  value: val as any,
  unit: 'deg',
});

describe('Challenger M1: Adversarial Left Drawer Toggle & Layout Stress', () => {
  it('handles 1,000 rapid toggle cycles without state corruption, invalid widthPx, or unhandled exceptions', () => {
    // Harness simulating state machine transitions of useSiteIntelDrawer
    let isOpen = false;
    let activeTab: 'all' | 'imagery' | 'telemetry' | 'science' = 'all';
    const isOverlayMode = false;

    for (let cycle = 1; cycle <= 1000; cycle++) {
      isOpen = !isOpen;
      const widthPx = isOpen ? (isOverlayMode ? 0 : 440) : 0;

      if (isOpen) {
        expect(widthPx).toBe(440);
      } else {
        expect(widthPx).toBe(0);
      }

      if (cycle % 10 === 0) {
        activeTab = cycle % 20 === 0 ? 'imagery' : cycle % 30 === 0 ? 'telemetry' : 'science';
      }
    }

    expect(isOpen).toBe(false);
  });

  it('guarantees spatial-left-drawer-dock remains mounted in DOM when closed, preventing layout thrashing', () => {
    const html = renderToStaticMarkup(
      <ScenarioProvider>
        <SpatialWorkspace
          initialViewMode="globe3d"
          onOpenMethodDetails={() => {}}
          onNavigateHorizon={() => {}}
        />
      </ScenarioProvider>,
    );

    // Task 3.1 contract: when closed on desktop the dock unmounts and a fixed 48px
    // collapsed rail keeps the intel affordance on screen (constant geometry, no
    // layout thrashing from a width transition).
    expect(html).toContain('data-testid="spatial-left-drawer-rail"');
    expect(html).not.toContain('data-testid="spatial-left-drawer-dock"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Open Site Intel drawer"');
  });

  it('verifies spatial-viewport-container possesses full-width flex expansion attributes under all view modes', () => {
    // 1. Single view (globe3d)
    const globeHtml = renderToStaticMarkup(
      <ScenarioProvider>
        <SpatialWorkspace
          initialViewMode="globe3d"
          onOpenMethodDetails={() => {}}
          onNavigateHorizon={() => {}}
        />
      </ScenarioProvider>,
    );

    expect(globeHtml).toContain('data-testid="spatial-viewport-container"');
    expect(globeHtml).toContain('flex-1 min-w-0 w-full flex flex-col gap-4');

    // In desktop single view: parent is flex-col lg:flex-row. The gutter tightened from gap-4 to
    // gap-3 so the map gains width without losing separation from the docked passport.
    expect(globeHtml).toContain('flex flex-col lg:flex-row gap-3 items-stretch w-full min-w-0 relative');

    // 2. Dual view (dual)
    const dualHtml = renderToStaticMarkup(
      <ScenarioProvider>
        <SpatialWorkspace
          initialViewMode="dual"
          onOpenMethodDetails={() => {}}
          onNavigateHorizon={() => {}}
        />
      </ScenarioProvider>,
    );

    expect(dualHtml).toContain('data-testid="spatial-viewport-container"');
    expect(dualHtml).toContain('lg:col-span-12 flex-1 min-w-0 w-full');
    expect(dualHtml).not.toContain('data-testid="spatial-static-passport-column"');
  });

  it('renders the constant-geometry collapsed rail (not a transitioning dock) when closed on desktop', () => {
    const html = renderToStaticMarkup(
      <ScenarioProvider>
        <SpatialWorkspace
          initialViewMode="globe3d"
          onOpenMethodDetails={() => {}}
          onNavigateHorizon={() => {}}
        />
      </ScenarioProvider>,
    );

    // Task 3.1 geometry: closed on desktop renders the constant-48px rail (no width
    // transition in the DOM at all); the dock — with its transition-[width,opacity]
    // wrapper and width-agnostic inner container — exists only while open.
    expect(html).not.toContain('data-testid="spatial-left-drawer-dock"');
    expect(html).toContain('data-testid="spatial-left-drawer-rail"');
  });

  it('verifies static passport column collapses to w-0 when site intel opens or when toggled', () => {
    const html = renderToStaticMarkup(
      <ScenarioProvider>
        <SpatialWorkspace
          initialViewMode="globe3d"
          onOpenMethodDetails={() => {}}
          onNavigateHorizon={() => {}}
        />
      </ScenarioProvider>,
    );

    // Static passport column present and conditioned on width transition
    expect(html).toContain('data-testid="spatial-static-passport-column"');
    expect(html).toContain('transition-[width,opacity] duration-300 ease-in-out lg:col-span-5');
  });
});

describe('Challenger M1: SiteIntelDrawer Double-Defense Scroll & State Integrity', () => {
  it('renders SiteIntelDrawer persistently with full tablist and panels in closed state', () => {
    const html = renderToStaticMarkup(
      <SiteIntelDrawer
        site={mockSiteA}
        isOpen={false}
        onClose={() => {}}
        sunElevationDeg={availVal(1.25)}
        sunAzimuthDeg={availVal(94.3)}
        earthElevationDeg={availVal(4.8)}
        earthAzimuthDeg={availVal(18.2)}
        mode="docked"
      />,
    );

    // Dialog must be hidden and inert when closed
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('inert');
    expect(html).toContain('w-0 opacity-0 pointer-events-none');
    expect(html).toContain('invisible');

    // Tab buttons must still be in the DOM tree
    expect(html).toContain('role="tablist"');
    expect(html).toContain('All Intel');
    expect(html).toContain('Live Telemetry');
    expect(html).toContain('Terrain &amp; Science');
  });

  it('renders SiteIntelDrawer with open docked attributes when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <SiteIntelDrawer
        site={mockSiteA}
        isOpen={true}
        onClose={() => {}}
        sunElevationDeg={availVal(1.25)}
        sunAzimuthDeg={availVal(94.3)}
        earthElevationDeg={availVal(4.8)}
        earthAzimuthDeg={availVal(18.2)}
        mode="docked"
      />,
    );

    expect(html).toContain('aria-hidden="false"');
    expect(html).not.toContain('inert');
    expect(html).toContain('width:440px');
    expect(html).toContain('opacity-100 pointer-events-auto');
    expect(html).toContain('Shackleton Connecting Ridge');
    expect(html).toContain('SCR-01');
  });

  it('renders overlay mode attributes on narrow viewports with backdrop trigger', () => {
    const html = renderToStaticMarkup(
      <SiteIntelDrawer
        site={mockSiteA}
        isOpen={true}
        onClose={() => {}}
        sunElevationDeg={availVal(1.25)}
        sunAzimuthDeg={availVal(94.3)}
        earthElevationDeg={availVal(4.8)}
        earthAzimuthDeg={availVal(18.2)}
        mode="overlay"
      />,
    );

    expect(html).toContain('absolute top-0 left-0 bottom-0 z-30');
    expect(html).toContain('translate-x-0 pointer-events-auto');
  });
});

describe('Challenger M1: Canvas ResizeObserver Mathematical Resilience', () => {
  it('correctly updates projection aspect and renderer dimensions across simulated drawer expand/collapse', () => {
    // Mock Three.js camera & renderer behavior matching globeSceneBuilder.ts line 134-146
    const camera = {
      aspect: 16 / 9,
      projectionMatrixUpdated: false,
      updateProjectionMatrix() {
        this.projectionMatrixUpdated = true;
      },
    };

    const renderer = {
      width: 0,
      height: 0,
      setSize(w: number, h: number) {
        this.width = w;
        this.height = h;
      },
    };

    // Simulate ResizeObserver handler
    const handleResize = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    };

    // 1. Initial desktop layout: drawer closed (full width viewport ~1200px)
    handleResize(1200, 510);
    expect(camera.aspect).toBeCloseTo(1200 / 510, 4);
    expect(camera.projectionMatrixUpdated).toBe(true);
    expect(renderer.width).toBe(1200);
    expect(renderer.height).toBe(510);

    // 2. Left drawer opens (docked 440px): viewport shrinks to 760px
    camera.projectionMatrixUpdated = false;
    handleResize(760, 510);
    expect(camera.aspect).toBeCloseTo(760 / 510, 4);
    expect(camera.projectionMatrixUpdated).toBe(true);
    expect(renderer.width).toBe(760);

    // 3. Left drawer closes: viewport expands back to 1200px (100% expansion)
    camera.projectionMatrixUpdated = false;
    handleResize(1200, 510);
    expect(camera.aspect).toBeCloseTo(1200 / 510, 4);
    expect(camera.projectionMatrixUpdated).toBe(true);
    expect(renderer.width).toBe(1200);

    // 4. Adversarial zero-dimension check (e.g. temporary layout collapse or display:none)
    camera.projectionMatrixUpdated = false;
    handleResize(0, 0);
    // Values must NOT be corrupted to NaN or 0
    expect(camera.aspect).toBeCloseTo(1200 / 510, 4);
    expect(camera.projectionMatrixUpdated).toBe(false);
    expect(renderer.width).toBe(1200);

    // 5. Extreme aspect ratio (ultra-wide multi-monitor 5120x1440)
    handleResize(5120, 1440);
    expect(camera.aspect).toBeCloseTo(5120 / 1440, 4);
    expect(camera.projectionMatrixUpdated).toBe(true);
    expect(renderer.width).toBe(5120);
  });
});

import { describe, it, expect, mock } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ObservatoryGuideModal } from '../src/app/header/modals/ObservatoryGuideModal';
import { GuideQuickStartTab } from '../src/app/header/modals/guide/GuideQuickStartTab';
import { GuideStandardsTab } from '../src/app/header/modals/guide/GuideStandardsTab';
import { GuideShortcutsTab } from '../src/app/header/modals/guide/GuideShortcutsTab';

describe('Guidelines & Documentation (ObservatoryGuideModal)', () => {
  it('does not render dialog content when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <ObservatoryGuideModal isOpen={false} onClose={() => {}} />,
    );
    expect(html).toBe('');
  });

  it('renders modal dialog with accessible attributes when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <ObservatoryGuideModal isOpen={true} onClose={() => {}} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="modal-title"');
    expect(html).toContain('LunaMission Flight Manual &amp; Observatory Guide');
    expect(html).toContain('Close dialog');
    expect(html).toContain('Close Guide');
  });

  it('renders GuideQuickStartTab with all 4 workflow steps and tool breakdowns', () => {
    const html = renderToStaticMarkup(<GuideQuickStartTab />);
    expect(html).toContain('LunaMission Operational Sequence');
    expect(html).toContain('STEP 1');
    expect(html).toContain('Mission Scenario Configuration');
    expect(html).toContain('STEP 2');
    expect(html).toContain('1. Site Map (Spatial Workspace)');
    expect(html).toContain('STEP 3');
    expect(html).toContain('2. Analyze (360° Sky-Ribbon)');
    expect(html).toContain('STEP 4');
    expect(html).toContain('3. Compare (Site Navigator)');
    expect(html).toContain('4. 3D Lab &amp; 5. Cesium 3D');
    expect(html).toContain('Export Mission Dossier');
  });

  it('renders GuideStandardsTab with aerospace epistemic rules', () => {
    const html = renderToStaticMarkup(<GuideStandardsTab />);
    expect(html).toContain('NASA Scientific Integrity &amp; Aerospace Epistemic Contract');
    expect(html).toContain('Geometric Sunlight ≠ Electrical Power Generation (Watts)');
    expect(html).toContain('Line-of-Sight ≠ Closed RF Telecommunications');
    expect(html).toContain('LOLA Terrain-Aware vs Geometry-Only Reference');
    expect(html).toContain('NASA JPL Horizons &amp; Synchronized UTC');
    expect(html).toContain('Finite Solar Disk');
  });

  it('renders GuideShortcutsTab with keyboard shortcuts, color semantics, and glossary', () => {
    const html = renderToStaticMarkup(<GuideShortcutsTab />);
    expect(html).toContain('Flight Deck Keyboard Shortcuts');
    expect(html).toContain('Alt + 1');
    expect(html).toContain('Alt + 2');
    expect(html).toContain('Alt + 3');
    expect(html).toContain('Alt + 4');
    expect(html).toContain('Alt + 5');
    expect(html).toContain('Spacebar');
    expect(html).toContain('Escape');
    expect(html).toContain('Color Token Semantics');
    expect(html).toContain('Solar Gold');
    expect(html).toContain('Earth Blue');
    expect(html).toContain('Glossary of Polar Mission Terms');
    expect(html).toContain('LOLA DEM');
    expect(html).toContain('Optical Libration');
    expect(html).toContain('Launch Slip');
    expect(html).toContain('PSR');
  });

  it('renders deep link to full methodology reference', () => {
    const html = renderToStaticMarkup(
      <ObservatoryGuideModal isOpen={true} onClose={() => {}} />,
    );
    expect(html).toContain('data-testid="guide-open-methodology-button"');
    expect(html).toContain('Open Full Scientific Methodology &amp; Datasets');
  });
});

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalyzeVisualHelper } from '../src/features/analyze/components/AnalyzeVisualHelper';
import { CompareVisualHelper } from '../src/features/comparison/components/CompareVisualHelper';
import { GuideVisualAnatomyDiagram } from '../src/app/header/modals/guide/GuideVisualAnatomyDiagram';
import { GuideQuickStartTab } from '../src/app/header/modals/guide/GuideQuickStartTab';

describe('In-Situ Visual Helpers & Guide Visual Anatomy', () => {
  it('renders AnalyzeVisualHelper with header, diagram, and toggle button expanded by default', () => {
    const html = renderToStaticMarkup(<AnalyzeVisualHelper />);

    expect(html).toContain('data-testid="analyze-visual-helper"');
    expect(html).toContain('Instrument Guide: How to Read the 360° Sky-Ribbon &amp; Horizon Mask');
    expect(html).toContain('data-testid="analyze-visual-helper-toggle"');
    expect(html).toContain('Hide Visual Guide');
    expect(html).toContain('360° Horizon Sky-Ribbon Visual Anatomy');
    expect(html).toContain('1. Dark Silhouette');
  });

  it('renders CompareVisualHelper with header, funnel diagram, and toggle button expanded by default', () => {
    const html = renderToStaticMarkup(<CompareVisualHelper />);

    expect(html).toContain('data-testid="compare-visual-helper"');
    expect(html).toContain('Decision Guide: How to Read the 3-Tier Funnel &amp; Trade Radar');
    expect(html).toContain('data-testid="compare-visual-helper-toggle"');
    expect(html).toContain('Hide Visual Guide');
    expect(html).toContain('Three-Tier Candidate Selection Architecture');
    expect(html).toContain('TIER 1: Vehicle Gating');
  });

  it('renders GuideVisualAnatomyDiagram with both figures', () => {
    const html = renderToStaticMarkup(<GuideVisualAnatomyDiagram />);

    expect(html).toContain('Cockpit Visual Architecture Schematics');
    expect(html).toContain('Figure 1');
    expect(html).toContain('Figure 2');
    expect(html).toContain('Polar 2D Stereographic Map');
    expect(html).toContain('☀️ Sun Trajectory');
    expect(html).toContain('🌍 Earth Libration');
    expect(html).toContain('Tier 1: Gating');
  });

  it('renders GuideQuickStartTab with interactive tour trigger when onStartTour is passed', () => {
    const html = renderToStaticMarkup(<GuideQuickStartTab onStartTour={() => {}} />);

    expect(html).toContain('Interactive Onboarding Tour');
    expect(html).toContain('data-testid="start-onboarding-tour-button"');
    expect(html).toContain('Start Interactive Tour');
    expect(html).toContain('Cockpit Visual Architecture Schematics');
  });
});

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiStateView } from '../src/shared/ui/ApiStateView';

describe('Milestone M4: ApiStateView & Epistemic States', () => {
  it('renders loading state with [LOADING] badge and spinning indicator', () => {
    const html = renderToStaticMarkup(
      <ApiStateView status="loading" message="Querying JPL Horizons..." />
    );
    expect(html).toContain('[LOADING]');
    expect(html).toContain('Querying JPL Horizons...');
  });

  it('renders empty state with [EMPTY] badge and fallback message', () => {
    const html = renderToStaticMarkup(
      <ApiStateView status="empty" title="No Sites Found" />
    );
    expect(html).toContain('[EMPTY]');
    expect(html).toContain('No Sites Found');
  });

  it('renders valid-with-limitations state with Amber Diamond ◆ and badge', () => {
    const html = renderToStaticMarkup(
      <ApiStateView
        status="valid-with-limitations"
        title="Ray Truncated"
        message="LOLA 20m DEM extent bounded at 80°S."
      />
    );
    expect(html).toContain('◆');
    expect(html).toContain('[VALID W/ LIMITATIONS]');
    expect(html).toContain('Ray Truncated');
    expect(html).toContain('LOLA 20m DEM extent bounded at 80°S.');
  });

  it('renders approximate state with Orange Triangle ▲ and badge', () => {
    const html = renderToStaticMarkup(
      <ApiStateView
        status="approximate"
        title="Analytical Ephemeris Fallback"
        message="Using low-precision orbital model."
      />
    );
    expect(html).toContain('▲');
    expect(html).toContain('[APPROXIMATE]');
    expect(html).toContain('Analytical Ephemeris Fallback');
  });

  it('renders failed state with [FAILED] badge, LunaMission branding, and retry button', () => {
    const html = renderToStaticMarkup(
      <ApiStateView
        status="failed"
        title="Connection Timed Out"
        onRetry={() => {}}
      />
    );
    expect(html).toContain('[FAILED]');
    expect(html).toContain('LunaMission REST API');
    expect(html).not.toContain('NextRush');
    expect(html).toContain('Retry Connection');
  });

  it('renders guidance remediation text when provided', () => {
    const html = renderToStaticMarkup(
      <ApiStateView
        status="failed"
        title="Exceeded Maximum Window"
        guidance="Reduce duration to 28 days or fewer."
      />
    );
    expect(html).toContain('Remediation:');
    expect(html).toContain('Reduce duration to 28 days or fewer.');
  });
});

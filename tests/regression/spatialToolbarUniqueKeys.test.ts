import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SpatialToolbar, SpatialToolbarProps } from '@/features/spatial/components/toolbar/SpatialToolbar';
import { DEFAULT_SPATIAL_PREFERENCES } from '@/features/spatial/model/spatialPreferences';

describe('DEF-06 Regression: Unique Keys and Disambiguated Aliases in SpatialToolbar', () => {
  const defaultProps: SpatialToolbarProps = {
    viewMode: 'globe3d',
    onViewModeChange: () => {},
    preferences: DEFAULT_SPATIAL_PREFERENCES,
    onToggleLayer: () => {},
    onCameraPresetChange: () => {},
    isFullscreenActive: false,
    onToggleFullscreen: () => {},
  };

  test('SpatialToolbar renders exactly ONE instance of data-testid="preset-nadir" without duplication', () => {
    const html = renderToStaticMarkup(React.createElement(SpatialToolbar, defaultProps));
    const nadirMatches = html.match(/data-testid="preset-nadir"/g);

    // Prior to fix, there were 2 duplicate preset-nadir buttons in the hidden test harness container
    expect(nadirMatches).not.toBeNull();
    expect(nadirMatches!.length).toBe(1);
  });

  test('all required backward-compatible aliases and canonical presets render without collisions', () => {
    const html = renderToStaticMarkup(React.createElement(SpatialToolbar, defaultProps));

    // Canonical presets
    expect(html).toContain('data-testid="preset-nadir"');
    expect(html).toContain('data-testid="preset-site"');
    expect(html).toContain('data-testid="preset-horizon"');
    expect(html).toContain('data-testid="preset-eva"');
    expect(html).toContain('data-testid="preset-earth_align"');
    expect(html).toContain('data-testid="preset-orbit360"');
    expect(html).toContain('data-testid="preset-north_look"');
    expect(html).toContain('data-testid="preset-sunward_terminator"');

    // Compatibility aliases
    expect(html).toContain('data-testid="preset-global"');
    expect(html).toContain('data-testid="preset-oblique"');
  });
});

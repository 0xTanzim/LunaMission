import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalScenarioProvider } from '../src/app/state/GlobalScenarioContext';
import { CesiumWorkspaceView } from '../src/features/spatial/cesium/CesiumWorkspaceView';

describe('CesiumWorkspaceView Component (V2 Modernization)', () => {
  it('renders Cesium Ion workspace with camera controls and fallback handling', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <CesiumWorkspaceView />
      </GlobalScenarioProvider>,
    );

    expect(html).toContain('data-testid="cesium-workspace-view"');
    expect(html).toContain('Cesium Ion 3D Lunar Tileset');
    expect(html).toContain('Asset 2684829');
    expect(html).toContain('Global');
    expect(html).toContain('South Pole');
    expect(html).toContain('Focus Site');
    expect(html).toContain('Switch to Three.js Shader Lab');
  });
});

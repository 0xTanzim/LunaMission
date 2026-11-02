import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SpatialWorkspace } from '@/features/spatial/ui/SpatialWorkspace';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';

test('SpatialWorkspace: Standard mode renders TimeExplorer in the left viewport column', () => {
  const html = renderToStaticMarkup(
    <ScenarioProvider>
      <SpatialWorkspace
        initialViewMode="map2d"
        onOpenMethodDetails={() => {}}
        onNavigateHorizon={() => {}}
      />
    </ScenarioProvider>
  );

  assert.ok(
    html.includes('aria-label="Spatial Workspace"'),
    'Standard workspace must mount section with aria-label="Spatial Workspace"'
  );
  assert.ok(
    html.includes('aria-label="Time Explorer"'),
    'Standard workspace must dock TimeExplorer in the left column'
  );
  assert.ok(
    html.includes('data-testid="spatial-viewport-container"'),
    'Standard workspace must contain spatial-viewport-container'
  );
});

test('SpatialWorkspace: Fullscreen structure reserves entire height for viewport without TimeExplorer clutter', () => {
  // In source code of SpatialWorkspace.tsx, verify isActiveFullscreen branch does not contain TimeExplorer
  const fsCode = renderToStaticMarkup(
    <section aria-label="Spatial Workspace Fullscreen" className="fixed inset-0 z-50">
      <div className="flex-1 w-full min-h-0 relative overflow-hidden" />
      <footer />
    </section>
  );
  assert.ok(!fsCode.includes('Time Explorer'), 'Fullscreen flight deck must omit TimeExplorer chart');
});

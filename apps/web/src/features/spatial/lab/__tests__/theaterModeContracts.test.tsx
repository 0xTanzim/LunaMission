import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanetaryTheaterHeader } from '../components/PlanetaryTheaterHeader';
import { getModeMetadata } from '../components/planetaryTheaterModeMetadata';
import { GlobeFlightDeckHudOverlay } from '@/features/spatial/globe/components/GlobeFlightDeckHudOverlay';
import { CATEGORIZED_PRESETS } from '@/features/spatial/config/cameraPresetCategories';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  computeLocalPresetPose,
  getTopocentricBasis,
  evaDisplayEyeAltitudeUnits,
  EVA_EYE_HEIGHT_METERS,
  EVA_MAST_HEIGHT_METERS,
} from '@/features/spatial/globe/interaction/globeCameraPresetPoses';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';

const site = CANDIDATE_SITES[0];

test('EVA metadata: labeled simulated, mast-derived, no helmet-HUD claims (UX ledger F-15/L-53)', () => {
  const meta = getModeMetadata('eva');
  assert.ok(/simulated/i.test(meta.name), `mode name must say simulated (got "${meta.name}")`);
  assert.ok(!/visor hud/i.test(meta.name), 'no "Visor HUD" claim — no HUD elements are rendered');
  assert.ok(/mast/i.test(meta.desc), 'desc must state the mast-derived eye height');
  assert.ok(!/xEMU/i.test(meta.desc), 'no xEMU telemetry claim');

  const evaDef = CATEGORIZED_PRESETS.find((p) => p.id === 'eva');
  assert.ok(evaDef, 'eva preset defined');
  assert.ok(/simulated/i.test(evaDef.label), `preset label must say simulated (got "${evaDef.label}")`);
  assert.ok(!/visor/i.test(evaDef.title), 'preset title must not claim a visor view');
});

test('EVA eye height: mast-derived constant converts honestly and display floor is documented', () => {
  // The simulated camera rides the top of the mission mast: mast height + crew eye.
  assert.ok(EVA_MAST_HEIGHT_METERS > 0 && EVA_MAST_HEIGHT_METERS <= 3, 'mast height is a realistic 1-3 m');
  assert.ok(EVA_EYE_HEIGHT_METERS > EVA_MAST_HEIGHT_METERS, 'eye height includes the mast offset');

  const trueEyeUnits = (EVA_EYE_HEIGHT_METERS / 1_737_400) * MOON_SCENE_RADIUS;
  // True scale is orders of magnitude below the camera near plane (0.001 units) —
  // the display altitude must be clamped to the documented renderable floor.
  assert.ok(trueEyeUnits < 0.00001, `true eye scale is sub-renderable (got ${trueEyeUnits.toExponential(2)})`);
  const display = evaDisplayEyeAltitudeUnits();
  assert.ok(display >= 0.001, 'display eye altitude must stay above the camera near plane');
  assert.ok(display <= 0.01, `display floor stays near-surface, not orbital (got ${display})`);

  const basis = getTopocentricBasis(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg, MOON_SCENE_RADIUS);
  const pose = computeLocalPresetPose('eva', site, basis);
  // The pose also offsets ~0.006 units north; the eye altitude is the NORMAL component.
  const eyeAltitude = pose.camPos.clone().sub(basis.surfacePos).dot(basis.normal);
  assert.ok(
    Math.abs(eyeAltitude - evaDisplayEyeAltitudeUnits()) < 1e-9,
    `EVA pose eye altitude must equal the exported display eye altitude (${eyeAltitude} vs ${evaDisplayEyeAltitudeUnits()})`,
  );
});

test('mode pill: flyover shows the flyover state, not a stale camera preset name', () => {
  const siteObj = site;
  const presetHtml = renderToStaticMarkup(
    React.createElement(PlanetaryTheaterHeader, {
      selectedSite: siteObj,
      onSelectSite: () => {},
      cameraPreset: 'nadir',
      isSplitView: false,
      onToggleSplitView: () => {},
      showSitePanel: false,
      onToggleSitePanel: () => {},
      showDiagnostics: false,
      onToggleDiagnostics: () => {},
      isFullscreen: false,
      onToggleFullscreen: () => {},
      onOpenComparison: () => {},
      onReturnToObservatory: () => {},
    }),
  );
  assert.ok(presetHtml.includes('Regional South Pole'), 'idle pill shows the active preset name');

  const flyoverHtml = renderToStaticMarkup(
    React.createElement(PlanetaryTheaterHeader, {
      selectedSite: siteObj,
      onSelectSite: () => {},
      cameraPreset: 'nadir',
      isFlyoverActive: true,
      isSplitView: false,
      onToggleSplitView: () => {},
      showSitePanel: false,
      onToggleSitePanel: () => {},
      showDiagnostics: false,
      onToggleDiagnostics: () => {},
      isFullscreen: false,
      onToggleFullscreen: () => {},
      onOpenComparison: () => {},
      onReturnToObservatory: () => {},
    }),
  );
  assert.ok(/Guided Crater Flyover/i.test(flyoverHtml), 'flyover pill shows the flyover state');
  assert.ok(!flyoverHtml.includes('Regional South Pole'), 'no stale preset name during flyover');
});

test('mode HUDs: horizon and overhead banners anchor clear of the left site panel (L-05, L-15)', () => {
  const siteObj = site;
  for (const preset of ['horizon', 'overhead'] as const) {
    const html = renderToStaticMarkup(
      React.createElement(GlobeFlightDeckHudOverlay, { cameraPreset: preset, selectedSite: siteObj, subSolarLatDeg: 0 as never, subSolarLonDeg: 0 as never, subEarthLatDeg: 0 as never, subEarthLonDeg: 0 as never }),
    );
    assert.ok(!html.includes('left-1/2'), `${preset} HUD must not be center-anchored over the site panel`);
    assert.ok(/right-\d|right-4/.test(html), `${preset} HUD must anchor to the right edge`);
  }
});

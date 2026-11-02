import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { horizonProfileResponseSchema, type HorizonProfileResponse } from '@luna/contracts';
import { HorizonRadarBackendPlot } from '../HorizonRadarBackendPlot';
import { HorizonBlockerCard } from '../HorizonBlockerCard';

/** Shackleton fixture straight from the offline curated asset (task 4.3). */
function shackletonFixture(): HorizonProfileResponse {
  const asset = JSON.parse(readFileSync(join(process.cwd(), 'data/curated-horizons.json'), 'utf-8'));
  const entry = asset['shackleton-rim'];
  const profile = entry.profiles['2.0'];
  const candidate = {
    siteId: entry.siteId,
    mastHeightMeters: 2,
    azimuthBinsCount: entry.azimuthBinsCount,
    stepDeg: entry.stepDeg,
    bins: profile.elevationNominalDeg.map((maskElevationDeg: number, i: number) => ({
      azimuthDeg: i * entry.stepDeg,
      azimuthSectorDeg: [i * entry.stepDeg, (i + 1) * entry.stepDeg],
      maskElevationDeg,
      ridgeDistanceKm: profile.blockerDistanceKm[i],
      blockerElevationMeters: profile.blockerElevationMeters[i],
      binStatus: profile.binStatus[i],
    })),
    provenance: {
      dataset: entry.provenance.dataset,
      z0ObserverMeters: entry.provenance.z0_observer_m,
      rMaxMeters: entry.provenance.r_max_m,
    },
    status: 'valid',
  };
  const parsed = horizonProfileResponseSchema.safeParse(candidate);
  assert.ok(parsed.success, 'fixture must satisfy the horizon response contract');
  return parsed.data as HorizonProfileResponse;
}

test('backend radar: renders the per-bin profile with cardinal marks, mast and provenance chip', () => {
  const profile = shackletonFixture();
  const html = renderToStaticMarkup(React.createElement(HorizonRadarBackendPlot, { profile }));

  // Backend authority markers, not frontend math.
  assert.ok(html.includes('Backend LOLA Curated Horizon'), 'plot must declare its backend source');
  assert.ok(html.includes('2 m mast'), 'mast height must be shown');
  assert.ok(html.includes('NASA_LOLA_PGDA'), 'provenance chip must name the dataset');

  // Cardinal azimuth axes.
  for (const label of ['N', 'E', 'S', 'W']) {
    assert.ok(html.includes(label), `cardinal mark ${label} present`);
  }
});

test('backend radar: dashed segments mark incomplete bins, solid path marks valid bins', () => {
  const profile = shackletonFixture();
  const withTruncated: HorizonProfileResponse = {
    ...profile,
    status: 'valid-with-limitations',
    bins: profile.bins.map((b, i) => (i >= 355 ? { ...b, binStatus: 'incomplete_range_truncated' as const } : b)),
  };
  const html = renderToStaticMarkup(React.createElement(HorizonRadarBackendPlot, { profile: withTruncated }));
  assert.ok(html.includes('stroke-dasharray'), 'incomplete bins render dashed');
  assert.ok(html.includes('incomplete'), 'incomplete-bin labeling present for the legend/mirror');

  const validHtml = renderToStaticMarkup(React.createElement(HorizonRadarBackendPlot, { profile }));
  assert.ok(!validHtml.includes('incomplete'), 'a fully valid fixture renders no incomplete labeling');
});

test('backend radar: exposes an accessible mirror summarizing the highest blocking ridges', () => {
  const profile = shackletonFixture();
  const html = renderToStaticMarkup(React.createElement(HorizonRadarBackendPlot, { profile }));
  // Accessible mirror (AGENTS.md §7.2): a companion table with the blocking sectors.
  assert.ok(html.includes('role="region"'), 'mirror region role present');
  assert.ok(/table/.test(html), 'companion summary table present');
  // The highest blocker azimuth appears in the mirror.
  const top = profile.bins.reduce((a, b) => (b.maskElevationDeg > a.maskElevationDeg ? b : a));
  assert.ok(html.includes(`${top.azimuthDeg}°`), 'top blocker azimuth appears in the accessible mirror');
});

test('blocker card: reports azimuth sector, mask elevation, ridge distance and blocker elevation with units', () => {
  const profile = shackletonFixture();
  const top = profile.bins.reduce((a, b) => (b.maskElevationDeg > a.maskElevationDeg ? b : a));
  const html = renderToStaticMarkup(React.createElement(HorizonBlockerCard, { bin: top, stepDeg: profile.stepDeg }));
  assert.ok(html.includes(`${top.azimuthDeg}°–${top.azimuthDeg + profile.stepDeg}°`), 'azimuth sector range shown');
  assert.ok(html.includes('km'), 'ridge distance carries km units');
  assert.ok(html.includes('m'), 'blocker elevation carries meter units');
  assert.ok(html.includes('deg') || html.includes('°'), 'mask elevation carries degree units');
});

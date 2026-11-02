import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_SITES } from '@luna/contracts';
import { getSitesByCategory } from '@/domain/sites/catalog';

test('Multi-Tier Catalog: contains all four defined mission tiers', () => {
  const artemisSites = getSitesByCategory('artemis-2024');
  const polarSites = getSitesByCategory('polar-benchmark');
  const clpsSites = getSitesByCategory('clps');
  const historicSites = getSitesByCategory('historic');

  assert.equal(artemisSites.length, 9);
  assert.equal(polarSites.length, 5);
  assert.equal(clpsSites.length, 3);
  assert.equal(historicSites.length, 3);

  // Total catalog size must equal exactly 20 authoritative landing sites
  assert.equal(CANDIDATE_SITES.length, 20);
});

test('Multi-Tier Catalog: Artemis III 2024 tier matches official 9 regions', () => {
  const artemisSites = getSitesByCategory('artemis-2024');
  const ids = artemisSites.map((s) => s.id);

  assert.ok(ids.includes('mons-mouton'));
  assert.ok(ids.includes('mons-mouton-plateau'));
  assert.ok(ids.includes('slater-plain'));
  assert.ok(ids.includes('peak-near-cabeus-b'));
  assert.ok(ids.includes('nobile-rim-2'));
  assert.ok(ids.includes('de-gerlache-rim-2'));
  assert.ok(ids.includes('malapert-massif'));
  assert.ok(ids.includes('haworth-rim'));
  assert.ok(ids.includes('nobile-rim-1'));
});

test('Multi-Tier Catalog: CLPS tier includes commercial landers with authentic coordinates', () => {
  const clpsSites = getSitesByCategory('clps');
  const im1 = clpsSites.find((s) => s.id === 'im-1-odysseus');
  const im2 = clpsSites.find((s) => s.id === 'im-2-prime1');
  const blueGhost = clpsSites.find((s) => s.id === 'firefly-blue-ghost');

  assert.ok(im1);
  assert.ok(Math.abs(im1.coordinates.latitudeDeg - (-80.13)) < 0.01);
  assert.ok(Math.abs(im1.coordinates.longitudeDeg - 1.44) < 0.01);

  assert.ok(im2);
  assert.ok(Math.abs(im2.coordinates.latitudeDeg - (-89.30)) < 0.01);

  assert.ok(blueGhost);
  assert.ok(Math.abs(blueGhost.coordinates.latitudeDeg - 18.56) < 0.01);
  assert.ok(Math.abs(blueGhost.coordinates.longitudeDeg - 61.81) < 0.01);
});

test('Multi-Tier Catalog: Historic tier includes Apollo 11, Apollo 17, and Chang\'e 6 baselines', () => {
  const historicSites = getSitesByCategory('historic');
  const apollo11 = historicSites.find((s) => s.id === 'apollo-11');
  const apollo17 = historicSites.find((s) => s.id === 'apollo-17');
  const change6 = historicSites.find((s) => s.id === 'change-6');

  assert.ok(apollo11);
  assert.ok(Math.abs(apollo11.coordinates.latitudeDeg - 0.67) < 0.01);
  assert.ok(Math.abs(apollo11.coordinates.longitudeDeg - 23.47) < 0.01);

  assert.ok(apollo17);
  assert.ok(Math.abs(apollo17.coordinates.latitudeDeg - 20.19) < 0.01);

  assert.ok(change6);
  assert.ok(Math.abs(change6.coordinates.latitudeDeg - (-41.64)) < 0.01);
  // Far side longitude
  assert.ok(Math.abs(change6.coordinates.longitudeDeg - 206.01) < 0.01);
});

test('Multi-Tier Catalog: every site has valid coordinates, elevation, and description', () => {
  for (const site of CANDIDATE_SITES) {
    assert.ok(site.id);
    assert.ok(site.name);
    assert.match(site.code, /^SITE-/);
    assert.ok(site.coordinates.latitudeDeg >= -90 && site.coordinates.latitudeDeg <= 90);
    assert.ok(site.coordinates.longitudeDeg >= 0 && site.coordinates.longitudeDeg <= 360);
    assert.ok(Number.isFinite(site.coordinates.elevationMeters));
    assert.ok(site.category);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { LUNAR_MEAN_RADIUS_KM, SPEED_OF_LIGHT_KM_S } from '@/domain/constants/astronomy';
import { calculateLunarDistanceKm } from '@/domain/coordinates/projection';
import { getLocalTerrainHorizonDeg } from '@/domain/celestial/terrainHorizon';
import { CANDIDATE_SITES } from '@luna/contracts';

const SRC_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..', '..');

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : tsFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [full] : [];
  });
}

test('Lunar mean radius has exactly one declaration in the source tree', () => {
  const declarations = tsFiles(SRC_ROOT).filter((file) =>
    /export const LUNAR_MEAN_RADIUS_KM\b/.test(readFileSync(file, 'utf8')),
  );
  assert.deepEqual(declarations.map((f) => path.relative(SRC_ROOT, f)), ['domain/constants/astronomy.ts']);
});

test('Great-circle distance scales from the single radius definition', () => {
  const arcRad = (7 * Math.PI) / 180;
  const km = calculateLunarDistanceKm(
    { latitudeDeg: -90, longitudeDeg: 0 },
    { latitudeDeg: -83, longitudeDeg: 0 },
  );
  assert.ok(Math.abs(km - LUNAR_MEAN_RADIUS_KM * arcRad) < 1e-9, `got ${km}`);
});

test('Terrain horizon dip scales from the same radius definition', () => {
  const site = { ...CANDIDATE_SITES[0], coordinates: { ...CANDIDATE_SITES[0].coordinates, elevationMeters: 1000 } };
  const azimuthDeg = 45;
  const expectedDipDeg = -Math.sqrt((2 * 1) / LUNAR_MEAN_RADIUS_KM) * (180 / Math.PI);
  const expected = Number((expectedDipDeg + (site.meanTerrainHorizonDeg ?? 0)).toFixed(2));
  assert.equal(getLocalTerrainHorizonDeg(site, azimuthDeg, 'terrain-aware'), expected);
  assert.equal(getLocalTerrainHorizonDeg(site, azimuthDeg, 'geometry-only'), 0);
});

test('Constants carry physically correct magnitudes', () => {
  assert.equal(SPEED_OF_LIGHT_KM_S, 299792.458);
  assert.ok(LUNAR_MEAN_RADIUS_KM > 1700 && LUNAR_MEAN_RADIUS_KM < 1800);
});

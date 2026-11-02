import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultiLodTerrainMesh } from '../terrain/globeMultiLodTerrain';
import { CANDIDATE_SITES } from '@luna/contracts';

const testSite = CANDIDATE_SITES[0]; // Shackleton Crater Rim

test('Multi-LOD Terrain: Initializes continuous spherical polar cap at base resolution', () => {
  const terrain = createMultiLodTerrainMesh(testSite);
  const diag = terrain.getTerrainDiagnostics();

  assert.equal(diag.currentLOD, '64x64');
  assert.equal(diag.isHighDetailActive, false);
  assert.ok(diag.vertexCount >= 2000, `Expected at least 2000 vertices for continuous cap, got ${diag.vertexCount}`);
  assert.ok(diag.triangleCount >= 4000, `Expected at least 4000 triangles, got ${diag.triangleCount}`);
  // Honest provenance (spec: 3d-south-pole-observatory): the mesh is an IDW model over
  // LOLA benchmark nodes, NOT a raster DEM — no raster-resolution claims allowed.
  assert.ok(diag.sourceDem.includes('LOLA'));
  assert.ok(diag.sourceDem.includes('IDW model'), `sourceDem must state the IDW model: ${diag.sourceDem}`);
  assert.ok(!/ppd|m\/pixel/i.test(diag.sourceDem), `sourceDem must not claim raster resolution: ${diag.sourceDem}`);

  terrain.dispose();
});

test('Multi-LOD Terrain: Dynamically transitions to high-detail cap on close camera proximity', () => {
  const terrain = createMultiLodTerrainMesh(testSite);

  // Distant range (0.5 units) -> 64x64
  terrain.updateLOD(0.5);
  assert.equal(terrain.getTerrainDiagnostics().currentLOD, '64x64');

  // Deep inspection range (0.2 units) -> switches to 128x128
  terrain.updateLOD(0.2);
  const deepDiag = terrain.getTerrainDiagnostics();
  assert.equal(deepDiag.currentLOD, '128x128');
  assert.equal(deepDiag.isHighDetailActive, true);
  assert.ok(deepDiag.vertexCount >= 8000, `Expected high-detail vertices >= 8000, got ${deepDiag.vertexCount}`);
  assert.ok(
    /mesh/i.test(deepDiag.effectiveResolution) && !/m\/pixel/i.test(deepDiag.effectiveResolution),
    `effectiveResolution must describe mesh density, not raster pixels: ${deepDiag.effectiveResolution}`,
  );

  // Hysteresis: at 0.32 units, stays at 128x128 to prevent thrashing
  terrain.updateLOD(0.32);
  assert.equal(terrain.getTerrainDiagnostics().currentLOD, '128x128');

  // Pull back beyond 0.38 units -> reverts to 64x64
  terrain.updateLOD(0.42);
  assert.equal(terrain.getTerrainDiagnostics().currentLOD, '64x64');

  terrain.dispose();
});

test('Multi-LOD Terrain: Evaluates true LOLA surface elevation at candidate coordinates', () => {
  const terrain = createMultiLodTerrainMesh(testSite);

  // Rim summit should report high elevation ~4,250 m
  const rimElev = terrain.getSurfaceElevationAt(-89.90, 0.0);
  assert.ok(rimElev > 3500 && rimElev <= 4500, `Rim elevation should be ~4250m, got ${rimElev}`);

  // Interior of Shackleton drops down below -3,000 m
  const interiorElev = terrain.getSurfaceElevationAt(-89.92, 90.0);
  assert.ok(interiorElev < 0, `Interior floor elevation must be negative, got ${interiorElev}`);

  terrain.dispose();
});

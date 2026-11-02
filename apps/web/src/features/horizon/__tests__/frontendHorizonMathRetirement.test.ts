import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Task 4.5 scan gate (spec: Frontend Horizon Math Retirement): the horizon
 * feature path must not import or execute frontend horizon-profile generation,
 * local terrain horizon lookup, or frontend lunar ephemeris computation.
 * The 2D horizon view consumes the backend curated horizon profile
 * (POST /api/v1/horizons) plus the shared scenario model's conditions.
 */

const HORIZON_DIR = new URL('..', import.meta.url).pathname;

const FORBIDDEN_MODULES = [
  '@/domain/celestial/horizonProfile', // generateTopocentricHorizonRadar
  '@/domain/celestial/ephemeris', // calculateLunarEphemeris
  '@/domain/celestial/terrainHorizon', // getLocalTerrainHorizonDeg
  '@/domain/ephemeris/finiteSolarDisk', // frontend depressed-horizon + solar-disk math
];

const FORBIDDEN_IDENTIFIERS = [
  'generateTopocentricHorizonRadar',
  'getLocalTerrainHorizonDeg',
  'calculateLunarEphemeris',
  'computeVisibleSolarDiskFraction',
  'computeDepressedHorizonProfile',
];

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue; // tests may reference the names as fixtures
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

test('scan gate: horizon feature path imports no frontend horizon/ephemeris math modules', () => {
  const violations: string[] = [];
  for (const file of collectSourceFiles(HORIZON_DIR)) {
    const source = readFileSync(file, 'utf8');
    for (const moduleSpecifier of FORBIDDEN_MODULES) {
      if (new RegExp(`from\\s+['"]${moduleSpecifier.replace(/[*/]/g, '\\$&')}['"]`).test(source)) {
        violations.push(`${file}: imports ${moduleSpecifier}`);
      }
    }
  }
  assert.deepEqual(violations, [], `frontend horizon math imports found:\n${violations.join('\n')}`);
});

test('scan gate: horizon feature path never references the retired math entry points', () => {
  const violations: string[] = [];
  for (const file of collectSourceFiles(HORIZON_DIR)) {
    const source = readFileSync(file, 'utf8');
    for (const identifier of FORBIDDEN_IDENTIFIERS) {
      if (source.includes(identifier)) {
        violations.push(`${file}: references ${identifier}`);
      }
    }
  }
  assert.deepEqual(violations, [], `retired frontend math referenced:\n${violations.join('\n')}`);
});

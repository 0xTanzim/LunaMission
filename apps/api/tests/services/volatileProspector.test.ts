import test from 'node:test';
import assert from 'node:assert/strict';
import { prospectVolatilesAtCoordinates } from '@server/services/volatiles/volatileProspector';

test('Volatile Prospector: evaluates cryogenic cold trap inside Shackleton crater PSR', () => {
  // Center of Shackleton crater floor (-89.68°, 125.0°)
  const result = prospectVolatilesAtCoordinates(-89.68, 125.0);

  assert.equal(result.isPsr, true);
  // Diviner temperature in deep polar PSR must be below 110K (volatile retention threshold)
  assert.ok(result.divinerTempKelvin < 110);
  assert.ok(result.divinerTempKelvin >= 40);
  assert.equal(result.sublimationStability, 'perennially_stable');

  // LEND hydrogen concentration should be elevated
  assert.ok(result.hydrogenWeightPct >= 0.15);
  assert.ok(result.waterEquivalentHydrogenPct >= 1.0);
  assert.ok(result.estimatedIceDensityKgPerM3 > 15);
  assert.ok(result.iceYieldMetricTonsPerHectare > 150);
  assert.equal(result.temperatureCategory, 'cryogenic_cold_trap');
  assert.ok(result.isruFeasibilityScore > 50);
});

test('Volatile Prospector: evaluates illuminated massif ridge on Mons Mouton', () => {
  // Mons Mouton summit (-84.40°, 33.70°)
  const result = prospectVolatilesAtCoordinates(-84.40, 33.70);

  assert.equal(result.isPsr, false);
  // Temperature on sunlit plateau exceeds the 110K water-ice sublimation boundary
  assert.ok(result.divinerTempKelvin > 110);
  assert.equal(result.sublimationStability, 'rapidly_sublimating');
  assert.ok(result.hydrogenWeightPct < 0.15);
  assert.ok(result.estimatedIceDensityKgPerM3 < 15);
  assert.equal(result.temperatureCategory, 'illuminated_regolith');
});

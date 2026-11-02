import test from 'node:test';
import assert from 'node:assert/strict';
import {
  synthesizeMissionDossier,
  validateDossierInput,
  type DossierInput,
} from '@server/services/dossier/missionDossierModel';

const TEST_EPOCH = Date.parse('2026-10-21T12:00:00Z');

test('validateDossierInput validates correct south-polar mission inputs', () => {
  const valid: DossierInput = {
    targetName: 'Shackleton Rim Alpha',
    latitudeDeg: -89.5,
    longitudeDeg: 120.0,
    epochMs: TEST_EPOCH,
  };
  const result = validateDossierInput(valid);
  assert.equal(result.isValid, true);
});

test('validateDossierInput rejects coordinates outside lunar south-polar region', () => {
  const result = validateDossierInput({
    targetName: 'Equator Point',
    latitudeDeg: 0.0,
    longitudeDeg: 50.0,
    epochMs: TEST_EPOCH,
  });
  assert.equal(result.isValid, false);
  assert.ok(result.error?.includes('South-polar region'));
});

test('validateDossierInput rejects non-finite epoch or coordinates', () => {
  assert.equal(validateDossierInput({
    targetName: 'Invalid',
    latitudeDeg: NaN,
    longitudeDeg: 0,
    epochMs: TEST_EPOCH,
  }).isValid, false);

  assert.equal(validateDossierInput({
    targetName: 'Invalid',
    latitudeDeg: -85.0,
    longitudeDeg: 0,
    epochMs: NaN,
  }).isValid, false);
});

test('synthesizeMissionDossier generates complete aerospace dossier for catalog candidate', () => {
  const dossier = synthesizeMissionDossier({
    targetName: 'Shackleton Connecting Ridge',
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    epochMs: TEST_EPOCH,
    telecomBand: 'xBandDownlink',
  });

  assert.ok(dossier.id.startsWith('dossier-'));
  assert.equal(dossier.site.name, 'Shackleton Connecting Ridge');
  assert.equal(dossier.site.iauFrame, 'MOON_ME_DE421');
  assert.equal(dossier.site.demSource, 'NASA LOLA 128ppd / 20m');

  // Illumination
  assert.ok(typeof dossier.illumination.sunElevationDeg === 'number');
  assert.ok(typeof dossier.illumination.sunAzimuthDeg === 'number');
  assert.ok(typeof dossier.illumination.continuousSunlightHours === 'number');
  assert.ok(typeof dossier.illumination.solarGrazingWarning === 'boolean');

  // Telecom & DSN
  assert.ok(typeof dossier.telecom.earthElevationDeg === 'number');
  assert.ok(typeof dossier.telecom.freeSpacePathLossDb === 'number');
  assert.ok(typeof dossier.telecom.linkMarginDb === 'number');
  assert.ok(
    dossier.telecom.activeDsnStation.includes('DSS-') ||
    dossier.telecom.activeDsnStation === 'None (Occulted)'
  );

  // Volatiles & ISRU
  assert.ok(typeof dossier.volatiles.hydrogenWeightPct === 'number');
  assert.ok(typeof dossier.volatiles.divinerTempKelvin === 'number');
  assert.ok(typeof dossier.volatiles.waterIceYieldKgPerM3 === 'number');
  assert.ok(['High', 'Moderate', 'Marginal', 'None'].includes(dossier.volatiles.isruViabilityTier));

  // Benchmark against nearest Artemis site
  assert.ok(dossier.benchmark !== undefined);
  assert.ok(typeof dossier.benchmark?.feasibilityScore === 'number');
});

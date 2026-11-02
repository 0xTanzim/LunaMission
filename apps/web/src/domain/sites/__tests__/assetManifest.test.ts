import test from 'node:test';
import assert from 'node:assert/strict';
import { LUNAR_ASSET_MANIFEST } from '../assetManifest';

test('Asset Manifest: All entries use IAU 2000 Moon Mean Earth coordinate frame', () => {
  const entries = Object.values(LUNAR_ASSET_MANIFEST);
  assert.ok(entries.length >= 3, 'Must contain at least LOLA regional, LOLA site, and LROC NAC entries');

  entries.forEach((entry) => {
    assert.equal(
      entry.coordinateReferenceFrame,
      'IAU/IAG 2000 Moon Mean Earth/Polar Axis',
      `${entry.id} must strictly use IAU 2000 ME frame`,
    );
    assert.equal(
      entry.longitudeConvention,
      '0° to 360° East-positive',
      `${entry.id} must adhere to East-positive longitude convention`,
    );
    assert.equal(
      entry.verticalDatum,
      'Mean Lunar Sphere R = 1737.4 km',
      `${entry.id} must use R = 1737.4 km vertical datum`,
    );
    assert.ok(entry.checksum.startsWith('sha256:'), `${entry.id} must have a valid sha256 checksum`);
    assert.ok(entry.limitations.length > 10, `${entry.id} must have documented scientific limitations`);
  });
});

test('Asset Manifest: Distinguishes regional LOLA from high-resolution pilot DEM', () => {
  const regionalDem = LUNAR_ASSET_MANIFEST['lola-dem-polar-128ppd'];
  assert.ok(regionalDem, 'Regional LOLA 128ppd entry must exist');
  assert.ok(regionalDem.horizontalPixelSpacing.includes('237.2 m/pixel'));
  assert.equal(regionalDem.validationStatus, 'Verified');

  const localDem = LUNAR_ASSET_MANIFEST['lola-dem-shackleton-local-20m'];
  assert.ok(localDem, 'Local Shackleton pilot DEM entry must exist');
  assert.ok(localDem.horizontalPixelSpacing.includes('20.0 m/pixel'));
  assert.equal(localDem.validationStatus, 'Verified');
});

test('Asset Manifest: Radiometric imagery does not claim vertical elevation accuracy', () => {
  const lrocMosaic = LUNAR_ASSET_MANIFEST['lroc-nac-polar-mosaic'];
  assert.ok(lrocMosaic);
  assert.equal(lrocMosaic.verticalAccuracy, 'Unknown', 'Imagery must mark vertical elevation accuracy as Unknown');
});

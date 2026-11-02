import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCHIVAL_ORBITAL_IMAGES, getArchivalImagesForSite } from '../imageryGallery';

test('Imagery Gallery: All entries have verified product IDs and ISO UTC timestamps', () => {
  assert.ok(ARCHIVAL_ORBITAL_IMAGES.length >= 3);

  ARCHIVAL_ORBITAL_IMAGES.forEach((img) => {
    assert.ok(img.productId.length > 5, `${img.id} must have a valid PDS product ID`);
    assert.ok(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(img.observationEpochIsoUtc),
      `${img.id} must have a valid ISO UTC timestamp`,
    );
    assert.ok(img.groundResolutionMetersPerPixel > 0, `${img.id} must have positive ground resolution`);
    assert.ok(
      img.isArchiveNotice.includes('Archival observation'),
      `${img.id} must disclose archival nature and prevent live feed misinterpretation`,
    );
  });
});

test('Imagery Gallery: Shackleton pilot site has both LROC NAC and ShadowCam insets', () => {
  const shackletonImages = getArchivalImagesForSite('shackleton-rim');
  assert.ok(shackletonImages.length >= 2, 'Shackleton must have at least 2 orbital observations');

  const nacImage = shackletonImages.find((img) => img.type === 'lroc-nac-context');
  assert.ok(nacImage, 'Must have LROC NAC surface context image');

  const shadowCamImage = shackletonImages.find((img) => img.type === 'shadowcam-psr-inset');
  assert.ok(shadowCamImage, 'Must have NASA ShadowCam low-light PSR observation');
  assert.equal(shadowCamImage.instrument, 'NASA ShadowCam');
});

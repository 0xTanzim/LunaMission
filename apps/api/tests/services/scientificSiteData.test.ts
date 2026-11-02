import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_SITES } from '@server/data/catalog';
import {
  SCIENTIFIC_SITE_INVESTIGATIONS,
  getScientificSiteInvestigation,
} from '@server/data/scientificSiteData';

test('Scientific Site Data: Every catalog candidate site has a complete scientific investigation record', () => {
  for (const site of CANDIDATE_SITES) {
    const record = getScientificSiteInvestigation(site.id);
    assert.ok(record, `Missing scientific site record for site id: ${site.id}`);
    assert.equal(record.id, site.id);
    assert.equal(record.code, site.code);
    assert.ok(record.name.length > 0);
  }
});

test('Scientific Site Data: Coordinates match catalog and physical selenographic boundaries', () => {
  for (const site of CANDIDATE_SITES) {
    const record = getScientificSiteInvestigation(site.id)!;
    assert.ok(record, `Expected investigation record for ${site.id}`);
    assert.equal(record.coordinates.latitudeDeg, site.coordinates.latitudeDeg);
    assert.equal(record.coordinates.longitudeDeg, site.coordinates.longitudeDeg);
    assert.ok(record.coordinates.latitudeDeg <= 90.0 && record.coordinates.latitudeDeg >= -90.0);
    assert.ok(record.coordinates.longitudeDeg >= 0 && record.coordinates.longitudeDeg <= 360.0);
    assert.ok(record.coordinates.elevationMeters > -7000 && record.coordinates.elevationMeters < 8000);
  }
});

test('Scientific Site Data: Topography, slope, and elevation profiles are physically consistent', () => {
  const shackleton = SCIENTIFIC_SITE_INVESTIGATIONS['shackleton-rim'];
  assert.ok(shackleton);
  assert.equal(shackleton.topography.summitElevationMeters, 4250);
  assert.equal(shackleton.topography.craterFloorElevationMeters, -4200);
  assert.equal(shackleton.topography.reliefSpanMeters, 8450);
  assert.ok(shackleton.topography.meanSlopeDeg < shackleton.topography.maxSlopeDeg);
  assert.ok(shackleton.topography.elevationProfile.length >= 4);

  // Assert all sites have traversable percentage between 0 and 100
  for (const record of Object.values(SCIENTIFIC_SITE_INVESTIGATIONS)) {
    assert.ok(record.topography.traversableSlopePercentage >= 0 && record.topography.traversableSlopePercentage <= 100);
    assert.ok(record.topography.elevationUncertaintyMeters > 0);
  }
});

test('Scientific Site Data: Geology, illumination, and resources have authoritative citations and transparent qualifications', () => {
  for (const record of Object.values(SCIENTIFIC_SITE_INVESTIGATIONS)) {
    assert.ok(record.geology.stratigraphicUnitCode.length > 0);
    assert.ok(record.geology.sourceCitation.length > 0);
    assert.ok(record.illuminationThermal.annualSolarExposurePercentage > 0 && record.illuminationThermal.annualSolarExposurePercentage <= 100);
    assert.ok(record.illuminationThermal.minimumShadowTemperatureKelvin < record.illuminationThermal.peakSummerTemperatureKelvin);
    assert.ok(record.resources.primaryInstrumentSources.length > 0);
    assert.ok(record.resources.cautionaryNotice.length > 0);
    assert.ok(record.missionConstraints.identifiedHazards.length > 0);
    assert.ok(record.dataProvenance.lolaDemProduct.includes('LOLA'));
  }
});

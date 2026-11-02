import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFreeSpacePathLoss,
  calculateRfLinkBudget,
  calculateDsnStationVisibilities,
  determineActiveDsnStation,
  FREQUENCY_BANDS,
  DSN_COMPLEXES,
} from '@server/services/telecom/linkBudget';

test('Free Space Path Loss: computes physically correct FSPL at nominal lunar distance', () => {
  const nominalDistanceKm = 384400; // Mean Earth-Moon distance
  const xBandFreqGhz = FREQUENCY_BANDS.xBandDownlink.frequencyGhz; // 8.45 GHz

  const fsplX = calculateFreeSpacePathLoss(nominalDistanceKm, xBandFreqGhz);
  // Theoretical FSPL: 20 * log10(384400) + 20 * log10(8.45) + 92.45 ~= 222.68 dB
  assert.ok(fsplX > 222.0 && fsplX < 223.5, `Expected FSPL ~222.68 dB, got ${fsplX}`);

  const kaBandFreqGhz = FREQUENCY_BANDS.kaBandDownlink.frequencyGhz; // 32.0 GHz
  const fsplKa = calculateFreeSpacePathLoss(nominalDistanceKm, kaBandFreqGhz);
  // Theoretical Ka-band FSPL is higher by 20 * log10(32 / 8.45) ~= 11.56 dB -> ~234.24 dB
  assert.ok(fsplKa > 233.5 && fsplKa < 235.0, `Expected Ka-band FSPL ~234.24 dB, got ${fsplKa}`);
  assert.ok(fsplKa > fsplX, 'Ka-band path loss must exceed X-band');
});

test('RF Link Budget: calculates healthy positive link margin when Earth is visible', () => {
  const budget = calculateRfLinkBudget({
    earthDistanceKm: 384400,
    earthElevationDeg: 12.5, // Well above horizon
    isTerrainObstructed: false,
    band: 'xBandDownlink',
    transmitterPowerWatts: 15, // 15W HGA
    dataRateMbps: 2.0, // 2 Mbps telemetry & video
  });

  assert.equal(budget.linkState, 'locked');
  assert.ok(budget.receivedPowerDbm < -70 && budget.receivedPowerDbm > -120);
  assert.ok(budget.ebN0Db > 5.0, 'Eb/N0 should exceed required threshold');
  assert.ok(budget.linkMarginDb > 3.0, 'Link margin should exceed +3.0 dB safety threshold');
  assert.equal(budget.multipathWarning, false);
});

test('RF Link Budget: warns of multipath diffraction when Earth is grazing (<2.0 deg)', () => {
  const budget = calculateRfLinkBudget({
    earthDistanceKm: 384400,
    earthElevationDeg: 1.2, // Grazing crater rim
    isTerrainObstructed: false,
    band: 'xBandDownlink',
    transmitterPowerWatts: 15,
    dataRateMbps: 2.0,
  });

  assert.equal(budget.multipathWarning, true);
  assert.ok(budget.linkMarginDb > 0, 'Link is still positive but penalized');
});

test('RF Link Budget: reports loss of signal when Earth is sub-horizon or obstructed', () => {
  const budget = calculateRfLinkBudget({
    earthDistanceKm: 384400,
    earthElevationDeg: -0.5, // Below horizon
    isTerrainObstructed: true,
    band: 'xBandDownlink',
    transmitterPowerWatts: 15,
    dataRateMbps: 2.0,
  });

  assert.equal(budget.linkState, 'loss_of_signal');
  assert.equal(budget.linkMarginDb, -Infinity);
});

test('DSN Complex Tracking: evaluates visibility and handovers across Earth rotation', () => {
  const epoch2026 = Date.UTC(2026, 9, 26, 12, 0, 0); // Oct 26, 2026 12:00 UTC
  const moonSubEarthLon = 0.0; // Sub-Earth longitude
  const moonSubEarthLat = -1.5;

  const visibilities = calculateDsnStationVisibilities(epoch2026, moonSubEarthLon, moonSubEarthLat);
  assert.equal(visibilities.length, 3);

  const stations = visibilities.map((v) => v.stationId);
  assert.deepEqual(stations.sort(), ['canberra', 'goldstone', 'madrid'].sort());

  const active = determineActiveDsnStation(visibilities);
  assert.ok(active !== null);
  assert.ok(['goldstone', 'madrid', 'canberra'].includes(active.stationId));
  assert.ok(active.elevationDeg >= 10.0, 'Active DSN dish must be above 10 deg mask');
});

test('RF Link Budget: calculates S-band low-data-rate emergency telemetry link margin', () => {
  const budget = calculateRfLinkBudget({
    earthDistanceKm: 384400,
    earthElevationDeg: 8.0,
    isTerrainObstructed: false,
    band: 'sBandDownlink',
    transmitterPowerWatts: 5, // 5W emergency omni/medium-gain
    dataRateMbps: 0.05, // 50 kbps critical voice/telemetry
  });

  assert.equal(budget.linkState, 'locked');
  assert.ok(budget.linkMarginDb > 6.0, 'Low bit rate provides generous link margin');
});

test('DSN Complex Tracking: hands over ground station as Earth rotates 12 hours later', () => {
  const epochA = Date.UTC(2026, 9, 26, 6, 0, 0); // 06:00 UTC
  const epochB = Date.UTC(2026, 9, 26, 18, 0, 0); // 18:00 UTC (12 hours later)
  const moonSubEarthLon = 0.0;
  const moonSubEarthLat = -1.5;

  const visA = calculateDsnStationVisibilities(epochA, moonSubEarthLon, moonSubEarthLat);
  const visB = calculateDsnStationVisibilities(epochB, moonSubEarthLon, moonSubEarthLat);

  const activeA = determineActiveDsnStation(visA);
  const activeB = determineActiveDsnStation(visB);

  assert.ok(activeA !== null);
  assert.ok(activeB !== null);
  // In a 12 hour span, Earth rotates 180 degrees, switching the primary DSN station
  assert.notEqual(activeA.stationId, activeB.stationId);
});

import { describe, expect, test } from 'bun:test';
import {
  calculateDsnOperatingNoiseTemperature,
  calculateDsnLinkBudget810,
  DSN_STATION_ANTENNAS,
} from '@server/services/telecom/dsn810Link';

describe('DSN 810-005 Elevation Noise Temperature & Link Budget', () => {
  test('exposes Module 101/104 ground antenna parameters (34m BWG and 70m)', () => {
    const bwg = DSN_STATION_ANTENNAS['34m-bwg'];
    expect(bwg.diameterMeters).toBe(34.0);
    expect(bwg.gainXbandDbi).toBeCloseTo(68.3, 1);
    expect(bwg.gainKabandDbi).toBeCloseTo(78.8, 1);

    const m70 = DSN_STATION_ANTENNAS['70m'];
    expect(m70.diameterMeters).toBe(70.0);
    expect(m70.gainXbandDbi).toBeCloseTo(74.4, 1);
  });

  test('computes elevation-dependent Top noise temperature (zenith vs 10° low elevation)', () => {
    // 34m BWG at Zenith (90°)
    const topZenith = calculateDsnOperatingNoiseTemperature('34m-bwg', 'x-band', 90.0);
    expect(topZenith).toBeGreaterThanOrEqual(18.0);
    expect(topZenith).toBeLessThanOrEqual(25.0);

    // 34m BWG at low elevation (10°) has significantly higher noise due to atmospheric path
    const topLow = calculateDsnOperatingNoiseTemperature('34m-bwg', 'x-band', 10.0);
    expect(topLow).toBeGreaterThan(topZenith + 8.0);
  });

  test('calculates complete C/N0 and margin with ITU knife-edge diffraction loss', () => {
    // Standard X-band downlink: 15W transmitter (+11.76 dBW), 12 dBi lunar horn antenna, 34m BWG at 25° elev
    const linkClear = calculateDsnLinkBudget810({
      stationType: '34m-bwg',
      band: 'x-band',
      earthElevationDeg: 25.0,
      transmitterPowerWatts: 15.0,
      txAntennaGainDbi: 12.0,
      diffractionLossDb: 0.0,
      dataRateBps: 2e6, // 2 Mbps
      earthDistanceKm: 384400,
    });

    expect(linkClear.carrierToNoiseRatioC_N0).toBeGreaterThan(60.0);
    expect(linkClear.linkMarginDb).toBeGreaterThan(3.0);
    expect(linkClear.isLinkViable).toBe(true);

    // Same link with 10.5 dB terrain diffraction loss
    const linkDiffracted = calculateDsnLinkBudget810({
      stationType: '34m-bwg',
      band: 'x-band',
      earthElevationDeg: 25.0,
      transmitterPowerWatts: 15.0,
      txAntennaGainDbi: 12.0,
      diffractionLossDb: 10.5,
      dataRateBps: 2e6,
      earthDistanceKm: 384400,
    });

    expect(linkDiffracted.linkMarginDb).toBeCloseTo(linkClear.linkMarginDb - 10.5, 1);
  });
});

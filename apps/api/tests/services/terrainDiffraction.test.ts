import { describe, expect, test } from 'bun:test';
import {
  calculateKnifeEdgeDiffractionLossDb,
  calculateFresnelParameterNu,
  calculateDsnOperatingNoiseTemperatureK,
  calculateDownlinkLinkMarginDb,
} from '@server/services/telecom/terrainDiffraction';

describe('ITU-R P.526-16 Knife-Edge Diffraction & DSN 810-005 Link Budget (Task 1.3)', () => {
  test('evaluates exact ITU-R P.526-16 knife-edge diffraction loss benchmark values', () => {
    // When nu = 0 (tangent ray to obstacle crest) -> J(0) = 6.02 dB (within 0.05 dB)
    const lossGrazing = calculateKnifeEdgeDiffractionLossDb(0.0);
    expect(lossGrazing).toBeCloseTo(6.02, 1);

    // When nu = 0.531 -> J(0.531) = 10.53 dB (within 0.05 dB)
    const lossHalfWave = calculateKnifeEdgeDiffractionLossDb(0.531);
    expect(lossHalfWave).toBeCloseTo(10.53, 1);

    // Clear line-of-sight nu <= -0.78 produces 0 dB loss
    const lossClear = calculateKnifeEdgeDiffractionLossDb(-1.0);
    expect(lossClear).toBe(0.0);
  });

  test('calculates Fresnel parameter nu from obstacle geometry and RF frequency', () => {
    const obstacleHeightM = 50.0;
    const distanceM = 10000.0; // 10 km
    const frequencyHz = 8.45e9; // X-band
    const nu = calculateFresnelParameterNu(obstacleHeightM, distanceM, frequencyHz);

    expect(nu).toBeGreaterThan(0);
    expect(Number.isFinite(nu)).toBe(true);
  });

  test('computes elevation-dependent DSN antenna system operating noise temperature T_op', () => {
    // At low elevation (5 deg), atmospheric absorption and ground spillover increase noise temperature
    const topLowEl = calculateDsnOperatingNoiseTemperatureK('34m-bwg', 'x-band', 5.0);
    // At high elevation (60 deg), noise temperature approaches zenith minimum
    const topHighEl = calculateDsnOperatingNoiseTemperatureK('34m-bwg', 'x-band', 60.0);

    expect(topLowEl).toBeGreaterThan(topHighEl);
    expect(topHighEl).toBeGreaterThan(20.0); // Above 34m zenith baseline of 20K
  });

  test('calculates end-to-end DSN link margin accounting for terrain diffraction loss', () => {
    const marginUnobstructed = calculateDownlinkLinkMarginDb({
      stationType: '34m-bwg',
      band: 'x-band',
      earthElevationDeg: 15.0,
      transmitterPowerWatts: 20.0,
      txAntennaGainDbi: 18.0,
      diffractionLossDb: 0.0,
      dataRateBps: 100000,
    });

    const marginDiffracted = calculateDownlinkLinkMarginDb({
      stationType: '34m-bwg',
      band: 'x-band',
      earthElevationDeg: 15.0,
      transmitterPowerWatts: 20.0,
      txAntennaGainDbi: 18.0,
      diffractionLossDb: 6.02,
      dataRateBps: 100000,
    });

    expect(marginUnobstructed).toBeGreaterThan(marginDiffracted);
    expect(marginUnobstructed - marginDiffracted).toBeCloseTo(6.02, 1);
  });
});

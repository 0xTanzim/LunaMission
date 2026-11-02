import { describe, expect, test } from 'bun:test';
import {
  computeFresnelParameter,
  computeKnifeEdgeDiffractionLossDb,
  computeDiffractionPowerFraction,
  SPEED_OF_LIGHT_M_PER_S,
} from '@server/services/telecom/ituDiffraction';

describe('ITU-R P.526-16 Knife-Edge Diffraction Propagation', () => {
  test('computes wavelength and Fresnel-Kirchhoff parameter nu correctly', () => {
    // X-band 8.4 GHz, obstacle height h = 0 (exact grazing), d1 = 2000m
    const nuGrazing = computeFresnelParameter(0.0, 2000, 8.4e9);
    expect(nuGrazing).toBe(0.0);

    // X-band, obstacle penetrates LOS by h = 10m at d1 = 2000m
    const nuOccluded = computeFresnelParameter(10.0, 2000, 8.4e9);
    expect(nuOccluded).toBeGreaterThan(0.0);
  });

  test('matches ITU-R P.526-16 golden loss benchmarks within 0.1 dB', () => {
    // Golden benchmark 1: Exact grazing line of sight (nu = 0.0) -> J(0) = 6.02 dB
    const j0 = computeKnifeEdgeDiffractionLossDb(0.0);
    expect(j0).toBeCloseTo(6.02, 1);

    // Golden benchmark 2: nu = 0.531 -> J(0.531) = 10.53 dB
    const j0531 = computeKnifeEdgeDiffractionLossDb(0.531);
    expect(j0531).toBeCloseTo(10.53, 1);

    // Golden benchmark 3: nu = 1.0 -> J(1.0) = 13.9 dB
    const j1 = computeKnifeEdgeDiffractionLossDb(1.0);
    expect(j1).toBeCloseTo(13.9, 1);

    // Clear line of sight (nu <= -0.78) -> 0.0 dB loss
    const jClear = computeKnifeEdgeDiffractionLossDb(-1.5);
    expect(jClear).toBe(0.0);
  });

  test('computes delivered power fraction: 25.0% at grazing, near zero in deep shadow', () => {
    // J(0) = 6.02 dB corresponds to 25.0% transmitted power delivered
    const fracGrazing = computeDiffractionPowerFraction(0.0);
    expect(fracGrazing).toBeCloseTo(0.25, 2);

    const fracClear = computeDiffractionPowerFraction(-1.0);
    expect(fracClear).toBe(1.0);

    const fracDeepShadow = computeDiffractionPowerFraction(5.0);
    expect(fracDeepShadow).toBeLessThan(0.005);
  });
});

import { describe, expect, test } from 'bun:test';
import {
  computeVisibleSolarDiskFraction,
  computeMastHeightHorizonDepressionDeg,
  computeDepressedHorizonProfile,
  computeEffectiveSolarIrradiance,
  SOLAR_DISK_RADIUS_DEG,
  SOLAR_CONSTANT_W_PER_M2,
} from '@/domain/ephemeris/finiteSolarDisk';

describe('Finite Solar Disk & Mast-Height Horizon Depression', () => {
  test('exposes the standard solar disk radius (0.266°)', () => {
    expect(SOLAR_DISK_RADIUS_DEG).toBeCloseTo(0.266, 3);
  });

  test('calculates visible solar fraction: 1.0 when completely clear, 0.0 when completely occluded', () => {
    const clearFraction = computeVisibleSolarDiskFraction(1.0, 0.0);
    expect(clearFraction).toBe(1.0);

    const occludedFraction = computeVisibleSolarDiskFraction(-1.0, 0.0);
    expect(occludedFraction).toBe(0.0);
  });

  test('calculates non-zero penumbral illumination when disk center is on horizon (Δα = 0)', () => {
    const halfFraction = computeVisibleSolarDiskFraction(0.0, 0.0);
    expect(halfFraction).toBeCloseTo(0.5, 2);

    const partialQuarter = computeVisibleSolarDiskFraction(-0.133, 0.0);
    expect(partialQuarter).toBeGreaterThan(0.0);
    expect(partialQuarter).toBeLessThan(0.5);

    const partialThreeQuarters = computeVisibleSolarDiskFraction(0.133, 0.0);
    expect(partialThreeQuarters).toBeGreaterThan(0.5);
    expect(partialThreeQuarters).toBeLessThan(1.0);
  });

  test('computes near-field horizon depression as a function of mast height (up to 40m)', () => {
    const depressionHls = computeMastHeightHorizonDepressionDeg(40.0, 500);
    expect(depressionHls).toBeGreaterThan(4.0);
    expect(depressionHls).toBeLessThan(5.0);

    const depressionRover = computeMastHeightHorizonDepressionDeg(2.0, 500);
    expect(depressionRover).toBeGreaterThan(0.2);
    expect(depressionRover).toBeLessThan(0.3);

    expect(computeMastHeightHorizonDepressionDeg(0.0, 500)).toBe(0.0);
  });

  test('computes depressed horizon profile across azimuthal samples', () => {
    const rawHorizonDeg = [2.0, 3.5, 1.2, 0.5];
    const rangeMeters = [1000, 2000, 500, 1500];

    const depressed = computeDepressedHorizonProfile(rawHorizonDeg, rangeMeters, 10.0);
    expect(depressed.length).toBe(4);
    for (let i = 0; i < depressed.length; i++) {
      expect(depressed[i]).toBeLessThan(rawHorizonDeg[i]);
    }
  });

  test('evaluates eccentricity-corrected solar irradiance and penumbral scaling', () => {
    const fluxFull = computeEffectiveSolarIrradiance(1.0, 1.0);
    expect(fluxFull).toBeCloseTo(SOLAR_CONSTANT_W_PER_M2, 1);

    const fluxHalf = computeEffectiveSolarIrradiance(0.5, 1.0);
    expect(fluxHalf).toBeCloseTo(SOLAR_CONSTANT_W_PER_M2 * 0.5, 1);
  });
});

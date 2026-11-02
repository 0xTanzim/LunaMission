import { describe, expect, test } from 'bun:test';
import {
  computeSurfaceEquilibriumTemp,
  evaluateThermalRadiatorOnSlope,
  evaluateCryogenicHazard,
  computeConductiveThermalDrop,
  STEFAN_BOLTZMANN,
} from '../divinerThermal';

describe('Diviner Radiative-Conductive Thermal Environment', () => {
  test('exports standard Stefan-Boltzmann constant', () => {
    expect(STEFAN_BOLTZMANN).toBeCloseTo(5.670374e-8, 12);
  });

  test('computes sunlit equilibrium temperature in equatorial noon and polar grazing conditions', () => {
    // Direct overhead sun (incidence 0°), 1361 W/m^2
    const noon = computeSurfaceEquilibriumTemp({
      solarIncidenceAngleDeg: 0,
      solarFluxWm2: 1361,
      emissivity: 0.95,
      albedo: 0.12,
    });
    // Peak lunar daytime ~390 K to 395 K
    expect(noon.temperatureK).toBeGreaterThan(385);
    expect(noon.temperatureK).toBeLessThan(400);

    // Polar grazing sun: Mons Mouton Plateau (solar elevation 9.02° -> incidence 80.98°)
    const grazing = computeSurfaceEquilibriumTemp({
      solarIncidenceAngleDeg: 80.98,
      solarFluxWm2: 1361,
      emissivity: 0.95,
      albedo: 0.20,
    });
    // Polar sunlit temp ~200 K to 240 K
    expect(grazing.temperatureK).toBeGreaterThan(190);
    expect(grazing.temperatureK).toBeLessThan(240);
  });

  test('identifies PSR cryogenic freeze hazard when temperature drops below 40 K', () => {
    // In deep shadow with negligible terrain IR (0.10 W/m^2)
    const psrCold = computeSurfaceEquilibriumTemp({
      solarIncidenceAngleDeg: 90,
      solarFluxWm2: 0,
      scatteredTerrainIRWm2: 0.10,
      emissivity: 0.95,
    });
    expect(psrCold.temperatureK).toBeLessThan(40);

    const hazard = evaluateCryogenicHazard({
      surfaceTempK: psrCold.temperatureK,
      landerAreaM2: 5.0,
      minOperatingTempK: 250,
      emissivity: 0.85,
    });

    expect(hazard.isCryogenicHazard).toBe(true);
    expect(hazard.freezeAlertLevel).toBe('CRITICAL');
    expect(hazard.auxiliaryHeaterPowerWatts).toBeGreaterThan(900);
  });

  test('does not flag cryogenic hazard in warm areas (>100 K)', () => {
    const hazard = evaluateCryogenicHazard({
      surfaceTempK: 150,
      landerAreaM2: 5.0,
      minOperatingTempK: 250,
      emissivity: 0.85,
    });

    expect(hazard.isCryogenicHazard).toBe(false);
    expect(hazard.freezeAlertLevel).toBe('NOMINAL');
  });
});

describe('Lander Radiator Slope View-Factor Degradation', () => {
  test('calculates view factor and thermal rejection on flat ground', () => {
    const flat = evaluateThermalRadiatorOnSlope({
      slopeAngleDeg: 0,
      radiatorTempK: 280,
      terrainTempK: 220,
    });

    expect(flat.terrainViewFactor).toBe(0);
    expect(flat.rejectionEfficiency).toBe(1.0);
    expect(flat.degradedHeatRejectionRatio).toBe(1.0);
  });

  test('degrades radiator heat rejection on 10° and 20° crater slopes', () => {
    const slope10 = evaluateThermalRadiatorOnSlope({
      slopeAngleDeg: 10,
      radiatorTempK: 280,
      terrainTempK: 220,
    });
    const slope20 = evaluateThermalRadiatorOnSlope({
      slopeAngleDeg: 20,
      radiatorTempK: 280,
      terrainTempK: 220,
    });

    expect(slope10.terrainViewFactor).toBeGreaterThan(0);
    expect(slope20.terrainViewFactor).toBeGreaterThan(slope10.terrainViewFactor);
    expect(slope10.degradedHeatRejectionRatio).toBeLessThan(1.0);
    expect(slope20.degradedHeatRejectionRatio).toBeLessThan(slope10.degradedHeatRejectionRatio);
    expect(slope20.degradedHeatRejectionRatio).toBeGreaterThan(0.8);
  });
});

describe('Regolith Thermal Conductivity Asymmetric Sensitivity', () => {
  test('verifies asymmetric scaling: -25% k gives 1.33x deltaT, +25% k gives 0.80x deltaT', () => {
    const baseline = computeConductiveThermalDrop({
      heatFluxWm2: 10,
      thicknessM: 0.1,
      thermalConductivityWmK: 0.01,
    });

    const minus25 = computeConductiveThermalDrop({
      heatFluxWm2: 10,
      thicknessM: 0.1,
      thermalConductivityWmK: 0.01 * 0.75, // -25%
    });

    const plus25 = computeConductiveThermalDrop({
      heatFluxWm2: 10,
      thicknessM: 0.1,
      thermalConductivityWmK: 0.01 * 1.25, // +25%
    });

    expect(minus25.deltaT / baseline.deltaT).toBeCloseTo(1.333, 2);
    expect(plus25.deltaT / baseline.deltaT).toBeCloseTo(0.80, 2);
  });
});

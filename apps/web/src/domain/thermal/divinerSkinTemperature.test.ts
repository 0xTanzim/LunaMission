import { describe, expect, test } from 'bun:test';
import {
  calculateDivinerSkinTemperatureK,
  evaluateCryogenicFreezeWarning,
  calculateSlopeRadiatorDegradation,
  CRYOGENIC_FREEZE_THRESHOLD_KELVIN,
} from './divinerSkinTemperature';

describe('Diviner Equilibrium Skin Temperature & Thermal Sizing (Task 1.4)', () => {
  test('defines cryogenic freeze threshold as exactly 40.0 Kelvin', () => {
    expect(CRYOGENIC_FREEZE_THRESHOLD_KELVIN).toBe(40.0);
  });

  test('calculates radiative equilibrium temperature for subsolar vs grazing angles', () => {
    // Normal solar incidence (theta = 0 deg) yields high temperatures (~380K - 395K)
    const tNoon = calculateDivinerSkinTemperatureK({
      solarIncidenceAngleDeg: 0.0,
      solarConstantWm2: 1361.0,
      emissivity: 0.95,
      albedo: 0.12,
    });
    expect(tNoon).toBeGreaterThan(380);
    expect(tNoon).toBeLessThan(400);

    // Deep shadow / PSR (no solar flux, only geothermal 0.018 W/m2)
    const tPsr = calculateDivinerSkinTemperatureK({
      solarIncidenceAngleDeg: 90.0,
      solarConstantWm2: 0.0,
      geothermalHeatFluxWm2: 0.018,
      emissivity: 0.95,
      albedo: 0.12,
    });
    expect(tPsr).toBeLessThan(40.0); // Inside cryogenic freeze zone
    expect(tPsr).toBeGreaterThan(15.0);
  });

  test('flags cryogenic freeze warning and sizes auxiliary heater power in watts', () => {
    // Surface temperature inside PSR = 28 Kelvin
    const warning = evaluateCryogenicFreezeWarning({
      surfaceTemperatureK: 28.0,
      spacecraftRadiatorAreaM2: 2.5,
      minimumOperatingTempK: 250.0,
      emissivity: 0.85,
    });

    expect(warning.isCryogenicFreeze).toBe(true);
    expect(warning.alertLevel).toBe('CRITICAL');
    expect(warning.requiredHeaterPowerWatts).toBeGreaterThan(400);
    expect(Number.isFinite(warning.requiredHeaterPowerWatts)).toBe(true);
  });

  test('evaluates radiator view factor degradation on inclined 10 to 20 degree crater slopes', () => {
    const flatResult = calculateSlopeRadiatorDegradation(0.0, 300.0, 100.0);
    const slope15Result = calculateSlopeRadiatorDegradation(15.0, 300.0, 100.0);

    expect(flatResult.skyViewFactor).toBeCloseTo(1.0, 4);
    expect(flatResult.terrainViewFactor).toBeCloseTo(0.0, 4);

    expect(slope15Result.terrainViewFactor).toBeGreaterThan(0.01);
    expect(slope15Result.skyViewFactor).toBeLessThan(1.0);
    expect(slope15Result.rejectionEfficiency).toBeLessThan(flatResult.rejectionEfficiency);
  });
});

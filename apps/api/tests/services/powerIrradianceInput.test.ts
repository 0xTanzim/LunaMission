import { describe, expect, it } from 'bun:test';
import { computePowerBalance } from '@server/services/operations/powerBalance';
import type { PowerBalanceRequestInput, SolarPowerStepInput } from '@luna/contracts';

const T0 = Date.UTC(2026, 10, 1, 0, 0, 0);
const HOUR_MS = 3_600_000;

const parameters: PowerBalanceRequestInput['parameters'] = {
  solarArrayAreaM2: 2.5,
  arrayEfficiency: 0.3,
  batteryCapacityWh: 1000,
  depthOfDischargeLimit: 0.8,
  baseHotelLoadW: 0,
  payloadLoadW: 0,
  panelOrientation: { kind: 'horizontal' },
};

function step(overrides: Partial<SolarPowerStepInput> = {}): SolarPowerStepInput {
  return {
    startEpochMs: T0,
    endEpochMs: T0 + HOUR_MS,
    solarElevationDeg: 20,
    solarAzimuthDeg: 180,
    fractionalSolarDiskVisibility: 1,
    ...overrides,
  };
}

describe('Power balance: irradiance-weighted flux input', () => {
  it('prefers the limb-darkened fraction over the geometric one', () => {
    const geometricOnly = computePowerBalance({ parameters, steps: [step()] });
    const irradianceWeighted = computePowerBalance({
      parameters,
      steps: [step({ irradianceWeightedDiskFraction: 0.4 })],
    });

    expect(geometricOnly.steps[0]!.irradianceWeightedInputUsed).toBe(false);
    expect(irradianceWeighted.steps[0]!.irradianceWeightedInputUsed).toBe(true);

    const ratio =
      irradianceWeighted.steps[0]!.solarArrayOutputW / geometricOnly.steps[0]!.solarArrayOutputW;
    expect(ratio).toBeCloseTo(0.4, 6);
  });

  it('falls back to the geometric fraction only when the weighted field is absent', () => {
    const fallback = computePowerBalance({ parameters, steps: [step({ fractionalSolarDiskVisibility: 0.6 })] });
    expect(fallback.steps[0]!.irradianceWeightedInputUsed).toBe(false);
    expect(fallback.steps[0]!.irradianceWeightedDiskFraction).toBeUndefined();

    const weighted = computePowerBalance({
      parameters,
      steps: [step({ fractionalSolarDiskVisibility: 0.6, irradianceWeightedDiskFraction: 0.5 })],
    });
    expect(weighted.steps[0]!.irradianceWeightedInputUsed).toBe(true);
    expect(weighted.steps[0]!.irradianceWeightedDiskFraction).toBeCloseTo(0.5, 9);
  });
});

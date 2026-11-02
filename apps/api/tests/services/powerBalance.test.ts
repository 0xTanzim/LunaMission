import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  computePowerBalance,
  powerStepsFromEvaluatedSubIntervals,
  POWER_BALANCE_STEP_LIMIT,
} from '@server/services/operations/powerBalance';
import {
  POWER_MODEL_ASSUMPTIONS,
  POWER_MODEL_LIMITATIONS,
} from '@server/services/operations/powerModelAssumptions';
import {
  SOLAR_IRRADIANCE_AT_1_AU_W_PER_M2,
  powerBalanceResultSchema,
  type PowerBalanceRequestInput,
  type SolarPowerStepInput,
} from '@luna/contracts';

const T0 = Date.UTC(2026, 10, 1, 0, 0, 0);
const HOUR_MS = 3_600_000;

/** Base vehicle model used by most cases; all values are explicit mission inputs. */
function baseParameters(overrides: Partial<PowerBalanceRequestInput['parameters']> = {}) {
  return {
    solarArrayAreaM2: 2.5,
    arrayEfficiency: 0.3,
    batteryCapacityWh: 1000,
    depthOfDischargeLimit: 0.8,
    baseHotelLoadW: 50,
    payloadLoadW: 25,
    ...overrides,
  };
}

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

function assertWithinFraction(actual: number, expected: number, fraction: number, message: string) {
  const tolerance = Math.abs(expected) * fraction;
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} +/- ${tolerance} (${fraction * 100}%), got ${actual}`,
  );
}

test('Power balance: full sun at normal incidence reproduces rated array output within 0.1 %', () => {
  const parameters = baseParameters({
    solarArrayAreaM2: 2.5,
    arrayEfficiency: 0.3,
    panelOrientation: { kind: 'fixed_normal', normalAzimuthDeg: 45, normalElevationDeg: 30 },
  });
  const result = computePowerBalance({
    parameters,
    steps: [step({ solarAzimuthDeg: 45, solarElevationDeg: 30, fractionalSolarDiskVisibility: 1 })],
  });

  // P_rated = S0 * A * eta = 1361 W/m^2 * 2.5 m^2 * 0.30 = 1020.75 W
  const ratingParameters =
    SOLAR_IRRADIANCE_AT_1_AU_W_PER_M2 * parameters.solarArrayAreaM2 * parameters.arrayEfficiency;
  assertWithinFraction(result.ratedArrayOutputW, ratingParameters, 1e-5, 'rated array output');

  const only = result.steps[0]!;
  assertWithinFraction(only.panelIncidenceCosine, 1, 1e-9, 'normal-incidence cosine');
  assert.ok(
    only.panelIncidenceAngleDeg < 1e-5,
    `normal-incidence angle should be ~0 deg, got ${only.panelIncidenceAngleDeg}`,
  );
  assertWithinFraction(only.solarArrayOutputW, 1020.75, 0.001, 'full-sun array output');
  assertWithinFraction(only.netPowerW, 1020.75 - 75, 0.001, 'full-sun net power');
  assert.equal(result.resultClass, 'engineering_estimate');
  assert.equal(result.status, 'approximate');
});

test('Power balance: horizontal panel at zenith solar elevation reaches rated output within 0.1 %', () => {
  const result = computePowerBalance({
    parameters: baseParameters({ panelOrientation: { kind: 'horizontal' } }),
    steps: [step({ solarElevationDeg: 90 })],
  });

  const only = result.steps[0]!;
  const ratingParameters = SOLAR_IRRADIANCE_AT_1_AU_W_PER_M2 * 2.5 * 0.3;
  assertWithinFraction(only.solarArrayOutputW, ratingParameters, 0.001, 'zenith horizontal array');
  // The documented horizontal-panel assumption must be surfaced, not hidden.
  assert.ok(result.assumptions.some((entry) => entry.includes('horizontal (zenith-facing) panel')));
});

test('Power balance: horizontal panel output follows sin(elevation) and is zero below the horizon', () => {
  const result = computePowerBalance({
    parameters: baseParameters({ panelOrientation: { kind: 'horizontal' } }),
    steps: [
      step({ startEpochMs: T0, endEpochMs: T0 + HOUR_MS, solarElevationDeg: 30 }),
      step({
        startEpochMs: T0 + HOUR_MS,
        endEpochMs: T0 + 2 * HOUR_MS,
        solarElevationDeg: -3,
        fractionalSolarDiskVisibility: 1,
      }),
    ],
  });

  const rated = SOLAR_IRRADIANCE_AT_1_AU_W_PER_M2 * 2.5 * 0.3;
  assertWithinFraction(result.steps[0]!.solarArrayOutputW, rated * 0.5, 1e-6, 'sin(30 deg)');
  assert.equal(result.steps[1]!.solarArrayOutputW, 0, 'back-lit panel must not generate');
  assert.equal(result.steps[1]!.panelIncidenceCosine, 0);
});

test('Power balance: zero visible solar disk fraction discharges on load only', () => {
  const result = computePowerBalance({
    parameters: baseParameters({
      batteryCapacityWh: 1000,
      baseHotelLoadW: 60,
      payloadLoadW: 40,
    }),
    steps: [
      step({ startEpochMs: T0, endEpochMs: T0 + 2 * HOUR_MS, fractionalSolarDiskVisibility: 0 }),
    ],
  });

  const only = result.steps[0]!;
  assert.equal(only.solarArrayOutputW, 0, 'no visible disk means no array output in the model');
  assert.equal(only.loadW, 100);
  assert.equal(only.netPowerW, -100);
  assert.equal(only.stateOfChargeWh, 800, 'SOC must fall by load x duration = 200 Wh');
  assert.equal(only.stateOfChargePercent, 80);
  assert.equal(only.unservedLoadWh, 0);
  assert.equal(result.totals.cumulativeSolarEnergyWh, 0);
  assert.equal(result.totals.cumulativeLoadEnergyWh, 200);
});

test('Power balance: partial disk fraction scales output linearly between zero and rated', () => {
  const full = computePowerBalance({
    parameters: baseParameters({ panelOrientation: { kind: 'horizontal' } }),
    steps: [step({ solarElevationDeg: 90, fractionalSolarDiskVisibility: 1 })],
  });
  const half = computePowerBalance({
    parameters: baseParameters({ panelOrientation: { kind: 'horizontal' } }),
    steps: [step({ solarElevationDeg: 90, fractionalSolarDiskVisibility: 0.5 })],
  });
  assertWithinFraction(
    half.steps[0]!.solarArrayOutputW,
    full.steps[0]!.solarArrayOutputW * 0.5,
    1e-6,
    'half disk fraction',
  );
});

test('Power balance: state of charge never leaves [0, 100] % under overcharge', () => {
  const result = computePowerBalance({
    parameters: baseParameters({
      solarArrayAreaM2: 20,
      arrayEfficiency: 0.4,
      batteryCapacityWh: 500,
      baseHotelLoadW: 10,
      payloadLoadW: 0,
      panelOrientation: { kind: 'horizontal' },
    }),
    steps: [
      step({ startEpochMs: T0, endEpochMs: T0 + 6 * HOUR_MS, solarElevationDeg: 90 }),
      step({
        startEpochMs: T0 + 6 * HOUR_MS,
        endEpochMs: T0 + 12 * HOUR_MS,
        solarElevationDeg: 90,
      }),
    ],
  });

  for (const powerStep of result.steps) {
    assert.ok(powerStep.stateOfChargePercent >= 0 && powerStep.stateOfChargePercent <= 100);
    assert.ok(powerStep.stateOfChargeWh >= 0 && powerStep.stateOfChargeWh <= 500);
  }
  const final = result.steps[result.steps.length - 1]!;
  assert.equal(final.stateOfChargePercent, 100, 'battery must saturate at capacity');
  assert.ok(result.battery.chargeSaturationReached);
  assert.ok(result.totals.cumulativeCurtailedEnergyWh > 0, 'surplus generation is curtailed');
  assert.equal(result.battery.minimumStateOfChargePercent, 100);
});

test('Power balance: state of charge never leaves [0, 100] % under deep discharge', () => {
  const result = computePowerBalance({
    parameters: baseParameters({
      solarArrayAreaM2: 0.1,
      batteryCapacityWh: 100,
      baseHotelLoadW: 100,
      payloadLoadW: 100,
    }),
    steps: [
      step({ startEpochMs: T0, endEpochMs: T0 + 3 * HOUR_MS, fractionalSolarDiskVisibility: 0 }),
      step({
        startEpochMs: T0 + 3 * HOUR_MS,
        endEpochMs: T0 + 4 * HOUR_MS,
        fractionalSolarDiskVisibility: 0,
      }),
    ],
  });

  for (const powerStep of result.steps) {
    assert.ok(powerStep.stateOfChargePercent >= 0 && powerStep.stateOfChargePercent <= 100);
    assert.ok(powerStep.stateOfChargeWh >= 0);
  }
  const final = result.steps[result.steps.length - 1]!;
  assert.equal(final.stateOfChargeWh, 0, 'SOC floor is physically zero, never negative');
  assert.equal(final.stateOfChargePercent, 0);
  assert.ok(result.battery.depletionReached);
  // 4 h x 200 W = 800 Wh demanded, 100 Wh available -> 700 Wh unmet.
  assert.equal(result.totals.cumulativeEnergyDeficitWh, 700);
  assert.equal(final.unservedLoadWh, 200, 'the final hour is fully unserved');
});

test('Power balance: depth-of-discharge limit is respected when the SOC stays above the floor', () => {
  const result = computePowerBalance({
    parameters: baseParameters({
      batteryCapacityWh: 1000,
      depthOfDischargeLimit: 0.5,
      baseHotelLoadW: 100,
      payloadLoadW: 0,
    }),
    steps: [
      step({ startEpochMs: T0, endEpochMs: T0 + 4 * HOUR_MS, fractionalSolarDiskVisibility: 0 }),
    ],
  });

  // Usable energy = 1000 Wh x 0.5 = 500 Wh floor; 400 Wh withdrawn leaves 600 Wh.
  assert.equal(result.battery.minimumAllowedStateOfChargeWh, 500);
  assert.equal(result.battery.minimumAllowedStateOfChargePercent, 50);
  assert.equal(result.battery.minimumStateOfChargeWh, 600);
  assert.equal(result.battery.depthOfDischargeRespected, true);
  assert.equal(result.battery.depthOfDischargeBreachWh, 0);
  assert.equal(result.steps[0]!.belowDepthOfDischargeFloor, false);
});

test('Power balance: depth-of-discharge breach is flagged with the exact shortfall', () => {
  const result = computePowerBalance({
    parameters: baseParameters({
      batteryCapacityWh: 1000,
      depthOfDischargeLimit: 0.5,
      baseHotelLoadW: 100,
      payloadLoadW: 0,
    }),
    steps: [
      step({ startEpochMs: T0, endEpochMs: T0 + 7 * HOUR_MS, fractionalSolarDiskVisibility: 0 }),
    ],
  });

  // 700 Wh withdrawn leaves 300 Wh, i.e. 200 Wh below the 500 Wh floor.
  assert.equal(result.battery.minimumStateOfChargeWh, 300);
  assert.equal(result.battery.depthOfDischargeRespected, false);
  assert.equal(result.battery.depthOfDischargeBreachWh, 200);
  assert.equal(result.steps[0]!.belowDepthOfDischargeFloor, true);
  assert.equal(result.steps[0]!.unservedLoadWh, 0, 'load is still served by physical capacity');
});

test('Power balance: changing a single model input changes the result', () => {
  const run = (parameters: Partial<PowerBalanceRequestInput['parameters']>) =>
    computePowerBalance({
      parameters: baseParameters({ panelOrientation: { kind: 'horizontal' }, ...parameters }),
      steps: [step({ solarElevationDeg: 90, fractionalSolarDiskVisibility: 1 })],
    });

  const baseline = run({});
  const doubledArea = run({ solarArrayAreaM2: 5 });
  const lowerEfficiency = run({ arrayEfficiency: 0.15 });
  const biggerBattery = run({ batteryCapacityWh: 2000 });
  const heavierLoad = run({ payloadLoadW: 125 });
  const backLitPanel = computePowerBalance({
    parameters: baseParameters({
      panelOrientation: { kind: 'fixed_normal', normalAzimuthDeg: 0, normalElevationDeg: 30 },
    }),
    steps: [
      step({ solarElevationDeg: 30, solarAzimuthDeg: 180, fractionalSolarDiskVisibility: 1 }),
    ],
  });

  assertWithinFraction(
    doubledArea.steps[0]!.solarArrayOutputW,
    baseline.steps[0]!.solarArrayOutputW * 2,
    1e-9,
    'array area doubles output',
  );
  assertWithinFraction(
    lowerEfficiency.steps[0]!.solarArrayOutputW,
    baseline.steps[0]!.solarArrayOutputW * 0.5,
    1e-9,
    'efficiency halves output',
  );
  assert.equal(biggerBattery.steps[0]!.stateOfChargeWh, 2000);
  assert.equal(baseline.steps[0]!.stateOfChargeWh, 1000);
  assert.equal(heavierLoad.steps[0]!.loadW, 175);
  assert.equal(baseline.steps[0]!.loadW, 75);
  // Panel normal due north at 30 deg vs a Sun 180 deg away at the same elevation: back-lit.
  assert.equal(backLitPanel.steps[0]!.panelIncidenceCosine, 0);
  assert.equal(backLitPanel.steps[0]!.solarArrayOutputW, 0);
});

test('Power balance: energy totals are internally consistent', () => {
  const result = computePowerBalance({
    parameters: baseParameters(),
    steps: [
      step({ startEpochMs: T0, endEpochMs: T0 + HOUR_MS, fractionalSolarDiskVisibility: 1 }),
      step({
        startEpochMs: T0 + HOUR_MS,
        endEpochMs: T0 + 3 * HOUR_MS,
        fractionalSolarDiskVisibility: 0,
      }),
    ],
  });

  assertWithinFraction(
    result.totals.cumulativeNetEnergyWh,
    result.totals.cumulativeSolarEnergyWh - result.totals.cumulativeLoadEnergyWh,
    1e-9,
    'net = solar - load',
  );
  // Steps: 1 h + 2 h = 3 h of evaluated time at a constant 75 W bus load.
  assert.equal(result.totalDurationHours, 3);
  assert.equal(result.totals.cumulativeLoadEnergyWh, 225, '75 W over 3 h');

  const summed = result.steps.reduce(
    (sum, powerStep) => sum + powerStep.netPowerW * powerStep.durationHours,
    0,
  );
  assertWithinFraction(
    result.totals.cumulativeNetEnergyWh,
    summed,
    1e-6,
    'totals equal the per-step energy sum',
  );
});

test('Power balance: result is deterministic and carries its assumptions', () => {
  const request: PowerBalanceRequestInput = { parameters: baseParameters(), steps: [step()] };
  assert.deepEqual(computePowerBalance(request), computePowerBalance(request));

  const result = computePowerBalance(request);
  assert.equal(result.assumptions.length, POWER_MODEL_ASSUMPTIONS.length + 1);
  assert.equal(result.limitations.length, POWER_MODEL_LIMITATIONS.length);
  assert.ok(result.label.toLowerCase().includes('engineering estimate'));
  // The emitted payload must satisfy its own contract (catches schema drift in the solver).
  assert.doesNotThrow(() => powerBalanceResultSchema.parse(result));

  const payloadText = JSON.stringify(result).toLowerCase();
  for (const forbidden of ['guaranteed', 'assured', 'available power']) {
    assert.ok(!payloadText.includes(forbidden), `result must not claim "${forbidden}"`);
  }
});

test('Power balance: invalid model parameters and steps are rejected', () => {
  const cases: Array<[string, unknown]> = [
    [
      'disk fraction above 1',
      { parameters: baseParameters(), steps: [step({ fractionalSolarDiskVisibility: 1.2 })] },
    ],
    [
      'negative area',
      { parameters: baseParameters({ solarArrayAreaM2: 0 }), steps: [step()] },
    ],
    [
      'efficiency above 1',
      { parameters: baseParameters({ arrayEfficiency: 1.5 }), steps: [step()] },
    ],
    [
      'zero depth of discharge',
      { parameters: baseParameters({ depthOfDischargeLimit: 0 }), steps: [step()] },
    ],
    [
      'zero battery capacity',
      { parameters: baseParameters({ batteryCapacityWh: 0 }), steps: [step()] },
    ],
    [
      'reversed step bounds',
      {
        parameters: baseParameters(),
        steps: [step({ startEpochMs: T0 + HOUR_MS, endEpochMs: T0 })],
      },
    ],
    ['empty step list', { parameters: baseParameters(), steps: [] }],
  ];

  for (const [label, request] of cases) {
    assert.throws(
      () => computePowerBalance(request as PowerBalanceRequestInput),
      `${label} must be rejected`,
    );
  }
});

test('Power balance: the module performs no astronomy and calls no ephemeris service', () => {
  // Architectural guard for the invariant "the power model consumes already-computed
  // visibility; it does not recompute astronomy".
  const sourcePath = fileURLToPath(
    new URL('../../src/services/operations/powerBalance.ts', import.meta.url),
  );
  const imports = [...readFileSync(sourcePath, 'utf8').matchAll(/from '([^']+)'/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(imports.sort(), ['./powerModelAssumptions', '@luna/contracts']);
});

test('Power balance: step limit is bounded to protect the request path', () => {
  assert.equal(POWER_BALANCE_STEP_LIMIT, 50_000);
});

test('Power balance: adapter consumes evaluated sub-intervals without new astronomy', () => {
  const intervals = [
    {
      startEpochMs: T0,
      endEpochMs: T0 + HOUR_MS,
      sun: { meanElevationDeg: 12.5, meanAzimuthDeg: 90, fractionalSolarDiskVisibility: 1 },
    },
    {
      startEpochMs: T0 + HOUR_MS,
      endEpochMs: T0 + 2 * HOUR_MS,
      sun: { meanElevationDeg: -1.5, meanAzimuthDeg: 92, fractionalSolarDiskVisibility: 0 },
    },
  ];

  const steps = powerStepsFromEvaluatedSubIntervals(intervals);
  assert.deepEqual(steps[0], {
    startEpochMs: T0,
    endEpochMs: T0 + HOUR_MS,
    solarElevationDeg: 12.5,
    solarAzimuthDeg: 90,
    fractionalSolarDiskVisibility: 1,
  });

  const result = computePowerBalance({
    parameters: baseParameters({ panelOrientation: { kind: 'horizontal' } }),
    steps,
  });
  assert.equal(result.steps.length, 2);
  assert.ok(result.steps[0]!.solarArrayOutputW > 0);
  assert.equal(result.steps[1]!.solarArrayOutputW, 0);
});

/**
 * Challenger M5-2: Vehicle Constraints & Preset Ergonomics Stress Suite
 *
 * Empirical adversarial stress testing for Milestone M5:
 * 1. Preset button clicks across all 3 presets (clps, artemis, survey) and active highlight checking.
 * 2. Numeric inputs with boundary values (minimums, maximums, zeros, decimals).
 * 3. Invalid input handling (negative values, non-numeric strings, NaN, empty strings, symbols).
 * 4. Keyboard interaction and accessibility: labels, type="number", min, max, step, WCAG tap targets.
 * 5. MISSION_PRESETS export integrity and consumer import compatibility.
 * 6. Generative fuzzing: 1,000 iterations verifying non-negative invariant and zero-NaN guarantee.
 */

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { VehicleConstraints } from '@luna/contracts';
import {
  VehicleConstraintsBar,
  MISSION_PRESETS,
} from '../src/features/comparison/VehicleConstraintsBar';
import { MISSION_PRESETS as DIRECT_PRESETS } from '../src/features/comparison/model/missionPresets';
import {
  VehiclePresetButtons,
  isPresetActive,
} from '../src/features/comparison/components/VehiclePresetButtons';
import { VehicleConstraintInput } from '../src/features/comparison/components/VehicleConstraintInput';
import {
  VEHICLE_CONSTRAINT_CONFIGS,
  type VehicleConstraintFieldConfig,
} from '../src/features/comparison/components/vehicleConstraintConfigs';

describe('Challenger M5-2: MISSION_PRESETS Export & Re-export Contract', () => {
  it('re-exports MISSION_PRESETS from VehicleConstraintsBar matching model source exactly', () => {
    expect(MISSION_PRESETS).toBeDefined();
    expect(MISSION_PRESETS).toBe(DIRECT_PRESETS);
    expect(MISSION_PRESETS.length).toBe(3);
  });

  it('contains valid, finite, non-negative numbers for all 3 presets', () => {
    const expectedPresetIds = ['clps', 'artemis', 'survey'] as const;
    const foundIds = MISSION_PRESETS.map((p) => p.id);
    expect(foundIds).toEqual(['clps', 'artemis', 'survey']);

    for (const preset of MISSION_PRESETS) {
      expect(typeof preset.id).toBe('string');
      expect(typeof preset.label).toBe('string');
      expect(typeof preset.description).toBe('string');
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);

      const v = preset.values;
      expect(Number.isFinite(v.minContinuousSunlightHours)).toBe(true);
      expect(v.minContinuousSunlightHours).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(v.maxContinuousDarknessHours)).toBe(true);
      expect(v.maxContinuousDarknessHours).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(v.minDteHours)).toBe(true);
      expect(v.minDteHours).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(v.maxLandingSlopeDeg)).toBe(true);
      expect(v.maxLandingSlopeDeg).toBeGreaterThanOrEqual(0);
      expect(v.maxLandingSlopeDeg).toBeLessThanOrEqual(45);
    }
  });
});

describe('Challenger M5-2: VehiclePresetButtons & isPresetActive Ergonomics', () => {
  it('evaluates isPresetActive correctly for exact matches and detects single-metric drifts', () => {
    const clpsPreset = MISSION_PRESETS.find((p) => p.id === 'clps')!;
    const artemisPreset = MISSION_PRESETS.find((p) => p.id === 'artemis')!;
    const surveyPreset = MISSION_PRESETS.find((p) => p.id === 'survey')!;

    // Exact matches
    expect(isPresetActive(clpsPreset.values, clpsPreset.values)).toBe(true);
    expect(isPresetActive(artemisPreset.values, artemisPreset.values)).toBe(true);
    expect(isPresetActive(surveyPreset.values, surveyPreset.values)).toBe(true);

    // Cross matches must be false
    expect(isPresetActive(clpsPreset.values, artemisPreset.values)).toBe(false);
    expect(isPresetActive(artemisPreset.values, surveyPreset.values)).toBe(false);

    // Single-field perturbation tests
    const driftedSun: VehicleConstraints = {
      ...artemisPreset.values,
      minContinuousSunlightHours: artemisPreset.values.minContinuousSunlightHours + 0.5,
    };
    expect(isPresetActive(driftedSun, artemisPreset.values)).toBe(false);

    const driftedDark: VehicleConstraints = {
      ...artemisPreset.values,
      maxContinuousDarknessHours: artemisPreset.values.maxContinuousDarknessHours - 0.1,
    };
    expect(isPresetActive(driftedDark, artemisPreset.values)).toBe(false);

    const driftedDte: VehicleConstraints = {
      ...artemisPreset.values,
      minDteHours: artemisPreset.values.minDteHours + 1.0,
    };
    expect(isPresetActive(driftedDte, artemisPreset.values)).toBe(false);

    const driftedSlope: VehicleConstraints = {
      ...artemisPreset.values,
      maxLandingSlopeDeg: artemisPreset.values.maxLandingSlopeDeg + 0.1,
    };
    expect(isPresetActive(driftedSlope, artemisPreset.values)).toBe(false);
  });

  it('renders VehiclePresetButtons with active button highlight and accessible toolbar semantics', () => {
    const artemisPreset = MISSION_PRESETS.find((p) => p.id === 'artemis')!;
    let selectedPreset: VehicleConstraints | null = null;

    const element = (
      <VehiclePresetButtons
        constraints={artemisPreset.values}
        onSelectPreset={(p) => {
          selectedPreset = p;
        }}
      />
    );
    const html = renderToStaticMarkup(element);

    // Toolbar semantics
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Mission Profile Presets"');

    // Artemis button is active
    expect(html).toContain('data-testid="preset-btn-artemis"');
    expect(html).toContain('aria-pressed="true"');

    // Other buttons are not active
    expect(html).toContain('data-testid="preset-btn-clps"');
    expect(html).toContain('data-testid="preset-btn-survey"');

    // WCAG 2.2 AA target size (>= 24px)
    expect(html).toContain('min-h-[30px]');
    // Focus visible styling
    expect(html).toContain('focus-visible:outline-2');
    expect(/focus-visible:outline-(\[var\(--lm-color-[a-z-]+\)\]|cyan-400)/.test(html)).toBe(true);

    // Test button click invocation via element inspection
    const rendered = VehiclePresetButtons({
      constraints: artemisPreset.values,
      onSelectPreset: (p) => {
        selectedPreset = p;
      },
    }) as React.ReactElement<any>;

    const toolbarDiv = rendered.props.children[1] as React.ReactElement<any>;
    const buttons = toolbarDiv.props.children as React.ReactElement<any>[];
    expect(buttons.length).toBe(3);

    // Trigger click on CLPS
    buttons[0].props.onClick();
    expect(selectedPreset).toEqual(MISSION_PRESETS[0].values);

    // Trigger click on Survey
    buttons[2].props.onClick();
    expect(selectedPreset).toEqual(MISSION_PRESETS[2].values);
  });

  it('renders all preset buttons as inactive when custom tuning does not match any preset', () => {
    const customConstraints: VehicleConstraints = {
      minContinuousSunlightHours: 99.0,
      maxContinuousDarknessHours: 33.0,
      minDteHours: 12.0,
      maxLandingSlopeDeg: 7.0,
    };

    const html = renderToStaticMarkup(
      <VehiclePresetButtons
        constraints={customConstraints}
        onSelectPreset={() => {}}
      />,
    );

    // None should be pressed
    expect(html).not.toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });
});

describe('Challenger M5-2: VehicleConstraintInput Numeric & Boundary Resilience', () => {
  it('renders semantic markup with label, unit hint, step, min, and max attributes', () => {
    for (const config of VEHICLE_CONSTRAINT_CONFIGS) {
      const html = renderToStaticMarkup(
        <VehicleConstraintInput
          config={config}
          value={config.min}
          onChange={() => {}}
        />,
      );

      expect(html).toContain(`data-testid="vehicle-constraint-${config.key}"`);
      expect(html).toContain(`data-testid="vehicle-constraint-input-${config.key}"`);
      expect(html).toContain(`type="number"`);
      expect(html).toContain(`min="${config.min}"`);
      expect(html).toContain(`max="${config.max}"`);
      expect(html).toContain(`step="${config.step}"`);
      expect(html).toContain(`aria-label="${config.ariaLabel}"`);
      expect(html).toContain(config.unitHint);
    }
  });

  it('handles valid numeric changes including decimals and boundary zeros', () => {
    const config = VEHICLE_CONSTRAINT_CONFIGS[0];
    let receivedVal: number = -1;

    const inputComp = VehicleConstraintInput({
      config,
      value: 40,
      onChange: (v) => {
        receivedVal = v;
      },
    }) as React.ReactElement<any>;

    // Find the input element and test its onChange
    const inputElement = inputComp.props.children[1] as React.ReactElement<any>;

    // Zero
    inputElement.props.onChange({ target: { value: '0' } } as any);
    expect(receivedVal).toBe(0);

    // Float decimal
    inputElement.props.onChange({ target: { value: '45.75' } } as any);
    expect(receivedVal).toBe(45.75);

    // Max boundary
    inputElement.props.onChange({ target: { value: '336' } } as any);
    expect(receivedVal).toBe(336);
  });

  it('safely clamps negative inputs to 0 and neutralizes NaN, strings, and empty input', () => {
    const config = VEHICLE_CONSTRAINT_CONFIGS[1];
    let receivedVal: number = -999;

    const inputComp = VehicleConstraintInput({
      config,
      value: 24,
      onChange: (v) => {
        receivedVal = v;
      },
    }) as React.ReactElement<any>;

    const inputElement = inputComp.props.children[1] as React.ReactElement<any>;

    // Negative numbers must clamp to 0
    inputElement.props.onChange({ target: { value: '-15' } } as any);
    expect(receivedVal).toBe(0);

    inputElement.props.onChange({ target: { value: '-0.0001' } } as any);
    expect(receivedVal).toBe(0);

    // Empty string (user backspaces all characters) must become 0, never NaN
    inputElement.props.onChange({ target: { value: '' } } as any);
    expect(receivedVal).toBe(0);
    expect(Number.isNaN(receivedVal)).toBe(false);

    // Non-numeric garbage strings must become 0, never NaN
    inputElement.props.onChange({ target: { value: 'abc' } } as any);
    expect(receivedVal).toBe(0);

    inputElement.props.onChange({ target: { value: 'NaN' } } as any);
    expect(receivedVal).toBe(0);

    inputElement.props.onChange({ target: { value: '   ' } } as any);
    expect(receivedVal).toBe(0);

    // Symbols / malformed input
    inputElement.props.onChange({ target: { value: '--++' } } as any);
    expect(receivedVal).toBe(0);
  });
});

describe('Challenger M5-2: VehicleConstraintsBar Component Integration', () => {
  it('renders all 4 constraint cards and reflects cohort count and active preset description', () => {
    const clpsPreset = MISSION_PRESETS.find((p) => p.id === 'clps')!;
    const html = renderToStaticMarkup(
      <VehicleConstraintsBar
        constraints={clpsPreset.values}
        onChange={() => {}}
        cohortCount={14}
      />,
    );

    expect(html).toContain('data-testid="vehicle-constraints-bar"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Vehicle Constraint Cutoffs and Mission Presets"');

    // Cohort count
    expect(html).toContain('Cohort:');
    expect(html).toContain('14');
    expect(html).toContain('Sites');

    // Active preset description
    expect(html).toContain(clpsPreset.description);

    // All 4 constraint inputs
    for (const config of VEHICLE_CONSTRAINT_CONFIGS) {
      expect(html).toContain(`data-testid="vehicle-constraint-input-${config.key}"`);
    }
  });

  it('updates single constraint immutably without side-effects on peer fields', () => {
    const initialConstraints: VehicleConstraints = {
      minContinuousSunlightHours: 40.0,
      maxContinuousDarknessHours: 60.0,
      minDteHours: 0.0,
      maxLandingSlopeDeg: 15.0,
    };

    let updatedConstraints: VehicleConstraints | null = null;
    const rendered = VehicleConstraintsBar({
      constraints: initialConstraints,
      onChange: (u) => {
        updatedConstraints = u;
      },
      cohortCount: 10,
    }) as React.ReactElement<any>;

    const gridDiv = rendered.props.children[1] as React.ReactElement<any>;
    const inputCards = gridDiv.props.children as React.ReactElement<any>[];
    expect(inputCards.length).toBe(4);

    // Change first field: minContinuousSunlightHours -> 75
    inputCards[0].props.onChange(75);

    expect(updatedConstraints).not.toBeNull();
    expect(updatedConstraints!.minContinuousSunlightHours).toBe(75);
    expect(updatedConstraints!.maxContinuousDarknessHours).toBe(60.0);
    expect(updatedConstraints!.minDteHours).toBe(0.0);
    expect(updatedConstraints!.maxLandingSlopeDeg).toBe(15.0);

    // Verify initial constraints object was not mutated
    expect(initialConstraints.minContinuousSunlightHours).toBe(40.0);
  });
});

describe('Challenger M5-2: Generative Fuzzing & Stress Testing (1,000 iterations)', () => {
  it('guarantees VehicleConstraintInput never emits NaN or negative numbers across 1,000 randomized inputs', () => {
    const config = VEHICLE_CONSTRAINT_CONFIGS[0];
    let emittedValue: number = -1;

    const inputComp = VehicleConstraintInput({
      config,
      value: 0,
      onChange: (v) => {
        emittedValue = v;
      },
    }) as React.ReactElement<any>;
    const inputElement = inputComp.props.children[1] as React.ReactElement<any>;

    const adversarialStrings = [
      '', '   ', 'NaN', 'undefined', 'null',
      '-0', '-1', '-99999999', '1e-10', '0.0000001', 'abc123',
      '123abc', '---', '+++', '0x1F', 'e', '.', '..', '0.0.0',
    ];

    for (let i = 0; i < 1000; i++) {
      let testInput: string;
      const mode = i % 5;
      if (mode === 0) {
        testInput = adversarialStrings[i % adversarialStrings.length];
      } else if (mode === 1) {
        testInput = (Math.random() * -1000).toFixed(4); // strictly negative
      } else if (mode === 2) {
        testInput = (Math.random() * 500).toFixed(4); // positive float
      } else if (mode === 3) {
        testInput = String(Math.floor(Math.random() * 350)); // positive integer
      } else {
        testInput = `${Math.random() > 0.5 ? '-' : ''}${Math.random() * 100}randomText`;
      }

      inputElement.props.onChange({ target: { value: testInput } } as any);

      expect(Number.isNaN(emittedValue)).toBe(false);
      expect(Number.isFinite(emittedValue)).toBe(true);
      expect(emittedValue).toBeGreaterThanOrEqual(0);
    }
  });

  it('documents Infinity behavior: -Infinity clamps to 0 while +Infinity passes as Infinity', () => {
    const config = VEHICLE_CONSTRAINT_CONFIGS[0];
    let emittedValue: number = -1;

    const inputComp = VehicleConstraintInput({
      config,
      value: 0,
      onChange: (v) => {
        emittedValue = v;
      },
    }) as React.ReactElement<any>;
    const inputElement = inputComp.props.children[1] as React.ReactElement<any>;

    // -Infinity is clamped to 0 by Math.max(0, -Infinity)
    inputElement.props.onChange({ target: { value: '-Infinity' } } as any);
    expect(emittedValue).toBe(0);

    // +Infinity passes through because isNaN(Infinity) is false in JavaScript
    inputElement.props.onChange({ target: { value: 'Infinity' } } as any);
    expect(emittedValue).toBe(Infinity);
  });

  it('guarantees isPresetActive is strictly deterministic and non-throwing across 1,000 random constraint sets', () => {
    const basePreset = MISSION_PRESETS[1].values;

    for (let i = 0; i < 1000; i++) {
      const randomConstraints: VehicleConstraints = {
        minContinuousSunlightHours: i % 10 === 0 ? basePreset.minContinuousSunlightHours : Math.random() * 200,
        maxContinuousDarknessHours: i % 7 === 0 ? basePreset.maxContinuousDarknessHours : Math.random() * 100,
        minDteHours: i % 5 === 0 ? basePreset.minDteHours : Math.random() * 100,
        maxLandingSlopeDeg: i % 3 === 0 ? basePreset.maxLandingSlopeDeg : Math.random() * 45,
      };

      const result = isPresetActive(randomConstraints, basePreset);
      expect(typeof result).toBe('boolean');

      const isExact =
        randomConstraints.minContinuousSunlightHours === basePreset.minContinuousSunlightHours &&
        randomConstraints.maxContinuousDarknessHours === basePreset.maxContinuousDarknessHours &&
        randomConstraints.minDteHours === basePreset.minDteHours &&
        randomConstraints.maxLandingSlopeDeg === basePreset.maxLandingSlopeDeg;

      expect(result).toBe(isExact);
    }
  });
});

import React from 'react';
import type { VehicleConstraints } from '@luna/contracts';
import { MISSION_PRESETS } from './model/missionPresets';
import { VEHICLE_CONSTRAINT_CONFIGS } from './components/vehicleConstraintConfigs';
import { VehiclePresetButtons, isPresetActive } from './components/VehiclePresetButtons';
import { VehicleConstraintInput } from './components/VehicleConstraintInput';

export { MISSION_PRESETS };

export interface VehicleConstraintsBarProps {
  constraints: VehicleConstraints;
  onChange: (updated: VehicleConstraints) => void;
  cohortCount: number;
}

export const VehicleConstraintsBar: React.FC<VehicleConstraintsBarProps> = ({
  constraints,
  onChange,
  cohortCount,
}) => {
  const activePreset = MISSION_PRESETS.find((p) => isPresetActive(constraints, p.values));

  const handleConstraintChange = (key: keyof VehicleConstraints, val: number) => {
    onChange({
      ...constraints,
      [key]: val,
    });
  };

  return (
    <div
      role="group"
      aria-label="Vehicle Constraint Cutoffs and Mission Presets"
      data-testid="vehicle-constraints-bar"
      className="flex flex-col gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-4 font-mono text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--lm-color-border-subtle)] pb-3">
        <VehiclePresetButtons constraints={constraints} onSelectPreset={onChange} />

        <div className="flex items-center gap-3 text-[11px] text-[var(--lm-color-text-muted)]">
          {activePreset && (
            <span className="hidden italic sm:inline">{activePreset.description}</span>
          )}
          <span>
            Cohort: <strong className="font-bold text-[var(--lm-color-text-secondary)]">{cohortCount}</strong> Sites
          </span>
        </div>
      </div>

      {/* Four cards need the full page width; below 1600px two columns keep every card legible. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1600px]:grid-cols-4">
        {VEHICLE_CONSTRAINT_CONFIGS.map((config) => (
          <VehicleConstraintInput
            key={config.key}
            config={config}
            value={constraints[config.key]}
            onChange={(val) => handleConstraintChange(config.key, val)}
          />
        ))}
      </div>
    </div>
  );
};

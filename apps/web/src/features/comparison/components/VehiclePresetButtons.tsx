import React from 'react';
import type { VehicleConstraints } from '@luna/contracts';
import { MISSION_PRESETS } from '../model/missionPresets';

export interface VehiclePresetButtonsProps {
  constraints: VehicleConstraints;
  onSelectPreset: (presetValues: VehicleConstraints) => void;
}

export const isPresetActive = (
  constraints: VehicleConstraints,
  presetValues: VehicleConstraints,
): boolean =>
  constraints.minContinuousSunlightHours === presetValues.minContinuousSunlightHours &&
  constraints.maxContinuousDarknessHours === presetValues.maxContinuousDarknessHours &&
  constraints.minDteHours === presetValues.minDteHours &&
  constraints.maxLandingSlopeDeg === presetValues.maxLandingSlopeDeg;

export const VehiclePresetButtons: React.FC<VehiclePresetButtonsProps> = ({
  constraints,
  onSelectPreset,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[var(--lm-color-text-secondary)] font-bold uppercase text-[11px] tracking-wider">
        Vehicle Profile Presets:
      </span>
      <div
        role="toolbar"
        aria-label="Mission Profile Presets"
        className="flex items-center rounded-lg bg-[var(--lm-color-surface)]/90 border border-[var(--lm-color-border-subtle)] p-1 gap-1"
      >
        {MISSION_PRESETS.map((preset) => {
          const active = isPresetActive(constraints, preset.values);
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              onClick={() => onSelectPreset(preset.values)}
              aria-pressed={active}
              data-testid={`preset-btn-${preset.id}`}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[30px] flex items-center gap-1.5 ${
                active
                  ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)] shadow-md ring-1 ring-[var(--lm-color-info)]'
                  : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]'
              }`}
            >
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

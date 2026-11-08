import React from 'react';
import { useScenario, useScenarioCommands } from '@/app/scenario/context/scenarioContext';
import type { CalculationMode } from '@/domain/celestial/calculationMode';

const MODE_BUTTON_BASE =
  'min-h-6 px-2.5 py-0.5 text-[11px] font-mono whitespace-nowrap rounded-[var(--lm-radius-xs)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]';
const MODE_BUTTON_ACTIVE =
  'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)]/50 font-semibold';
const MODE_BUTTON_IDLE =
  'border border-transparent text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]';

interface ModeOption {
  mode: CalculationMode;
  label: string;
  title: string;
}

const MODE_OPTIONS: readonly ModeOption[] = [
  {
    mode: 'terrain-aware',
    label: 'Terrain-Aware',
    title: 'Terrain-aware calculation using LRO LOLA DEM horizon mask',
  },
  {
    mode: 'geometry-only',
    label: 'Geometry-Only',
    title: 'Geometry-only calculation against mathematical spherical horizon',
  },
];

/**
 * Global calculation-mode switcher (Terrain-Aware DEM vs Geometry-Only sphere)
 * affecting illumination, communications, and terrain clearance sections of the passport.
 */
export function PassportCalculationModeSwitch() {
  const { calculationMode } = useScenario();
  const { setCalculationMode } = useScenarioCommands();

  return (
    <div
      role="group"
      aria-label="Horizon calculation mode"
      data-testid="passport-calculation-mode-switch"
      className="inline-flex items-center gap-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] p-0.5"
    >
      {MODE_OPTIONS.map((option) => {
        const isActive = calculationMode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            aria-pressed={isActive}
            onClick={() => setCalculationMode(option.mode)}
            title={option.title}
            className={`${MODE_BUTTON_BASE} ${isActive ? MODE_BUTTON_ACTIVE : MODE_BUTTON_IDLE}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

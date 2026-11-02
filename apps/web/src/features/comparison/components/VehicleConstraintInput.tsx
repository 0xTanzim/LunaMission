import React from 'react';
import type { VehicleConstraintFieldConfig } from './vehicleConstraintConfigs';
import { ComparisonIcon } from './ComparisonIcon';

export interface VehicleConstraintInputProps {
  config: VehicleConstraintFieldConfig;
  value: number;
  onChange: (value: number) => void;
}

export const VehicleConstraintInput: React.FC<VehicleConstraintInputProps> = ({
  config,
  value,
  onChange,
}) => {
  const inputId = `vehicle-constraint-input-${config.key}`;
  const unitId = `vehicle-constraint-unit-${config.key}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    onChange(Math.max(0, isNaN(parsed) ? 0 : parsed));
  };

  return (
    <div
      data-testid={`vehicle-constraint-${config.key}`}
      className="grid grid-cols-1 gap-2 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)] p-3 transition-colors focus-within:border-[var(--lm-color-border)]"
    >
      <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-1">
        <label
          htmlFor={inputId}
          className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[var(--lm-color-text-primary)]"
        >
          <ComparisonIcon icon={config.icon} size={14} className={config.textColorClass} />
          <span className="truncate" title={config.title}>
            {config.title}
          </span>
        </label>
        {/* Eyebrow: truncates inside its own row instead of bleeding over the next card. */}
        <span
          title={config.purpose}
          className="max-w-full self-start truncate rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--lm-color-text-muted)]"
        >
          {config.purpose}
        </span>
      </div>

      <input
        id={inputId}
        type="number"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={handleChange}
        aria-label={config.ariaLabel}
        aria-describedby={unitId}
        data-testid={`vehicle-constraint-input-${config.key}`}
        className="col-start-1 row-start-2 min-h-[36px] w-full rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-canvas)] py-1.5 pl-2.5 pr-[5.5rem] font-mono text-sm font-bold text-[var(--lm-color-text-primary)] [appearance:textfield] focus:border-[var(--lm-color-focus)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      {/* The unit sits inside the control's own row, so it cannot detach from what it qualifies. */}
      <span
        id={unitId}
        className="pointer-events-none col-start-1 row-start-2 self-center justify-self-end pr-2.5 text-[11px] text-[var(--lm-color-text-muted)]"
      >
        {config.unitHint}
      </span>

      <p className="col-start-1 row-start-3 text-[11px] leading-snug text-[var(--lm-color-text-muted)]">
        {config.tooltip}
      </p>
    </div>
  );
};

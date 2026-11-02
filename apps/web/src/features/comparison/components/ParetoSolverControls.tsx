export interface ParetoSolverConfig {
  targetYear: number;
  stayDays: number;
  minSunlightPct: number;
  maxShadowH: number;
}

export interface ParetoSolverControlsProps {
  config: ParetoSolverConfig;
  onChange: (next: ParetoSolverConfig) => void;
  disabled?: boolean;
}

interface Option {
  value: number;
  label: string;
}

const YEAR_OPTIONS: Option[] = [
  { value: 2026, label: '2026 (Artemis III)' },
  { value: 2027, label: '2027 (CLPS Peak)' },
  { value: 2028, label: '2028 (Base Camp)' },
];

const STAY_OPTIONS: Option[] = [
  { value: 7, label: '7 Days (Short Stay)' },
  { value: 14, label: '14 Days (Nominal)' },
  { value: 28, label: '28 Days (Lunar Day)' },
];

const SUNLIGHT_OPTIONS: Option[] = [
  { value: 40, label: '>40% Daylight' },
  { value: 50, label: '>50% Daylight' },
  { value: 70, label: '>70% Daylight' },
];

const SHADOW_OPTIONS: Option[] = [
  { value: 24, label: '<24h (1 Day)' },
  { value: 48, label: '<48h (2 Days)' },
  { value: 96, label: '<96h (4 Days)' },
];

const FIELDS: { key: keyof ParetoSolverConfig; label: string; options: Option[] }[] = [
  { key: 'targetYear', label: 'Target Year', options: YEAR_OPTIONS },
  { key: 'stayDays', label: 'Stay Duration', options: STAY_OPTIONS },
  { key: 'minSunlightPct', label: 'Min Sunlight', options: SUNLIGHT_OPTIONS },
  { key: 'maxShadowH', label: 'Max Shadow', options: SHADOW_OPTIONS },
];

/**
 * Solver configuration for the Pareto landing-window search: the four thresholds that
 * bound the search space, each a discrete mission-planning choice rather than a free number.
 */
export function ParetoSolverControls({ config, onChange, disabled = false }: ParetoSolverControlsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--lm-color-canvas)] p-3 rounded-lg border border-[var(--lm-color-border-subtle)]">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label
            htmlFor={`pareto-${field.key}`}
            className="text-[11px] text-[var(--lm-color-text-muted)] block mb-1"
          >
            {field.label}
          </label>
          <select
            id={`pareto-${field.key}`}
            value={config[field.key]}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, [field.key]: Number(e.target.value) })}
            className="w-full bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] rounded px-2 py-1 text-[var(--lm-color-info)] disabled:opacity-60"
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

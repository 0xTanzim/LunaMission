import React from 'react';

export interface HorizonMastControlBarProps {
  mastHeightMeters: number;
  onMastHeightChange: (height: number) => void;
  solarFraction: number;
}

const PRESET_MASTS = [
  { label: '2m', val: 2.0, title: 'Lander / Rover Deck' },
  { label: '10m', val: 10.0, title: 'VSAT Solar Mast' },
  { label: '40m', val: 40.0, title: 'Starship HLS Crew Cabin' },
];

export function HorizonMastControlBar({
  mastHeightMeters,
  onMastHeightChange,
  solarFraction,
}: HorizonMastControlBarProps) {
  const isPenumbra = solarFraction > 0.001 && solarFraction < 0.999;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className="text-[var(--lm-color-text-secondary)] font-semibold">Observer Mast:</span>
        <span className="px-2 py-0.5 rounded bg-[var(--lm-color-info-surface-strong)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] font-bold">
          {mastHeightMeters.toFixed(1)}m
        </span>
        <input
          type="range"
          min="0"
          max="40"
          step="1"
          value={mastHeightMeters}
          onChange={(e) => onMastHeightChange(Number(e.target.value))}
          className="w-24 sm:w-32 accent-[var(--lm-color-info)] cursor-pointer"
          title="Observer mast height above local ground (0-40m)"
        />
        <div className="flex items-center gap-1">
          {PRESET_MASTS.map(({ label, val, title }) => (
            <button
              key={label}
              type="button"
              title={title}
              onClick={() => onMastHeightChange(val)}
              className={`px-1.5 py-0.5 rounded text-[11px] cursor-pointer ${
                mastHeightMeters === val
                  ? 'bg-[var(--lm-color-info)] text-[var(--lm-color-canvas)] font-bold'
                  : 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--lm-color-text-secondary)]">Solar Penumbra:</span>
        <span
          title="Solar-disk visible fraction from a chord model with a limb-darkening term. It is a disk-visibility fraction, not an irradiance-weighted flux fraction and not generated electrical power."
          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
            solarFraction >= 0.999
              ? 'bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)] border-[var(--lm-color-warning-border)]'
              : isPenumbra
              ? 'bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)] border-[var(--lm-color-warning-border)]'
              : 'bg-[var(--lm-color-surface)] text-[var(--lm-color-text-muted)] border-[var(--lm-color-border)]'
          }`}
        >
          f_⊙ {(solarFraction * 100).toFixed(1)}% {isPenumbra ? '(Penumbra)' : ''}
        </span>
      </div>
    </div>
  );
}

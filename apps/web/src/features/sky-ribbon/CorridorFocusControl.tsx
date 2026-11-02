import React from 'react';
import { CORRIDOR_FOCUS_PRESETS } from './skyRibbonProjection';

export interface CorridorFocusControlProps {
  spanDeg: number;
  onChange: (spanDeg: number) => void;
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-info)]';

/**
 * Azimuth-arc selector for the grazing corridor. Changing the arc re-centres the
 * azimuth window only — the elevation axis stays fixed at -5°…+10° and strictly
 * linear, which is what keeps two corridors comparable side by side.
 */
export const CorridorFocusControl: React.FC<CorridorFocusControlProps> = ({ spanDeg, onChange }) => (
  <div className="flex items-center gap-1" role="group" aria-label="Corridor azimuth arc">
    <span className="font-mono text-[11px] uppercase text-[var(--lm-color-text-muted)]">Azimuth arc</span>
    {CORRIDOR_FOCUS_PRESETS.map((preset) => (
      <button
        key={preset.id}
        type="button"
        aria-pressed={spanDeg === preset.spanDeg}
        onClick={() => onChange(preset.spanDeg)}
        className={`min-h-[28px] rounded border px-2 py-1 font-mono text-[11px] font-bold transition-colors ${FOCUS_RING} ${
          spanDeg === preset.spanDeg
            ? 'border-[var(--lm-color-info-border)] bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)]'
            : 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
        }`}
      >
        {preset.label}
      </button>
    ))}
  </div>
);

import React from 'react';
import { CorridorFocusControl } from './CorridorFocusControl';
import { describeDiskProvenance, type SolarDiskModel } from './skyRibbonDisk';

export interface CorridorHeaderProps {
  disk: SolarDiskModel;
  spanDeg: number;
  onSpanChange: (spanDeg: number) => void;
}

const DISK_STATE = {
  boundary: { tone: 'success', text: 'BOUNDARY (API)' },
  'limb-only': { tone: 'warning', text: 'LIMBS ONLY' },
  unsupported: { tone: 'muted', text: 'UNAVAILABLE' },
} as const;

const TONE_CLASS = {
  success: 'border-[var(--lm-color-success-border)] bg-[var(--lm-color-success-surface)] text-[var(--lm-color-success)]',
  warning: 'border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)]',
  muted: 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-muted)]',
} as const;

/**
 * Panel 2 header: scale policy, apparent-disk provenance (§4) and the azimuth-arc control.
 * The disk state is stated as a word, not implied by the presence of a drawing — an unsupported
 * disk must read as unsupported.
 */
export const CorridorHeader: React.FC<CorridorHeaderProps> = ({ disk, spanDeg, onSpanChange }) => {
  const state = DISK_STATE[disk.kind];
  return (
    <header className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-2">
          <h3 className="text-[length:var(--lm-text-h3)] font-semibold leading-tight text-[var(--lm-color-text-primary)]">
            Panel 2 · Grazing Corridor
          </h3>
          <span className="font-mono text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]">
            EL −5.0°…+10.0° · STRICTLY LINEAR
          </span>
        </div>
        <CorridorFocusControl spanDeg={spanDeg} onChange={onSpanChange} />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          data-testid="corridor-disk-state"
          data-disk-support={disk.kind}
          className={`inline-flex items-center gap-1.5 rounded-[var(--lm-radius-xs)] border px-2 py-0.5 font-mono text-[length:var(--lm-text-micro)] font-bold uppercase tracking-wide ${TONE_CLASS[state.tone]}`}
        >
          APPARENT DISK · {state.text}
        </span>
        <span className="font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          {describeDiskProvenance(disk)}
        </span>
      </div>
      <p className="text-[length:var(--lm-text-label)] text-[var(--lm-color-text-muted)]">
        How does the apparent solar disk intersect the terrain skyline at this instant?
      </p>
    </header>
  );
};

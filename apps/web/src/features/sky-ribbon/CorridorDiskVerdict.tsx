import React from 'react';
import type { SolarReadout } from './skyRibbonAnalysis';
import type { SolarDiskModel } from './skyRibbonDisk';
import { formatPercent, formatSignedDeg } from './skyRibbonFormat';

/**
 * The corridor's disk verdict block.
 *
 * Split from `GrazingCorridorCanvas` so the panel component stays under the AGENTS.md §5.1
 * presentation cap and keeps one job: wiring the canvas, cursor and paint effect together.
 */

const VERDICT_TONE = {
  full: { text: 'text-[var(--lm-color-success)]', border: 'border-[var(--lm-color-success-border)]' },
  partial: { text: 'text-[var(--lm-color-warning)]', border: 'border-[var(--lm-color-warning-border)]' },
  none: { text: 'text-[var(--lm-color-danger)]', border: 'border-[var(--lm-color-danger-border)]' },
  unknown: { text: 'text-[var(--lm-color-text-muted)]', border: 'border-[var(--lm-color-border)]' },
} as const;

export interface DiskVerdictProps {
  readonly solar: SolarReadout;
  readonly disk: SolarDiskModel;
}

export const DiskVerdict: React.FC<DiskVerdictProps> = ({ solar, disk }) => {
  const tone = VERDICT_TONE[solar.state];
  const limbs =
    disk.kind === 'boundary' || disk.kind === 'limb-only'
      ? `upper ${formatSignedDeg(disk.upperLimbDeg)} · lower ${formatSignedDeg(disk.lowerLimbDeg)}`
      : 'limbs unavailable';
  return (
    <div
      data-testid="corridor-disk-verdict"
      data-disk-support={disk.kind}
      className={`flex min-w-0 flex-col gap-1 rounded-[var(--lm-radius-sm)] border bg-[var(--lm-color-surface-raised)] px-2.5 py-2 ${tone.border}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]">
          Apparent disk
        </span>
        <span className={`font-mono text-[length:var(--lm-text-micro)] font-bold uppercase ${tone.text}`}>
          [{solar.badge}]
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono tabular-nums">
        <span className={`text-[length:var(--lm-text-h3)] font-semibold ${tone.text}`}>
          {formatPercent(solar.diskFraction)}
        </span>
        <span className="text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          visible area fraction
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-x-3 font-mono text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-muted)] sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt>clearance</dt>
          <dd className="text-[var(--lm-color-text-secondary)]">
            {formatSignedDeg(solar.clearanceDeg)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>irradiance-weighted</dt>
          <dd className="text-[var(--lm-color-text-secondary)]">
            {solar.irradianceFraction === null ? 'unavailable' : formatPercent(solar.irradianceFraction)}
          </dd>
        </div>
        <div className="col-span-full flex justify-between gap-2">
          <dt>limbs</dt>
          <dd className="text-[var(--lm-color-text-secondary)]">{limbs}</dd>
        </div>
      </dl>
    </div>
  );
};

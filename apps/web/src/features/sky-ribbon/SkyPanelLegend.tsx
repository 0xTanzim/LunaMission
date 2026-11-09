import React from 'react';
import type { SkylineSource, SkylineTopology } from './skyRibbonSkyline';
import type { SolarDiskModel } from './skyRibbonDisk';
import type { TrajectorySeries } from './skyRibbonTrajectory';
import { describeDiskProvenance } from './skyRibbonDisk';

export interface SkyPanelLegendProps {
  readonly skylineSource: SkylineSource;
  readonly skylineTopology: SkylineTopology;
  readonly trajectories: readonly TrajectorySeries[];
  /** Present on the grazing-corridor panel only. */
  readonly disk?: SolarDiskModel;
  readonly showGrazingWindows?: boolean;
}

interface LegendEntry {
  readonly swatch: React.ReactNode;
  readonly label: string;
  readonly detail?: string;
}

const SWATCH_BASE = 'inline-block h-2.5 w-4 shrink-0 rounded-[2px] border';

/** Repeating-linear-gradient stand-ins so a hatch legend matches the canvas hatch. */
const HATCH_BACKGROUND: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 4px)',
};

function sampleSwatch(colour: string): React.ReactNode {
  return (
    <span className={`${SWATCH_BASE} border-transparent`} aria-hidden="true">
      <svg viewBox="0 0 16 10" className="h-full w-full" role="presentation">
        <line x1="0" y1="5" x2="16" y2="5" stroke={colour} strokeWidth="1" strokeDasharray="4 3" />
        <circle cx="4" cy="5" r="1.6" fill={colour} />
        <circle cx="12" cy="5" r="1.6" fill={colour} />
      </svg>
    </span>
  );
}

/**
 * Legend for a sky panel. Names every visual distinction the canvas makes, in particular the
 * measured-versus-rendered contract: a published bin is a dot, the segment between two bins is a
 * dashed interpolation, and a hatched band is a gap with no bins at all.
 */
export const SkyPanelLegend: React.FC<SkyPanelLegendProps> = ({
  skylineSource,
  skylineTopology,
  trajectories,
  disk,
  showGrazingWindows = false,
}) => {
  const binCount = skylineTopology.runs.reduce((total, run) => total + run.samples.length, 0);
  const entries: LegendEntry[] = [
    {
      swatch: (
        <span
          className={`${SWATCH_BASE} border-[var(--lm-color-border-strong)] bg-[var(--lm-color-surface-strong)]`}
          aria-hidden="true"
        />
      ),
      label: 'Terrain body (filled)',
      detail:
        skylineSource === 'horizon-bin'
          ? `${binCount} published horizon bins`
          : `${binCount} per-sub-interval mean skyline samples — no horizon bins published`,
    },
    {
      swatch: sampleSwatch('var(--lm-color-text-primary)'),
      label: 'Published sample · dashed segment = interpolation',
      detail:
        skylineTopology.medianStepDeg === null
          ? undefined
          : `${skylineTopology.medianStepDeg.toFixed(2)}° median bin step`,
    },
    {
      swatch: (
        <span
          className={`${SWATCH_BASE} border-[var(--lm-color-danger-border)] text-[var(--lm-color-danger)]`}
          style={HATCH_BACKGROUND}
          aria-hidden="true"
        />
      ),
      label: 'Terrain above the Sun — obstructed sector',
      detail: '✕ marks the contact azimuths',
    },
    ...trajectories
      .filter((series) => series.samples.length > 0)
      .map((series) => ({
        swatch: sampleSwatch(
          series.body === 'sun' ? 'var(--lm-color-sun)' : 'var(--lm-color-earth)',
        ),
        label: `${series.body === 'sun' ? 'Sun' : 'Earth'} · dot = sub-interval sample`,
        detail: `${series.samples.length} samples · ${series.seamBreaks} path break(s) across the bearing seam`,
      })),
    {
      swatch: (
        <span
          className={`${SWATCH_BASE} border-[var(--lm-color-focus)] bg-[var(--lm-color-focus)]`}
          aria-hidden="true"
        />
      ),
      label: 'Playhead',
    },
  ];

  if (skylineTopology.gaps > 0) {
    entries.push({
      swatch: (
        <span
          className={`${SWATCH_BASE} border-[var(--lm-color-warning-border)] text-[var(--lm-color-warning)]`}
          style={HATCH_BACKGROUND}
          aria-hidden="true"
        />
      ),
      label: 'Azimuth gap — no published bin',
      detail: `${skylineTopology.gaps} gap(s); runs are never joined across a gap`,
    });
  }

  if (showGrazingWindows) {
    entries.push({
      swatch: (
        <span
          className="inline-block h-2.5 w-0 shrink-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-[var(--lm-color-danger)]"
          aria-hidden="true"
        />
      ),
      label: 'Critical grazing window',
      detail: 'part of the disk above the ridge · filled flag = active window',
    });
  }

  if (disk) {
    entries.push({
      swatch: (
        <span
          className={`${SWATCH_BASE} border-[var(--lm-color-sun)] bg-[var(--lm-color-sun)]/25`}
          aria-hidden="true"
        />
      ),
      label: 'Apparent solar disk',
      detail: describeDiskProvenance(disk),
    });
  }

  return (
    <ul
      role="list"
      data-testid="sky-panel-legend"
      className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[var(--lm-color-text-secondary)] pt-1"
    >
      {entries.map((entry) => (
        <li
          key={entry.label}
          title={entry.detail ? `${entry.label}: ${entry.detail}` : entry.label}
          className="flex min-w-0 items-center gap-1.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)]/70 px-2 py-0.5 text-[11px]"
        >
          <span className="flex items-center shrink-0">{entry.swatch}</span>
          <span className="font-medium text-[var(--lm-color-text-primary)]">{entry.label}</span>
          {entry.detail && (
            <span className="text-[var(--lm-color-text-muted)] text-[11px]">
              · {entry.detail}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

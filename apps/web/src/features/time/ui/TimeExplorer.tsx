import { formatAngle } from '@/shared/formatting/formatters';

import { TimeExplorerControls } from '@/features/time/components/controls/TimeExplorerControls';
import { TimeMetricCallouts } from '@/features/time/components/readouts/TimeMetricCallouts';
import { TimeSeriesChart } from '@/features/time/components/chart/TimeSeriesChart';
import { TimeSeriesTable } from '@/features/time/components/readouts/TimeSeriesTable';
import { readInstantReadouts } from '@/features/time/model/timeInstantReadouts';
import { useTimeExplorerWindow } from '@/features/time/hooks/useTimeExplorerWindow';

/**
 * Composition only: the window and playback live in `useTimeExplorerWindow`, the
 * axis maths in `timeChartGeometry`, and each block of markup in its own view.
 */
export function TimeExplorer() {
  const explorer = useTimeExplorerWindow();
  const readouts = readInstantReadouts(explorer.conditions);
  const epochClockUtc = explorer.currentIsoUtc.substring(11, 16);

  return (
    <section
      aria-label="Time Explorer"
      className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] p-4 sm:p-5 flex flex-col gap-4 shadow-xs"
    >
      <TimeExplorerControls
        windowHours={explorer.windowHours}
        onWindowHoursChange={explorer.handleWindowHoursChange}
        stepHours={explorer.stepHours}
        onStepBackward={explorer.stepBackward}
        onStepForward={explorer.stepForward}
        isPlaying={explorer.isPlaying}
        onTogglePlaying={() => explorer.setPlaying(!explorer.isPlaying)}
        playbackSpeed={explorer.playbackSpeed}
        onSpeedChange={explorer.setPlaybackSpeed}
        onResetToSelectedEpoch={explorer.handleResetToSelectedEpoch}
        showDataTable={explorer.showDataTable}
        onToggleDataTable={() => explorer.setShowDataTable(!explorer.showDataTable)}
      />

      <TimeMetricCallouts readouts={readouts} epochClockUtc={epochClockUtc} />

      <TimeSeriesChart
        points={explorer.points}
        windowHours={explorer.windowHours}
        stepHours={explorer.stepHours}
        currentEpochMs={explorer.currentEpochMs}
        currentIsoUtc={explorer.currentIsoUtc}
        instantSunElevationDeg={readouts.sunElevationDeg}
        instantEarthElevationDeg={readouts.earthElevationDeg}
        onScrubToEpoch={explorer.setEpoch}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono-num text-[var(--lm-color-text-muted)] pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-[var(--lm-color-sun)] rounded-full" />
            <span className="text-[var(--lm-color-sun)] font-semibold">
              Sun ({formatAngle(readouts.sunElevationDeg, { decimals: 2, sign: true })})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-[var(--lm-color-earth)] rounded-full" />
            <span className="text-[var(--lm-color-earth)] font-semibold">
              Earth Geometric LoS ({formatAngle(readouts.earthElevationDeg, { decimals: 2, sign: true })})
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--lm-color-text-disabled)]">
            <span className="w-3.5 border-b border-dashed border-[var(--lm-color-selected-site)]" />
            <span>0° Mean Horizon</span>
          </div>
        </div>

        <div className="text-[11px] text-[var(--lm-color-text-secondary)]">
          Click or scrub the chart to jump UTC epoch • Hit Play to simulate
        </div>
      </div>

      {explorer.showDataTable && (
        <TimeSeriesTable
          points={explorer.points}
          currentIsoUtc={explorer.currentIsoUtc}
          onSelectEpoch={explorer.setEpoch}
        />
      )}
    </section>
  );
}

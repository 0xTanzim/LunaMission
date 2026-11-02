import { useId, useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { useScenarioState } from '@/app/state/useScenarioState';
import { TimeExplorer } from '@/features/time/ui/TimeExplorer';
import type { ResultAvailability } from '@/domain/celestial/availability';

function readAngle(result: ResultAvailability<number>, unit = '°'): string {
  if (result.kind !== 'available') return `unavailable (${result.kind})`;
  const sign = result.value > 0 ? '+' : '';
  return `${sign}${result.value.toFixed(2)}${unit}`;
}

/**
 * The temporal explorer, collapsible.
 *
 * The home page opens it expanded — scrubbing time is a first-class part of reading the
 * map, and the full series chart is the default reading. Collapsed it keeps the instant
 * readout (epoch, Sun, Earth) while the map takes the height.
 */
export function TemporalExplorerDock() {
  const [isExpanded, setIsExpanded] = useState(true);
  const panelId = useId();
  const { conditions, epochIsoUtc } = useScenarioModel();
  const { state } = useScenarioState();
  const durationDays = state?.missionEpoch?.durationDays;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] px-3 py-1.5">
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          aria-label="Time Explorer"
          className="flex min-h-7 min-w-0 cursor-pointer items-center gap-2 rounded-[var(--lm-radius-xs)] text-[length:var(--lm-text-label)] font-semibold text-[var(--lm-color-text-primary)] transition-colors hover:text-[var(--lm-color-info)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--lm-color-info)]" aria-hidden="true" />
          <span className="whitespace-nowrap">Temporal explorer</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform motion-safe:duration-150 ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">
          <span className="tabular-nums text-[var(--lm-color-text-secondary)]" data-testid="temporal-dock-epoch">
            {epochIsoUtc}
          </span>
          {typeof durationDays === 'number' && <span>{durationDays} d window</span>}
          <span className="text-[var(--lm-color-sun)]" data-testid="temporal-dock-sun">
            Sun {readAngle(conditions.sunElevationDeg)}
          </span>
          <span className="text-[var(--lm-color-earth)]" data-testid="temporal-dock-earth">
            Earth {readAngle(conditions.earthElevationDeg)}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div id={panelId}>
          <TimeExplorer />
        </div>
      )}
    </div>
  );
}

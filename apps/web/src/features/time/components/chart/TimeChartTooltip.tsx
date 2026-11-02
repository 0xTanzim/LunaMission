import type { TimelineDataPoint } from '@/domain/celestial/timeline';
import { formatAngle } from '@/shared/formatting/formatters';

import { spanRatio } from '@/features/time/model/chart/timeChartGeometry';

/** Tooltip horizontal band: never closer than this to either chart edge. */
const TOOLTIP_MIN_PERCENT = 10;
const TOOLTIP_MAX_PERCENT = 80;
const TOOLTIP_TOP_PX = 12;

export interface TimeChartTooltipProps {
  point: TimelineDataPoint;
  firstPointMs: number;
  lastPointMs: number;
}

/** Readout for the sample under the pointer. */
export function TimeChartTooltip({ point, firstPointMs, lastPointMs }: TimeChartTooltipProps) {
  const percent =
    Math.min(TOOLTIP_MAX_PERCENT, Math.max(TOOLTIP_MIN_PERCENT,
      spanRatio(point.epochMs, firstPointMs, lastPointMs) * 100));

  return (
    <div
      className="absolute z-20 pointer-events-none bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] p-2.5 shadow-xl text-xs font-mono-num backdrop-blur-sm"
      style={{ left: `${percent}%`, top: `${TOOLTIP_TOP_PX}px` }}
    >
      <div className="font-semibold text-[var(--lm-color-selected-site)] border-b border-[var(--lm-color-border-subtle)] pb-1 mb-1">
        {point.timestampUtc}
      </div>
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--lm-color-sun)]">Sun Elevation:</span>
          <span className="font-semibold">
            {formatAngle(point.sunElevationDeg, { decimals: 2, sign: true })}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--lm-color-earth)]">Earth Elevation:</span>
          <span className="font-semibold">
            {formatAngle(point.earthElevationDeg, { decimals: 2, sign: true })}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-[var(--lm-color-text-muted)] pt-0.5 border-t border-[var(--lm-color-border-subtle)]">
          <span>Status:</span>
          <span>
            {point.solarIlluminated ? 'Illuminated' : 'Shadowed'} • {point.earthVisible ? 'LOS' : 'Obscured'}
          </span>
        </div>
      </div>
    </div>
  );
}

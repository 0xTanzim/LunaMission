import { Globe as EarthIcon, Sun } from 'lucide-react';

import { formatAngle, formatDistance } from '@/shared/formatting/formatters';

import {
  earthVisibilityLabel,
  earthVisibilityTone,
  solarIlluminationLabel,
  solarIlluminationTone,
  statusBadgeTone,
  STATUS_BADGE_BASE,
  type TimeInstantReadouts,
} from '@/features/time/model/timeInstantReadouts';

const CARD_BASE =
  'bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-md)] p-3.5 flex items-start justify-between';
const LABEL_BASE = 'text-xs font-mono font-semibold uppercase tracking-wider';
const VALUE_BASE = 'text-2xl sm:text-3xl font-mono font-bold tracking-tight';

export interface TimeMetricCalloutsProps {
  readouts: TimeInstantReadouts;
  /** `HH:MM` slice of the canonical ISO-8601 instant. */
  epochClockUtc: string;
}

/** Current-instant Sun and Earth elevation cards. */
export function TimeMetricCallouts({ readouts, epochClockUtc }: TimeMetricCalloutsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className={CARD_BASE}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-4 h-4 text-[var(--lm-color-sun)]" />
            <span className={`${LABEL_BASE} text-[var(--lm-color-sun)]`}>Sun Elevation</span>
          </div>
          <div className={`${VALUE_BASE} text-[var(--lm-color-sun)]`}>
            {formatAngle(readouts.sunElevationDeg, { decimals: 2, sign: true })}
          </div>
          <div className="text-xs text-[var(--lm-color-text-muted)] mt-1">
            Elevation at selected epoch ({epochClockUtc} UTC)
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className={`${STATUS_BADGE_BASE} ${statusBadgeTone(solarIlluminationTone(readouts.solarIllumination))}`}>
            {solarIlluminationLabel(readouts.solarIllumination)}
          </span>
          <span className="text-[11px] font-mono text-[var(--lm-color-text-secondary)]">
            Horizon clearance: {formatAngle(readouts.sunClearanceDeg, { decimals: 2, sign: true })}
          </span>
        </div>
      </div>

      <div className={CARD_BASE}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <EarthIcon className="w-4 h-4 text-[var(--lm-color-earth)]" />
            <span className={`${LABEL_BASE} text-[var(--lm-color-earth)]`}>Earth Elevation (geometric LoS)</span>
          </div>
          <div className={`${VALUE_BASE} text-[var(--lm-color-earth)]`}>
            {formatAngle(readouts.earthElevationDeg, { decimals: 2, sign: true })}
          </div>
          <div className="text-xs text-[var(--lm-color-text-muted)] mt-1">
            Elevation at selected epoch ({epochClockUtc} UTC)
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className={`${STATUS_BADGE_BASE} ${statusBadgeTone(earthVisibilityTone(readouts.earthVisibility))}`}>
            {earthVisibilityLabel(readouts.earthVisibility)}
          </span>
          <span className="text-[11px] font-mono text-[var(--lm-color-text-secondary)]">
            Clearance: {formatAngle(readouts.earthClearanceDeg, { decimals: 2, sign: true })} • Range: {formatDistance(readouts.rangeKm, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

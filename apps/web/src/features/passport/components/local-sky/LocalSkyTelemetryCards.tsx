import React from 'react';
import { Sun, Globe as EarthIcon } from 'lucide-react';
import { formatAngle, formatDuration, formatNumber } from '@/shared/formatting/formatters';
import { TelemetryRow } from '@/features/passport/components/summary/TelemetryRow';
import { clearanceVerdict, type LocalSkyReadouts } from '@/features/passport/model/localSkyReadouts';
import {
  CARD_INDETERMINATE_BADGE,
  AMBER_BADGE,
  CLEARANCE_BADGE_BASE,
  ROSE_BADGE,
  clearanceBadgeClass,
  clearanceValueTone,
} from '@/features/passport/model/localSkyStatusStyles';

/**
 * Solar and Earth line-of-sight summaries under the compact horizon chart. The
 * illumination badge mirrors the solar status: clearance above the local mask
 * means lit disk, below means shadowed.
 */

export const EARTH_SUBTENDED_DISC_LABEL = '~1.91°';

interface LocalSkyTelemetryCardsProps {
  readouts: LocalSkyReadouts;
}

export function LocalSkyTelemetryCards({ readouts }: LocalSkyTelemetryCardsProps) {
  const {
    sunElevationDeg,
    sunAzimuthDeg,
    earthElevationDeg,
    earthAzimuthDeg,
    terrainAtSunAzimuthDeg,
    lightTimeSeconds,
    illuminationPercent,
    sunClearanceDeg,
    earthClearanceDeg,
  } = readouts;

  const sunVerdict = clearanceVerdict(sunClearanceDeg);
  const earthVerdict = clearanceVerdict(earthClearanceDeg);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      {/* Left: Solar Elevation & Illumination */}
      <div className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-xs)] p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--lm-color-border-subtle)] mb-1.5">
          <span className="font-semibold text-[var(--lm-color-sun)] flex items-center gap-1 font-mono">
            <Sun className="w-3.5 h-3.5" />
            <span>Solar Elevation &amp; Illumination</span>
          </span>
          <span className={`${CLEARANCE_BADGE_BASE} ${clearanceBadgeClass(sunClearanceDeg, CARD_INDETERMINATE_BADGE, ROSE_BADGE)}`}>
            {sunVerdict === 'indeterminate'
              ? 'Status Indeterminate'
              : sunVerdict === 'clear'
              ? `${formatNumber(illuminationPercent, { decimals: 1 })}% solar disk visible`
              : 'Shadowed'}
          </span>
        </div>

        <div className="space-y-1 font-mono-num text-[11px]">
          <TelemetryRow
            label="Topocentric Elevation:"
            className="text-[var(--lm-color-sun)] font-semibold"
          >
            {formatAngle(sunElevationDeg, { decimals: 3, sign: true })}
          </TelemetryRow>
          <TelemetryRow
            label="Azimuth (North-Clockwise):"
            className="text-[var(--lm-color-text-primary)]"
          >
            {formatAngle(sunAzimuthDeg, { decimals: 2 })}
          </TelemetryRow>
          <TelemetryRow
            label="Local Terrain Obstruction:"
            className="text-[var(--lm-color-text-secondary)]"
          >
            {formatAngle(terrainAtSunAzimuthDeg, { decimals: 2 })}
          </TelemetryRow>
          <TelemetryRow
            label="Horizon Clearance:"
            className={`font-semibold ${clearanceValueTone(sunClearanceDeg)}`}
            divider
          >
            {formatAngle(sunClearanceDeg, { decimals: 3, sign: true })}
          </TelemetryRow>
        </div>
      </div>

      {/* Right: Earth Elevation & Line-of-Sight */}
      <div className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-xs)] p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--lm-color-border-subtle)] mb-1.5">
          <span className="font-semibold text-[var(--lm-color-earth)] flex items-center gap-1 font-mono">
            <EarthIcon className="w-3.5 h-3.5" />
            <span>Earth Elevation &amp; Line-of-Sight</span>
          </span>
          <span className={`${CLEARANCE_BADGE_BASE} ${clearanceBadgeClass(earthClearanceDeg, CARD_INDETERMINATE_BADGE, AMBER_BADGE)}`}>
            {earthVerdict === 'indeterminate'
              ? 'Status Indeterminate'
              : earthVerdict === 'clear'
              ? 'Geometric Line-of-Sight'
              : 'Occulted (geometric)'}
          </span>
        </div>

        <div className="space-y-1 font-mono-num text-[11px]">
          <TelemetryRow
            label="Topocentric Elevation:"
            className="text-[var(--lm-color-earth)] font-semibold"
          >
            {formatAngle(earthElevationDeg, { decimals: 3, sign: true })}
          </TelemetryRow>
          <TelemetryRow
            label="Azimuth (North-Clockwise):"
            className="text-[var(--lm-color-text-primary)]"
          >
            {formatAngle(earthAzimuthDeg, { decimals: 2 })}
          </TelemetryRow>
          <TelemetryRow
            label="Earth Subtended Disc:"
            className="text-[var(--lm-color-text-secondary)]"
          >
            {EARTH_SUBTENDED_DISC_LABEL}
          </TelemetryRow>
          <TelemetryRow
            label="Theoretical 1-Way Light Time:"
            className="text-[var(--lm-color-text-primary)] font-semibold"
            divider
          >
            {formatDuration(lightTimeSeconds, 4)}
          </TelemetryRow>
        </div>
      </div>
    </div>
  );
}

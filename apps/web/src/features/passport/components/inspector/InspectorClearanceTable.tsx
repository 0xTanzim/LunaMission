import React from 'react';
import { Sun, Globe as EarthIcon } from 'lucide-react';
import { formatAngle, formatNumber } from '@/shared/formatting/formatters';
import { clearanceVerdict, type LocalSkyReadouts } from '@/features/passport/model/localSkyReadouts';
import {
  AMBER_BADGE,
  CLEARANCE_BADGE_BASE,
  COLOR_DANGER,
  COLOR_WARNING,
  ROSE_BADGE,
  TABLE_INDETERMINATE_BADGE,
  clearanceBadgeClass,
  clearanceValueTone,
} from '@/features/passport/model/localSkyStatusStyles';

/**
 * Numeric audit of the same values the chart plots: each body's elevation against
 * the sampled terrain mask, plus the site's horizon profile constants.
 */

interface InspectorClearanceTableProps {
  readouts: LocalSkyReadouts;
}

export function InspectorClearanceTable({ readouts }: InspectorClearanceTableProps) {
  const { sunClearanceDeg, earthClearanceDeg } = readouts;

  return (
    <div className="bg-[var(--lm-color-surface-raised)] rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] p-3">
      <h3 className="text-xs font-semibold text-[var(--lm-color-text-primary)] uppercase tracking-wider font-mono mb-2">
        Synchronized Horizon Measurements &amp; Clearance Audit
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono-num text-left">
          <thead>
            <tr className="text-[var(--lm-color-text-muted)] border-b border-[var(--lm-color-border-subtle)]">
              <th className="pb-1.5 font-medium">Target / Feature</th>
              <th className="pb-1.5 font-medium">Elevation</th>
              <th className="pb-1.5 font-medium">Azimuth (N-CW)</th>
              <th className="pb-1.5 font-medium">Horizon Mask</th>
              <th className="pb-1.5 font-medium">Clearance Margin</th>
              <th className="pb-1.5 font-medium">Observational Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-secondary)]">
            <tr>
              <td className="py-2 font-semibold text-[var(--lm-color-sun)] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                <span>Sun Disk Center</span>
              </td>
              <td className="py-2 font-bold text-[var(--lm-color-sun)]">
                {formatAngle(readouts.sunElevationDeg, { decimals: 3, sign: true })}
              </td>
              <td className="py-2">{formatAngle(readouts.sunAzimuthDeg, { decimals: 2 })}</td>
              <td className="py-2">{formatAngle(readouts.terrainAtSunAzimuthDeg, { decimals: 2 })}</td>
              <td className="py-2">
                <span className={`font-semibold ${clearanceValueTone(sunClearanceDeg, COLOR_DANGER)}`}>
                  {formatAngle(sunClearanceDeg, { decimals: 3, sign: true })}
                </span>
              </td>
              <td className="py-2">
                <span className={`${CLEARANCE_BADGE_BASE} ${clearanceBadgeClass(sunClearanceDeg, TABLE_INDETERMINATE_BADGE, ROSE_BADGE)}`}>
                  {clearanceVerdict(sunClearanceDeg) === 'indeterminate'
                    ? 'Status Indeterminate'
                    : clearanceVerdict(sunClearanceDeg) === 'clear'
                    ? `${formatNumber(readouts.illuminationPercent, { decimals: 0 })}% solar disk visible`
                    : 'Shadowed / Occulted'}
                </span>
              </td>
            </tr>

            <tr>
              <td className="py-2 font-semibold text-[var(--lm-color-earth)] flex items-center gap-1.5">
                <EarthIcon className="w-3.5 h-3.5" />
                <span>Earth Disk Center</span>
              </td>
              <td className="py-2 font-bold text-[var(--lm-color-earth)]">
                {formatAngle(readouts.earthElevationDeg, { decimals: 3, sign: true })}
              </td>
              <td className="py-2">{formatAngle(readouts.earthAzimuthDeg, { decimals: 2 })}</td>
              <td className="py-2">{formatAngle(readouts.terrainAtEarthAzimuthDeg, { decimals: 2 })}</td>
              <td className="py-2">
                <span className={`font-semibold ${clearanceValueTone(earthClearanceDeg, COLOR_WARNING)}`}>
                  {formatAngle(earthClearanceDeg, { decimals: 3, sign: true })}
                </span>
              </td>
              <td className="py-2">
                <span className={`${CLEARANCE_BADGE_BASE} ${clearanceBadgeClass(earthClearanceDeg, TABLE_INDETERMINATE_BADGE, AMBER_BADGE)}`}>
                  {clearanceVerdict(earthClearanceDeg) === 'indeterminate'
                    ? 'Status Indeterminate'
                    : clearanceVerdict(earthClearanceDeg) === 'clear'
                    ? 'Geometric Line-of-Sight'
                    : 'Sub-Horizon / Occulted'}
                </span>
              </td>
            </tr>

            <tr>
              <td className="py-2 font-medium text-[var(--lm-color-text-primary)]">
                Max Terrain Peak Obstruction
              </td>
              <td className="py-2">{formatAngle(readouts.maxTerrainObstructionDeg, { decimals: 2 })}</td>
              <td className="py-2 text-[var(--lm-color-text-muted)]">Azimuth-variable</td>
              <td className="py-2">{formatAngle(readouts.maxTerrainObstructionDeg, { decimals: 2 })}</td>
              <td className="py-2 text-[var(--lm-color-text-muted)]">—</td>
              <td className="py-2 text-[11px] font-mono text-[var(--lm-color-text-muted)]">
                Crater rim crest profile
              </td>
            </tr>

            <tr>
              <td className="py-2 font-medium text-[var(--lm-color-text-primary)]">
                Mean Terrain Horizon Dip
              </td>
              <td className="py-2">{formatAngle(readouts.meanTerrainHorizonDeg, { decimals: 2 })}</td>
              <td className="py-2 text-[var(--lm-color-text-muted)]">Omnidirectional</td>
              <td className="py-2">{formatAngle(readouts.meanTerrainHorizonDeg, { decimals: 2 })}</td>
              <td className="py-2 text-[var(--lm-color-text-muted)]">—</td>
              <td className="py-2 text-[11px] font-mono text-[var(--lm-color-text-muted)]">
                Site mean horizon basis
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

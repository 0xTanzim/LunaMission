import React from 'react';
import { Sun, Globe as EarthIcon } from 'lucide-react';
import { formatAngle } from '@/shared/formatting/formatters';
import { UNAVAILABLE_PLACEHOLDER } from '@/shared/formatting/availability';
import { clearanceVerdict, type LocalSkyReadouts } from '@/features/passport/model/localSkyReadouts';

/**
 * Tabular reading of the compact chart, so the horizon geometry stays available to
 * screen readers and to anyone who does not read the plot.
 */
interface LocalSkySummaryTableProps {
  readouts: LocalSkyReadouts;
}

export function LocalSkySummaryTable({ readouts }: LocalSkySummaryTableProps) {
  const { sunClearanceDeg, earthClearanceDeg } = readouts;
  const sunVerdict = clearanceVerdict(sunClearanceDeg);
  const earthVerdict = clearanceVerdict(earthClearanceDeg);

  return (
    <div className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-xs)] p-2">
      <table className="w-full text-[11px] font-mono-num text-left">
        <thead>
          <tr className="text-[var(--lm-color-text-muted)] border-b border-[var(--lm-color-border-subtle)]">
            <th className="pb-1 font-medium">Target</th>
            <th className="pb-1 font-medium">Elevation</th>
            <th className="pb-1 font-medium">Azimuth</th>
            <th className="pb-1 font-medium">Local Clearance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-secondary)]">
          <tr>
            <td className="py-1 font-semibold text-[var(--lm-color-sun)] flex items-center gap-1">
              <Sun className="w-3 h-3" /> Sun
            </td>
            <td className="py-1">{formatAngle(readouts.sunElevationDeg, { decimals: 2, sign: true })}</td>
            <td className="py-1">{formatAngle(readouts.sunAzimuthDeg, { decimals: 1 })}</td>
            <td className="py-1">
              {sunVerdict === 'indeterminate'
                ? UNAVAILABLE_PLACEHOLDER
                : `${formatAngle(sunClearanceDeg, { decimals: 2, sign: true })} ${sunVerdict === 'clear' ? '(Clear)' : '(Obscured)'}`}
            </td>
          </tr>
          <tr>
            <td className="py-1 font-semibold text-[var(--lm-color-earth)] flex items-center gap-1">
              <EarthIcon className="w-3 h-3" /> Earth
            </td>
            <td className="py-1">{formatAngle(readouts.earthElevationDeg, { decimals: 2, sign: true })}</td>
            <td className="py-1">{formatAngle(readouts.earthAzimuthDeg, { decimals: 1 })}</td>
            <td className="py-1">
              {earthVerdict === 'indeterminate'
                ? UNAVAILABLE_PLACEHOLDER
                : `${formatAngle(earthClearanceDeg, { decimals: 2, sign: true })} ${earthVerdict === 'clear' ? '(centre clear)' : '(below horizon)'}`}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

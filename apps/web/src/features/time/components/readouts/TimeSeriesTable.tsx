import type { TimelineDataPoint } from '@/domain/celestial/timeline';
import { formatAngle } from '@/shared/formatting/formatters';

const ROW_BADGE_BASE = 'px-1.5 py-0.5 rounded-xs text-[11px] font-mono';
const ROW_BADGE_POSITIVE = 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)]';
const ROW_BADGE_CAUTION = 'bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning-border)]';
const ROW_BADGE_NEGATIVE = 'bg-[var(--lm-color-danger-surface-strong)] text-[var(--lm-color-danger)] border border-[var(--lm-color-danger-border)]';

export interface TimeSeriesTableProps {
  points: TimelineDataPoint[];
  /** Canonical ISO-8601 instant; the row that matches it is marked selected. */
  currentIsoUtc: string;
  onSelectEpoch: (epochMs: number) => void;
}

/** Keyboard/screen-reader view of the same samples the chart draws. */
export function TimeSeriesTable({ points, currentIsoUtc, onSelectEpoch }: TimeSeriesTableProps) {
  return (
    <div className="mt-2 border-t border-[var(--lm-color-border-subtle)] pt-3 overflow-x-auto max-h-72">
      <table className="w-full text-xs font-mono-num text-left">
        <thead>
          <tr className="border-b border-[var(--lm-color-border)] text-[var(--lm-color-text-muted)]">
            <th className="py-1.5 px-2.5">Sample Epoch (UTC)</th>
            <th className="py-1.5 px-2.5">Sun Elev (°)</th>
            <th className="py-1.5 px-2.5">Solar Illumination</th>
            <th className="py-1.5 px-2.5">Earth Elev (°)</th>
            <th className="py-1.5 px-2.5">Earth Line-of-Sight</th>
            <th className="py-1.5 px-2.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-secondary)]">
          {points.map((p) => {
            const isSelected = p.timestampUtc === currentIsoUtc;
            return (
              <tr
                key={p.timestampUtc}
                onClick={() => onSelectEpoch(p.epochMs)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[var(--lm-color-surface-raised)] font-bold text-[var(--lm-color-text-primary)]'
                    : 'hover:bg-[var(--lm-color-surface-raised)]/40'
                }`}
              >
                <td className="py-1.5 px-2.5 font-medium">{p.timestampUtc}</td>
                <td className="py-1.5 px-2.5 text-[var(--lm-color-sun)]">
                  {formatAngle(p.sunElevationDeg, { decimals: 2, sign: true })}
                </td>
                <td className="py-1.5 px-2.5">
                  <span className={`${ROW_BADGE_BASE} ${p.solarIlluminated ? ROW_BADGE_POSITIVE : ROW_BADGE_NEGATIVE}`}>
                    {p.solarIlluminated ? 'Illuminated' : 'Shadowed'}
                  </span>
                </td>
                <td className="py-1.5 px-2.5 text-[var(--lm-color-earth)]">
                  {formatAngle(p.earthElevationDeg, { decimals: 2, sign: true })}
                </td>
                <td className="py-1.5 px-2.5">
                  <span className={`${ROW_BADGE_BASE} ${p.earthVisible ? ROW_BADGE_POSITIVE : ROW_BADGE_CAUTION}`}>
                    {p.earthVisible ? 'Visible Line-of-Sight' : 'Sub-Horizon'}
                  </span>
                </td>
                <td className="py-1.5 px-2.5 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEpoch(p.epochMs);
                    }}
                    className="text-[11px] font-mono text-[var(--lm-color-selected-site)] underline hover:text-[var(--lm-color-text-primary)]"
                  >
                    Select
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

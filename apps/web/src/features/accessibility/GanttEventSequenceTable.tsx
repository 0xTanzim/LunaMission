import React from 'react';
import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';

interface GanttEventSequenceTableProps {
  siteName: string;
  intervals: EvaluatedSubInterval[];
  eventWhiskers?: EventWhisker[];
  className?: string;
}

export const GanttEventSequenceTable: React.FC<GanttEventSequenceTableProps> = ({
  siteName,
  intervals,
  eventWhiskers,
  className = '',
}) => {
  return (
    <section
      role="region"
      aria-label={`Accessible Event Sequence Table for ${siteName}`}
      data-testid="gantt-event-sequence-table"
      className={`p-4 rounded-lg bg-[var(--lm-color-surface)]/90 border border-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-secondary)] text-xs font-mono shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3 border-b border-[var(--lm-color-border-subtle)] pb-2">
        <h3 className="font-semibold text-[var(--lm-color-text-primary)] uppercase tracking-wider text-sm">
          Sun &amp; Earth Event Sequence
        </h3>
        <span className="text-[var(--lm-color-text-muted)]">Total Intervals: {intervals.length}</span>
      </div>

      <div className="overflow-x-auto max-h-64 scrollbar-thin">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[var(--lm-color-canvas)] text-[var(--lm-color-text-muted)] uppercase text-[11px] tracking-wider border-b border-[var(--lm-color-border)]">
            <tr>
              <th scope="col" className="py-2 px-3">Start (UTC)</th>
              <th scope="col" className="py-2 px-3">End (UTC)</th>
              <th scope="col" className="py-2 px-3">Duration</th>
              <th scope="col" className="py-2 px-3">Solar State</th>
              <th scope="col" className="py-2 px-3">Visible Solar Disk (geom.)</th>
              <th scope="col" className="py-2 px-3">Earth Geometric LoS</th>
              <th scope="col" className="py-2 px-3">Concurrent Geom. Overlap</th>
              <th scope="col" className="py-2 px-3">Obstacle Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--lm-color-border-subtle)]/60">
            {intervals.map((int, i) => (
              <tr key={i} className="hover:bg-[var(--lm-color-surface-strong)]/40 transition-colors">
                <td className="py-1.5 px-3 whitespace-nowrap text-[var(--lm-color-text-secondary)]">{int.startDateUtc}</td>
                <td className="py-1.5 px-3 whitespace-nowrap text-[var(--lm-color-text-secondary)]">{int.endDateUtc}</td>
                <td className="py-1.5 px-3 font-semibold text-[var(--lm-color-warning)]">{int.durationHours.toFixed(2)}h</td>
                <td className="py-1.5 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                    int.sun.status === 'full_sun' ? 'bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)]' :
                    int.sun.status === 'partial_limb' ? 'bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)]' :
                    int.sun.status === 'terrain_shadow' ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)]' : 'bg-[var(--lm-color-canvas)] text-[var(--lm-color-text-muted)]'
                  }`}>
                    {int.sun.status.toUpperCase().replace('_', ' ')}
                  </span>
                </td>
                <td className="py-1.5 px-3 text-[var(--lm-color-text-secondary)]">
                  {(int.sun.fractionalSolarDiskVisibility * 100).toFixed(1)}%
                </td>
                <td className="py-1.5 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                    int.earth.status === 'visible' || int.earth.status === 'earth_direct' ? 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)]' : 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-muted)]'
                  }`}>
                    {int.earth.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-1.5 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                    int.overlap.status === 'sun_and_earth' ? 'bg-[var(--lm-color-info-surface-strong)] text-[var(--lm-color-info)]' : 'text-[var(--lm-color-text-muted)]'
                  }`}>
                    {int.overlap.status === 'sun_and_earth' ? 'CONCURRENT' : 'NONE'}
                  </span>
                </td>
                <td className="py-1.5 px-3 text-[var(--lm-color-text-muted)]">
                  {int.sun.blocker
                    ? `${int.sun.blocker.featureName ?? 'Ridge'} (Az: ${int.sun.blocker.azimuthDeg.toFixed(1)}°, Dist: ${int.sun.blocker.distanceKm.toFixed(1)}km)`
                    : 'Unblocked skyline'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-[var(--lm-color-text-muted)]">
        Observables: the visible-solar-disk column is the backend geometric (area) fraction of the
        apparent solar disk — not an irradiance-weighted fraction and not generated electrical power.
        Earth status is geometric line-of-sight, not an RF link closure. Concurrent overlap means the
        two geometric conditions hold together; it is not by itself a mission feasibility window.
      </p>
    </section>
  );
};

import React from 'react';
import type { RankedFeasibleCandidate } from '@luna/contracts';
import {
  RADAR_AXES,
  generateRadarPolygonPointsGapped,
  getRadarAxisPoint,
  readRadarProfile,
} from '../model/radarChartMath';
import { siteDisplayName } from '../model/siteDisplayName';

export interface SiteTradeStudyRadarProps {
  rankedCandidates: RankedFeasibleCandidate[];
  totalEvaluationHours: number;
  className?: string;
}

const SITE_PALETTE = [
  { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.18)', dash: 'none', labelClass: 'text-cyan-400' },
  { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.18)', dash: '4 4', labelClass: 'text-amber-400' },
  { stroke: '#10b981', fill: 'rgba(16,185,129,0.18)', dash: '2 2', labelClass: 'text-emerald-400' },
  { stroke: '#818cf8', fill: 'rgba(129,140,248,0.18)', dash: '6 2', labelClass: 'text-indigo-400' },
  { stroke: '#f43f5e', fill: 'rgba(244,63,94,0.18)', dash: '1 3', labelClass: 'text-rose-400' },
];

/**
 * Five-axis trade-off radar.
 *
 * The chart is qualitative by contract: every axis is normalized against a stated physical
 * bound, the bound is printed beside the chart, and the physical value each axis came from is
 * tabulated in its own unit underneath. Enclosed area is never a score — it changes with axis
 * order and axis scale — so the panel says so and carries no rank in its legend.
 */
export const SiteTradeStudyRadar: React.FC<SiteTradeStudyRadarProps> = ({
  rankedCandidates,
  totalEvaluationHours,
  className = '',
}) => {
  const displayCandidates = rankedCandidates.slice(0, 5);

  if (displayCandidates.length === 0) {
    return (
      <div
        className={`rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-4 text-center font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)] ${className}`}
      >
        No feasible candidate landing sites available for radar comparison.
      </div>
    );
  }

  const elevationBounds = {
    minElevationMeters: Math.min(...rankedCandidates.map((c) => c.coordinates.elevationMeters)),
    maxElevationMeters: Math.max(...rankedCandidates.map((c) => c.coordinates.elevationMeters)),
  };

  const profiles = displayCandidates.map((candidate) => ({
    candidate,
    readings: readRadarProfile(candidate, totalEvaluationHours, elevationBounds),
  }));

  const gapAxes = profiles[0]?.readings.filter((reading) => reading.ratio === null) ?? [];
  const size = 320;
  const center = { cx: size / 2, cy: size / 2 };
  const radius = 95;
  const rings = [25, 50, 75, 100];

  return (
    <figure
      aria-labelledby="radar-chart-title"
      className={`flex flex-col gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3 font-mono text-[length:var(--lm-text-micro)] ${className}`}
    >
      <figcaption className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            id="radar-chart-title"
            className="text-[length:var(--lm-text-label)] font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]"
          >
            Qualitative trade-off profile
          </span>
          <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] px-1.5 py-0.5 uppercase tracking-wide text-[var(--lm-color-text-muted)]">
            not a ranking
          </span>
        </span>
        <span className="leading-snug text-[var(--lm-color-text-secondary)]">
          Each axis is scaled 0–100% against the physical bound listed below it. Polygon area is
          not a score: it changes with axis order and axis scale, so read each axis on its own, with
          the measured value and unit beside the chart.
        </span>
      </figcaption>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start border-t border-[var(--lm-color-border-subtle)] pt-3">
        <div className="flex flex-col items-center gap-3">
          <div className="flex aspect-square w-full max-w-[320px] items-center justify-center">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="h-full w-full overflow-visible"
            role="img"
            aria-label="Five-axis qualitative trade-off profile. The same values are tabulated with their units below the chart."
          >
            {rings.map((ringPct) => {
              const points = RADAR_AXES.map((_, i) => {
                const pt = getRadarAxisPoint(i, ringPct, center, radius);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
              }).join(' ');
              return (
                <polygon
                  key={ringPct}
                  points={points}
                  fill={ringPct === 100 ? 'var(--lm-color-canvas)' : 'none'}
                  stroke="var(--lm-color-border-subtle)"
                  strokeWidth={ringPct === 100 ? '1.5' : '1'}
                  strokeDasharray={ringPct < 100 ? '2 2' : undefined}
                />
              );
            })}

            {RADAR_AXES.map((axis, i) => {
              const pt = getRadarAxisPoint(i, 100, center, radius);
              const labelPt = getRadarAxisPoint(i, 120, center, radius);
              const anchor =
                labelPt.x > center.cx + 10 ? 'start' : labelPt.x < center.cx - 10 ? 'end' : 'middle';
              return (
                <g key={axis.key}>
                  <line
                    x1={center.cx}
                    y1={center.cy}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="var(--lm-color-border-subtle)"
                    strokeWidth="1"
                  />
                  <text
                    x={labelPt.x}
                    y={labelPt.y + 3}
                    textAnchor={anchor}
                    className="fill-[var(--lm-color-text-secondary)] font-mono text-[length:var(--lm-text-micro)] font-medium"
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}

            {profiles.map(({ candidate, readings }, idx) => {
              const style = SITE_PALETTE[idx % SITE_PALETTE.length];
              const points = generateRadarPolygonPointsGapped(
                readings.map((reading) => reading.ratio),
                center,
                radius,
              );
              return (
                <polygon
                  key={candidate.siteId}
                  points={points}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="2"
                  strokeDasharray={style.dash === 'none' ? undefined : style.dash}
                />
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[var(--lm-color-border-subtle)] pt-2">
        {profiles.map(({ candidate }, idx) => {
          const style = SITE_PALETTE[idx % SITE_PALETTE.length];
          return (
            <span key={candidate.siteId} className="flex items-center gap-1.5">
              <svg width="18" height="8" aria-hidden="true" focusable="false">
                <line
                  x1="0"
                  y1="4"
                  x2="18"
                  y2="4"
                  stroke={style.stroke}
                  strokeWidth="2"
                  strokeDasharray={style.dash === 'none' ? undefined : style.dash}
                />
              </svg>
              <span className={style.labelClass}>
                {siteDisplayName(candidate.siteName, candidate.siteId)}
              </span>
            </span>
          );
        })}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h4 className="text-[length:var(--lm-text-micro)] font-bold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
          Normalisation
        </h4>
        <ul className="flex list-none flex-col gap-1 p-0">
          {RADAR_AXES.map((axis) => (
            <li
              key={axis.key}
              className="leading-snug text-[var(--lm-color-text-muted)]"
            >
              <span className="font-semibold text-[var(--lm-color-text-secondary)]">
                {axis.label}
              </span>{' '}
              = {axis.normalisation}. {axis.bound}
            </li>
          ))}
        </ul>
      </div>

      {gapAxes.length > 0 ? (
        <p
          data-testid="radar-unavailable-axis"
          className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-warning-border)] bg-[var(--lm-color-warning-surface)] p-2 leading-snug text-[var(--lm-color-warning)]"
        >
          {gapAxes.map((reading) => reading.label).join(', ')} is unavailable for this cohort:{' '}
          {gapAxes[0]?.unavailableReason} The plotted profile has a gap on that axis; no midpoint was
          invented to close it.
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <h4 className="text-[length:var(--lm-text-micro)] font-bold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
          Measured values, in their own units
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              The physical value behind each radar axis, for each plotted candidate, with its unit.
            </caption>
            <thead>
              <tr className="border-b border-[var(--lm-color-border)]">
                <th
                  scope="col"
                  className="p-1.5 font-normal uppercase tracking-wider text-[var(--lm-color-text-muted)]"
                >
                  Axis
                </th>
                {profiles.map(({ candidate }) => (
                  <th
                    key={candidate.siteId}
                    scope="col"
                    className="border-l border-[var(--lm-color-border-subtle)] p-1.5 font-semibold text-[var(--lm-color-text-secondary)]"
                  >
                    {siteDisplayName(candidate.siteName, candidate.siteId)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RADAR_AXES.map((axis) => (
                <tr
                  key={axis.key}
                  className="border-b border-[var(--lm-color-border-subtle)] last:border-b-0"
                >
                  <th scope="row" className="p-1.5 text-left font-normal">
                    <span className="block text-[var(--lm-color-text-secondary)]">{axis.label}</span>
                    <span className="block text-[var(--lm-color-text-muted)]">
                      {axis.description}
                    </span>
                  </th>
                  {profiles.map(({ candidate, readings }) => {
                    const reading = readings.find((entry) => entry.key === axis.key);
                    return (
                      <td
                        key={candidate.siteId}
                        className="border-l border-[var(--lm-color-border-subtle)] p-1.5 align-top"
                      >
                        {reading === undefined || reading.ratio === null ? (
                          <span
                            data-unavailable="true"
                            title={reading?.unavailableReason}
                            className="text-[var(--lm-color-text-muted)]"
                          >
                            <span className="border-b border-dashed border-[var(--lm-color-border-strong)]">
                              unavailable
                            </span>
                            <span className="sr-only">: {reading?.unavailableReason}</span>
                          </span>
                        ) : (
                          <span className="flex flex-col">
                            <span className="font-mono-num text-[var(--lm-color-text-primary)]">
                              {reading.valueText}
                            </span>
                            <span className="text-[var(--lm-color-text-muted)]">
                              {reading.ratio.toFixed(0)}% of axis
                            </span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</figure>
  );
};

import React from 'react';
import type { SummaryMetrics } from '@luna/contracts';

interface ExecutiveKpiStripProps {
  metrics: SummaryMetrics;
  maxDarkThresholdHours?: number;
  className?: string;
}

/** Two durations are the same reading when they differ by less than 3 minutes. */
const SAME_VALUE_EPSILON_H = 0.05;

function sameDurationHours(a: number, b: number): boolean {
  return Math.abs(a - b) < SAME_VALUE_EPSILON_H;
}

const TILE_CLASS =
  'bg-[var(--lm-color-canvas)] p-3 rounded-lg border border-[var(--lm-color-border-subtle)] flex flex-col gap-1 min-w-0';
const LABEL_CLASS =
  'text-[11px] font-mono text-[var(--lm-color-text-secondary)] uppercase tracking-wider';
const RELATION_CLASS =
  'text-[11px] font-mono leading-snug text-[var(--lm-color-text-muted)]';

/**
 * Six mission observables, presented as four tiles.
 *
 * At a ridge site a whole-window total and the longest continuous window are often
 * the *same* number, and the same happens to Earth line-of-sight and its overlap
 * with sunlight (Earth contact is a subset of sunlit time). Showing two identical
 * figures side by side reads like a broken calculation, so each pair is merged into
 * one tile that carries both readings and names the reason they agree. No figure is
 * dropped: the second value is always printed, whether or not it matches the first.
 */
export const ExecutiveKpiStrip: React.FC<ExecutiveKpiStripProps> = ({
  metrics,
  maxDarkThresholdHours = 16.0,
  className = '',
}) => {
  const isDarkPass = metrics.longestContinuousDarkWindowHours <= maxDarkThresholdHours;
  const sunlightIsContiguous = sameDurationHours(
    metrics.cumulativeSunlitHours,
    metrics.longestContinuousSunlitWindowHours,
  );
  const earthAccessIsSunlit = sameDurationHours(
    metrics.cumulativeDteHours,
    metrics.cumulativeOverlapHours,
  );
  // Backend accumulation can emit −0; −0.0h reads as a rounding artifact, and the tile
  // must not paint a zero cost in the danger tone (alarm fatigue on a decision tool).
  const terrainPenaltyHours = metrics.topographicShadowPenaltyHours === 0 ? 0 : metrics.topographicShadowPenaltyHours;
  const hasTerrainPenalty = terrainPenaltyHours > 0;

  return (
    <section
      role="region"
      aria-label="Mission Operational Executive KPI Metrics"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}
    >
      {/* 1. Total sunlight with its longest unbroken window */}
      <div className={TILE_CLASS}>
        <span className={LABEL_CLASS}>Total Sunlight</span>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xl font-bold font-mono text-[var(--lm-color-warning)]">
            {metrics.cumulativeSunlitHours.toFixed(1)}h
          </span>
          <span className="text-xs font-mono text-[var(--lm-color-text-secondary)]">
            ({metrics.solarAccessPercentage.toFixed(1)}%)
          </span>
        </div>
        <p data-testid="kpi-sunlight-relation" className={RELATION_CLASS}>
          Longest unbroken window {metrics.longestContinuousSunlitWindowHours.toFixed(1)}h
          {sunlightIsContiguous
            ? ' — equal to the total because sunlight never breaks here'
            : ' — the rest of the sunlight arrives in separate windows'}
        </p>
      </div>

      {/* 2. Max darkness blackout */}
      <div className={TILE_CLASS}>
        <div className="flex items-center justify-between gap-2">
          <span className={LABEL_CLASS}>Max Dark Blackout</span>
          <span
            className={`text-[11px] font-bold px-1.5 py-0.2 rounded uppercase ${
              isDarkPass
                ? 'bg-[var(--lm-color-success-surface)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)]'
                : 'bg-[var(--lm-color-danger-surface)] text-[var(--lm-color-danger)] border border-[var(--lm-color-danger-border)]'
            }`}
          >
            {isDarkPass ? 'PASS' : 'VIOLATION'}
          </span>
        </div>
        <div className="flex items-baseline gap-1 flex-wrap">
          <span
            className={`text-xl font-bold font-mono ${
              isDarkPass ? 'text-[var(--lm-color-text-primary)]' : 'text-[var(--lm-color-danger)]'
            }`}
          >
            {metrics.longestContinuousDarkWindowHours.toFixed(1)}h
          </span>
          <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)]">
            / ≤{maxDarkThresholdHours}h
          </span>
        </div>
      </div>

      {/* 3. Earth geometric line-of-sight (not an RF link budget) with its solar overlap */}
      <div className={TILE_CLASS}>
        <span className={LABEL_CLASS}>Earth LoS Access (geom.)</span>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xl font-bold font-mono text-[var(--lm-color-success)]">
            {metrics.cumulativeDteHours.toFixed(1)}h
          </span>
          <span className="text-xs font-mono text-[var(--lm-color-text-secondary)]">
            ({metrics.dteAccessPercentage.toFixed(1)}%)
          </span>
        </div>
        <p data-testid="kpi-overlap-relation" className={RELATION_CLASS}>
          Sun∩Earth LoS Overlap {metrics.cumulativeOverlapHours.toFixed(1)}h
          {earthAccessIsSunlit
            ? ' — equal to Earth LoS because Earth contact is a subset of sunlit time'
            : ' — part of the Earth LoS time falls in terrain shadow, so the overlap is smaller'}
        </p>
      </div>

      {/* 4. Terrain shadow penalty — toned by value: zero cost is not a threat. */}
      <div className={TILE_CLASS}>
        <span className={LABEL_CLASS}>Terrain Penalty</span>
        <div className="flex items-baseline gap-1 flex-wrap">
          <span
            className={`text-xl font-bold font-mono ${
              hasTerrainPenalty ? 'text-[var(--lm-color-danger)]' : 'text-[var(--lm-color-text-primary)]'
            }`}
          >
            {terrainPenaltyHours.toFixed(1)}h
          </span>
          <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)]">shadow</span>
        </div>
        <p data-testid="kpi-penalty-relation" className={RELATION_CLASS}>
          {hasTerrainPenalty
            ? 'Hours where the Sun clears the smooth horizon but local terrain blocks it'
            : 'No sunlit time is lost behind local terrain'}
        </p>
      </div>

      <p
        data-testid="kpi-observable-note"
        className="sm:col-span-2 lg:col-span-4 text-[11px] leading-relaxed text-[var(--lm-color-text-muted)] font-sans"
      >
        Observables: every duration above is{' '}
        <span className="text-[var(--lm-color-text-secondary)]">geometric solar-disk visibility</span>{' '}
        and <span className="text-[var(--lm-color-text-secondary)]">geometric Earth line-of-sight</span>{' '}
        against the published LOLA horizon bins. Sunlit hours are not generated electrical energy, and
        Earth LoS hours are not RF link closure — both are separate engineering models documented under
        Method &amp; Data.
      </p>
    </section>
  );
};

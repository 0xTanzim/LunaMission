import React from 'react';
import { Compass, ExternalLink, Mountain } from 'lucide-react';
import { useScenario, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { computeHorizonSummary } from '@/features/passport/model/horizonSummaryModel';
import { formatAngle } from '@/shared/formatting/formatters';
import { Badge } from '@/shared/ui/Badge';
import type { ClearanceVerdict } from '@/features/passport/model/localSkyReadouts';

export interface PassportHorizonSummaryProps {
  onNavigateHorizon?: () => void;
}

const VERDICT_BADGES: Record<ClearanceVerdict, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  clear: { label: 'Clear of Terrain', variant: 'success' },
  obscured: { label: 'Terrain Masked', variant: 'danger' },
  indeterminate: { label: 'Indeterminate', variant: 'warning' },
};

export function PassportHorizonSummary({ onNavigateHorizon }: PassportHorizonSummaryProps) {
  const { calculationMode } = useScenario();
  const { site, conditions } = useScenarioModel();
  const summary = computeHorizonSummary(conditions, site);

  const sunBadge = VERDICT_BADGES[summary.sunVerdict];
  const earthBadge = VERDICT_BADGES[summary.earthVerdict];

  return (
    <section className="flex flex-col gap-2.5 bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-[var(--lm-color-info)]" />
          <span className="text-xs font-semibold text-[var(--lm-color-info)] uppercase tracking-wider font-mono">
            Horizon Terrain Clearance
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--lm-color-selected-site)] bg-[var(--lm-color-surface-strong)] px-2 py-0.5 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-selected-site)]/40">
          {calculationMode === 'terrain-aware' ? 'LOLA 360° DEM' : 'Spherical Horizon'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-xs)] p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-mono text-[var(--lm-color-sun)] font-semibold">Sun ΔHorizon</span>
            <Badge variant={sunBadge.variant}>{sunBadge.label}</Badge>
          </div>
          <div className="text-lg font-bold font-mono-num text-[var(--lm-color-sun)]">
            {summary.sunClearanceDeg !== null
              ? formatAngle(summary.sunClearanceDeg, { decimals: 2, sign: true })
              : '—'}
          </div>
          <div className="text-[11px] font-mono text-[var(--lm-color-text-muted)] mt-1 truncate">
            {summary.sunMaskDeg !== null ? `Mask: ${formatAngle(summary.sunMaskDeg, { decimals: 1 })}` : 'Mask: Spherical'}
          </div>
        </div>

        <div className="bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-xs)] p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-mono text-[var(--lm-color-earth)] font-semibold">Earth ΔHorizon</span>
            <Badge variant={earthBadge.variant}>{earthBadge.label}</Badge>
          </div>
          <div className="text-lg font-bold font-mono-num text-[var(--lm-color-earth)]">
            {summary.earthClearanceDeg !== null
              ? formatAngle(summary.earthClearanceDeg, { decimals: 2, sign: true })
              : '—'}
          </div>
          <div className="text-[11px] font-mono text-[var(--lm-color-text-muted)] mt-1 truncate">
            {summary.earthMaskDeg !== null ? `Mask: ${formatAngle(summary.earthMaskDeg, { decimals: 1 })}` : 'Mask: Spherical'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNavigateHorizon}
        title="Open Full 360° Topocentric Horizon Radar View"
        aria-label="Open Full 360° Topocentric Horizon Radar View"
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-selected-site)]/40 text-xs font-mono font-medium text-[var(--lm-color-selected-site)] hover:bg-[var(--lm-color-selected-site)]/15 hover:border-[var(--lm-color-selected-site)] transition-colors shadow-xs"
      >
        <Compass className="w-3.5 h-3.5" />
        <span>Explore 360° Horizon Radar</span>
        <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
      </button>
    </section>
  );
}

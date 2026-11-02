import React from 'react';
import { Mountain, Droplets, Layers, ShieldCheck } from 'lucide-react';
import type { ScientificSiteInvestigation } from '@/domain/sites/scientificSiteInvestigation';

export interface IntelScienceTabProps {
  scientificData: ScientificSiteInvestigation | null;
}

export function IntelScienceTab({ scientificData }: IntelScienceTabProps) {
  if (!scientificData) {
    return (
      <div className="p-4 text-xs font-mono text-[var(--lm-color-text-muted)]">
        Scientific site investigation profile currently initializing for this coordinate.
      </div>
    );
  }

  const { topography, geology, illuminationThermal, resources, missionConstraints } = scientificData;

  return (
    <div className="flex flex-col gap-3 p-3 text-xs font-mono">
      {/* Topography & Slopes Card */}
      <div className="p-3 rounded bg-[var(--lm-color-surface-strong)]/40 border border-[var(--lm-color-border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-1.5">
          <span className="flex items-center gap-1.5 text-[var(--lm-color-warning)] font-semibold">
            <Mountain className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Topography & Slopes (LOLA 48-Point DEM)</span>
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-secondary)]">{missionConstraints?.slopeConstraintStatus ?? 'Measured'}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">SUMMIT ELEV</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">{topography?.summitElevationMeters ?? 0} m</span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">MEAN SLOPE</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">{(topography?.meanSlopeDeg ?? 0).toFixed(1)}°</span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">TRAVERSABLE</span>
            <span className="font-semibold text-[var(--lm-color-success)]">{topography?.traversableSlopePercentage ?? 0}%</span>
          </div>
        </div>
      </div>

      {/* Volatiles & Cryogenic Cold Traps */}
      <div className="p-3 rounded bg-[var(--lm-color-surface-strong)]/40 border border-[var(--lm-color-border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-1.5">
          <span className="flex items-center gap-1.5 text-[var(--lm-color-info)] font-semibold">
            <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Volatiles & Water-Ice Potential</span>
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] font-mono">
            {illuminationThermal?.coldTrapPermanence ?? 'Survey Target'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">EVIDENCE STATUS</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)] truncate block">
              {resources?.volatileEvidenceStatus ?? 'Under Survey'}
            </span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">WATER EQUIVALENT H</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">
              {resources?.waterEquivalentHydrogenWtPct ? `${resources.waterEquivalentHydrogenWtPct.value.toFixed(2)} wt%` : 'Inferred'}
            </span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">PEAK SUMMER TEMP</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">{illuminationThermal?.peakSummerTemperatureKelvin ?? 120} K</span>
          </div>
          <div>
            <span className="text-[var(--lm-color-text-muted)] text-[11px] block">MIN SHADOW TEMP</span>
            <span className="font-semibold text-[var(--lm-color-text-primary)]">{illuminationThermal?.minimumShadowTemperatureKelvin ?? 40} K</span>
          </div>
        </div>
      </div>

      {/* Geology Card */}
      <div className="p-3 rounded bg-[var(--lm-color-surface-strong)]/40 border border-[var(--lm-color-border-subtle)] flex flex-col gap-1.5">
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-1.5">
          <span className="flex items-center gap-1.5 text-[var(--lm-color-data-demo)] font-semibold">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Geologic Stratigraphy & Age</span>
          </span>
          <span className="text-[11px] text-[var(--lm-color-text-secondary)]">{geology?.geologicalEpoch ?? 'Imbrian'}</span>
        </div>
        <div className="text-[11px] text-[var(--lm-color-text-secondary)] font-sans leading-relaxed">
          {geology?.lithologyInterpretation ?? 'Highland anorthosite and impact melt breccia.'}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { ChevronDown, ChevronUp, Mountain, ExternalLink } from 'lucide-react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { ScientificSiteInvestigation } from '@/domain/sites/scientificSiteInvestigation';
import { ElevationProfileTransect } from './ElevationProfileTransect';

export interface InspectionTopographySectionProps {
  site: CandidateSite;
  scientificData: ScientificSiteInvestigation | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function InspectionTopographySection({
  site,
  scientificData,
  isOpen,
  onToggle,
}: InspectionTopographySectionProps) {
  const fmtElev = (m: number) => (m > 0 ? `+${m.toLocaleString()} m` : `${m.toLocaleString()} m`);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mountain className="w-3.5 h-3.5 text-[var(--lm-color-info)]" />
          <span>Topography & Slopes (NASA LOLA)</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 text-xs flex flex-col gap-2 font-mono text-[var(--lm-color-text-muted)] bg-[var(--lm-color-surface-raised)]/30">
          {scientificData ? (
            <>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <div className="bg-[var(--lm-color-surface-strong)]/60 p-1.5 rounded">
                  <span className="text-[var(--lm-color-text-muted)] block">SUMMIT</span>
                  <span className="text-[var(--lm-color-text-primary)] font-semibold">{fmtElev(scientificData.topography.summitElevationMeters)}</span>
                </div>
                <div className="bg-[var(--lm-color-surface-strong)]/60 p-1.5 rounded">
                  <span className="text-[var(--lm-color-text-muted)] block">RELIEF SPAN</span>
                  <span className="text-[var(--lm-color-info)] font-semibold">{scientificData.topography.reliefSpanMeters.toLocaleString()} m</span>
                </div>
                <div className="bg-[var(--lm-color-surface-strong)]/60 p-1.5 rounded">
                  <span className="text-[var(--lm-color-text-muted)] block">MEAN SLOPE</span>
                  <span className="text-[var(--lm-color-success)] font-semibold">{scientificData.topography.meanSlopeDeg.toFixed(1)}°</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className="flex items-center justify-between bg-[var(--lm-color-surface-strong)]/40 p-1 rounded">
                  <span className="text-[var(--lm-color-text-muted)]">Max Slope:</span>
                  <span className="text-[var(--lm-color-warning)] font-semibold">{scientificData.topography.maxSlopeDeg.toFixed(1)}°</span>
                </div>
                <div className="flex items-center justify-between bg-[var(--lm-color-surface-strong)]/40 p-1 rounded">
                  <span className="text-[var(--lm-color-text-muted)]">Traversable (&lt;15°):</span>
                  <span className="text-[var(--lm-color-success)] font-semibold">{scientificData.topography.traversableSlopePercentage}%</span>
                </div>
              </div>

              {/* Altimetric Cross-Section Profile */}
              <ElevationProfileTransect
                profile={scientificData.topography.elevationProfile}
                uncertaintyMeters={scientificData.topography.elevationUncertaintyMeters}
                meanSlopeDeg={scientificData.topography.meanSlopeDeg}
                maxSlopeDeg={scientificData.topography.maxSlopeDeg}
              />

              <div className="text-[11px] text-[var(--lm-color-text-muted)] font-sans border-t border-[var(--lm-color-border-subtle)] pt-1.5 flex flex-col gap-1">
                <div>
                  <span className="font-semibold text-[var(--lm-color-text-secondary)]">Data Source:</span> {scientificData.topography.demSourceAttribution}
                </div>
                {scientificData.dataProvenance.nasaProductUrls && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono">
                    <a
                      href={scientificData.dataProvenance.nasaProductUrls.lolaDem}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--lm-color-info)] hover:text-[var(--lm-color-info)] flex items-center gap-0.5 underline"
                    >
                      <span>NASA PGDA 78 (20m DEM)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <span>•</span>
                    <a
                      href={scientificData.dataProvenance.nasaProductUrls.lpiAtlas}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--lm-color-info)] hover:text-[var(--lm-color-info)] flex items-center gap-0.5 underline"
                    >
                      <span>LPI South Pole Atlas</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-[11px] font-sans text-[var(--lm-color-text-muted)]">
              LOLA 128ppd Elevation: {fmtElev(site.coordinates.elevationMeters)} (±1.2 m vertical precision).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { ScientificSiteInvestigation } from '@/domain/sites/scientificSiteInvestigation';

export interface InspectionOverviewSectionProps {
  site: CandidateSite;
  scientificData: ScientificSiteInvestigation | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function InspectionOverviewSection({
  site,
  scientificData,
  isOpen,
  onToggle,
}: InspectionOverviewSectionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[var(--lm-color-selected-site)]" />
          <span>Overview & Scientific Provenance</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 text-xs flex flex-col gap-2 font-mono text-[var(--lm-color-text-muted)] bg-[var(--lm-color-surface-raised)]/30">
          <p className="text-[11px] leading-relaxed font-sans text-[var(--lm-color-text-secondary)]">
            {site.description}
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
            <div className="bg-[var(--lm-color-surface-strong)]/60 p-1.5 rounded">
              <span className="text-[var(--lm-color-text-muted)] block">CATALOG REFERENCE</span>
              <span className="text-[var(--lm-color-text-primary)] font-semibold">
                {site.catalogVersion || '2024.1 (NASA Artemis Candidate)'}
              </span>
            </div>
            <div className="bg-[var(--lm-color-surface-strong)]/60 p-1.5 rounded">
              <span className="text-[var(--lm-color-text-muted)] block">VERTICAL DATUM</span>
              <span className="text-[var(--lm-color-info)] font-semibold">
                {scientificData?.coordinates.coordinateFrame || 'IAU 2000 ME (R=1737.4 km)'}
              </span>
            </div>
          </div>
          {site.missionContextNote && (
            <div className="text-[11px] text-[var(--lm-color-text-muted)] font-sans border-l-2 border-[var(--lm-color-selected-site)]/60 pl-2 mt-1">
              {site.missionContextNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

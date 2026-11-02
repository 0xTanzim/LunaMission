import React from 'react';
import { ChevronDown, ChevronUp, Layers, BookOpen } from 'lucide-react';
import { ScientificSiteInvestigation } from '@/domain/sites/scientificSiteInvestigation';

export interface InspectionGeologySectionProps {
  scientificData: ScientificSiteInvestigation | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function InspectionGeologySection({
  scientificData,
  isOpen,
  onToggle,
}: InspectionGeologySectionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[var(--lm-color-data-demo)]" />
          <span>Geology & Stratigraphic Unit</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 text-xs flex flex-col gap-2 font-mono text-[var(--lm-color-text-muted)] bg-[var(--lm-color-surface-raised)]/30">
          {scientificData ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--lm-color-data-demo-surface-strong)] border border-[var(--lm-color-data-demo)]/50 text-[var(--lm-color-data-demo)] font-bold text-[11px]">
                    {scientificData.geology.stratigraphicUnitCode}
                  </span>
                  <span className="text-[var(--lm-color-text-primary)] font-semibold text-[11px]">
                    {scientificData.geology.geologicalEpoch}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--lm-color-text-muted)]">{scientificData.geology.estimatedAgeBillionYears}</span>
              </div>

              <div className="text-[11px] font-sans text-[var(--lm-color-text-secondary)] leading-snug">
                <span className="font-semibold text-[var(--lm-color-data-demo)]">{scientificData.geology.stratigraphicUnitName}: </span>
                {scientificData.geology.lithologyInterpretation}
              </div>

              <div className="bg-[var(--lm-color-surface-strong)]/50 p-2 rounded text-[11px] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--lm-color-text-muted)]">Mapping Confidence:</span>
                  <span className="text-[var(--lm-color-info)]">{scientificData.geology.mappingConfidence}</span>
                </div>
                <p className="text-[var(--lm-color-text-muted)] font-sans text-[11px]">{scientificData.geology.regionalContext}</p>
              </div>

              <div className="text-[11px] text-[var(--lm-color-text-muted)] font-sans border-t border-[var(--lm-color-border-subtle)] pt-1 flex items-start gap-1">
                <BookOpen className="w-3 h-3 text-[var(--lm-color-data-demo)] shrink-0 mt-0.5" />
                <span>{scientificData.geology.sourceCitation}</span>
              </div>
            </>
          ) : (
            <div className="text-[11px] font-sans text-[var(--lm-color-text-muted)]">
              Regional Pre-Nectarian megaregolith unit within South Pole-Aitken (SPA) interior basin.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

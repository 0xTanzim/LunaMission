import React from 'react';
import { ChevronDown, ChevronUp, Droplets, AlertTriangle } from 'lucide-react';
import { ScientificSiteInvestigation } from '@/domain/sites/scientificSiteInvestigation';

export interface InspectionVolatilesSectionProps {
  scientificData: ScientificSiteInvestigation | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function InspectionVolatilesSection({
  scientificData,
  isOpen,
  onToggle,
}: InspectionVolatilesSectionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Droplets className="w-3.5 h-3.5 text-[var(--lm-color-info)]" />
          <span>Volatiles & Water Equivalent Hydrogen</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 text-xs flex flex-col gap-2 font-mono text-[var(--lm-color-text-muted)] bg-[var(--lm-color-surface-raised)]/30">
          {scientificData ? (
            <>
              <div className="flex items-center justify-between text-[11px] py-0.5 border-b border-[var(--lm-color-border-subtle)]">
                <span className="text-[var(--lm-color-text-muted)]">Evidence Classification</span>
                <span className="text-[var(--lm-color-info)] font-semibold text-[11px] text-right">
                  {scientificData.resources.volatileEvidenceStatus}
                </span>
              </div>

              {scientificData.resources.waterEquivalentHydrogenWtPct && (
                <div className="bg-[var(--lm-color-surface-strong)]/60 p-2 rounded flex items-center justify-between">
                  <div>
                    <span className="text-[var(--lm-color-text-muted)] text-[11px] block">ESTIMATED WEH (WATER EQUIV. HYDROGEN)</span>
                    <span className="text-[var(--lm-color-text-primary)] text-sm font-bold">
                      {scientificData.resources.waterEquivalentHydrogenWtPct.value.toFixed(2)} wt%{' '}
                      <span className="text-[var(--lm-color-text-muted)] text-xs font-normal">
                        ±{scientificData.resources.waterEquivalentHydrogenWtPct.uncertainty.toFixed(2)}%
                      </span>
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--lm-color-info)] bg-[var(--lm-color-info-surface-strong)] px-2 py-1 rounded border border-[var(--lm-color-info-border)]">
                    LEND Epithermal
                  </div>
                </div>
              )}

              <div className="text-[11px] font-sans text-[var(--lm-color-text-secondary)] leading-snug">
                {scientificData.resources.subsurfaceIceInterpretation}
              </div>

              <div className="bg-[var(--lm-color-surface-strong)]/40 p-1.5 rounded text-[11px]">
                <span className="text-[var(--lm-color-text-muted)] block">Thermal Stability Depth:</span>
                <span className="text-[var(--lm-color-success)]">{scientificData.resources.coldTrapStabilityDepthCm}</span>
              </div>

              {/* Scientific Cautionary Notice */}
              <div className="text-[11px] text-[var(--lm-color-warning)]/90 font-sans bg-[var(--lm-color-warning-surface)] border border-[var(--lm-color-warning)]/30 p-2 rounded flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--lm-color-warning)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--lm-color-warning)]">Scientific Caution:</strong> {scientificData.resources.cautionaryNotice}
                </span>
              </div>

              <div className="text-[11px] text-[var(--lm-color-text-muted)] font-sans border-t border-[var(--lm-color-border-subtle)] pt-1">
                {scientificData.resources.citationText}
              </div>
            </>
          ) : (
            <div className="text-[11px] font-sans text-[var(--lm-color-text-muted)]">
              Epithermal neutron suppression maps indicate localized hydrogen enrichment in adjacent PSRs.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

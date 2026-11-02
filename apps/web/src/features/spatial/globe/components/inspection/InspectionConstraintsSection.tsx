import React from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Radio, AlertOctagon } from 'lucide-react';
import { ScientificSiteInvestigation } from '@/domain/sites/scientificSiteInvestigation';

export interface InspectionConstraintsSectionProps {
  scientificData: ScientificSiteInvestigation | null;
  isEarthVisible: boolean;
  earthElevVal: number | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function InspectionConstraintsSection({
  scientificData,
  isEarthVisible,
  earthElevVal,
  isOpen,
  onToggle,
}: InspectionConstraintsSectionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--lm-color-success)]" />
          <span>Mission Suitability & Operational Constraints</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 text-xs flex flex-col gap-2 font-mono text-[var(--lm-color-text-muted)] bg-[var(--lm-color-surface-raised)]/30">
          {scientificData ? (
            <>
              <div className="flex items-center justify-between text-[11px] py-0.5 border-b border-[var(--lm-color-border-subtle)]">
                <span className="text-[var(--lm-color-text-muted)]">Landing Suitability</span>
                <span className="text-[var(--lm-color-success)] font-bold text-[11px]">
                  {scientificData.missionConstraints.overallSuitabilityRating}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div className="bg-[var(--lm-color-surface-strong)]/40 p-1.5 rounded">
                  <span className="text-[var(--lm-color-text-muted)] block">SLOPE STATUS</span>
                  <span className="text-[var(--lm-color-text-primary)] font-semibold">{scientificData.missionConstraints.slopeConstraintStatus}</span>
                </div>
                <div className="bg-[var(--lm-color-surface-strong)]/40 p-1.5 rounded">
                  <span className="text-[var(--lm-color-text-muted)] block">TRAFFICABILITY</span>
                  <span className="text-[var(--lm-color-info)] font-semibold">{scientificData.missionConstraints.surfaceTrafficability}</span>
                </div>
              </div>

              {/* Direct to Earth Sightline */}
              <div className="bg-[var(--lm-color-surface-strong)]/40 p-2 rounded flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--lm-color-text-muted)] flex items-center gap-1">
                    <Radio className="w-3 h-3 text-[var(--lm-color-info)]" /> Earth LoS Fraction (libration cycle):
                  </span>
                  <span className="text-[var(--lm-color-text-primary)] font-bold">
                    {scientificData.missionConstraints.directToEarthVisibilityPercentage.toFixed(1)}% (Libration Cycle)
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--lm-color-border-subtle)] pt-1 text-[11px]">
                  <span className="text-[var(--lm-color-text-muted)]">Geometric Sightline:</span>
                  <span className={`font-semibold ${isEarthVisible ? 'text-[var(--lm-color-info)]' : 'text-[var(--lm-color-warning)]'}`}>
                    {isEarthVisible ? 'Clear Line-of-Sight' : 'Below Horizon'} ({earthElevVal !== null ? `${earthElevVal >= 0 ? '+' : ''}${earthElevVal.toFixed(2)}°` : '—'})
                  </span>
                </div>
              </div>

              {/* Identified Operational Hazards */}
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-[11px] font-semibold text-[var(--lm-color-text-secondary)] flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3 text-[var(--lm-color-danger)]" /> Identified Operational Hazards:
                </span>
                <ul className="list-disc list-inside text-[11px] font-sans text-[var(--lm-color-text-muted)] space-y-0.5">
                  {scientificData.missionConstraints.identifiedHazards.map((hazard, hIdx) => (
                    <li key={hIdx}>{hazard}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="text-[11px] font-sans text-[var(--lm-color-text-muted)]">
              Sightline Status: {isEarthVisible ? 'Clear Line of Sight' : 'Below Horizon'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

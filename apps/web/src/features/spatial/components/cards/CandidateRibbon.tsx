import React, { useState, useEffect } from 'react';
import { useScenarioCommands, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { useSiteCatalog } from '@/features/spatial/hooks/useSiteCatalog';
import { loadCustomLandingTargets } from '@/domain/target/customTargetStorage';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';
import { IconCustomTarget, IconDossier } from '@/app/components/icons/lmIcons';

export interface CandidateRibbonProps {
  onSelectCustomTarget?: (target: CustomLandingTarget) => void;
  selectedCustomTargetId?: string | null;
  onOpenMissionDossier?: () => void;
}

/** Site picker shared by the standard and fullscreen workspace footers. Hydrates dynamically via REST API. */
export function CandidateRibbon({
  onSelectCustomTarget,
  selectedCustomTargetId,
  onOpenMissionDossier,
}: CandidateRibbonProps) {
  const { site: selectedSite } = useScenarioModel();
  const { selectSite } = useScenarioCommands();
  const { sites: availableSites, source } = useSiteCatalog('all');
  const [savedTargets, setSavedTargets] = useState<CustomLandingTarget[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSavedTargets(loadCustomLandingTargets(window.localStorage));
    }
  }, []);

  return (
    <footer
      aria-label="Candidate sites and export"
      className="flex w-full min-w-0 max-w-full select-none items-center gap-2 overflow-x-auto border-t border-[var(--lm-color-border-subtle)] pt-2.5"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] uppercase tracking-wider">
          Candidate Sites:
        </span>
        <span
          data-testid="ribbon-api-status"
          className={`px-1.5 py-0.2 rounded text-[11px] font-mono border ${
            source === 'nextrush_server'
              ? 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border-[var(--lm-color-success)]/40 shadow-xs'
              : 'bg-[var(--lm-color-info-surface-strong)] text-[var(--lm-color-info)] border-[var(--lm-color-info)]/40'
          }`}
          title={source === 'nextrush_server' ? 'Hydrated live from NextRush REST API (Port 3001)' : 'Seeded from verified IAU/LOLA baseline'}
        >
          {source === 'nextrush_server' ? '● REST API' : '● SYNCED'}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {availableSites.map((site) => {
          const isSelected = !selectedCustomTargetId && site.id === selectedSite.id;
          return (
            <button
              key={site.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                selectSite(site.id);
              }}
              aria-pressed={isSelected}
              className={`px-2.5 py-1 text-xs font-mono-num rounded-[var(--lm-radius-sm)] transition-colors ${
                isSelected
                  ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)] font-semibold shadow-xs'
                  : 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] border border-[var(--lm-color-border)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]'
              }`}
            >
              {site.name}
            </button>
          );
        })}

        {savedTargets.map((target) => {
          const isSelected = selectedCustomTargetId === target.id;
          return (
            <button
              key={target.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onSelectCustomTarget?.(target);
              }}
              aria-pressed={isSelected}
              className={`px-2.5 py-1 text-xs font-mono-num rounded-[var(--lm-radius-sm)] transition-colors flex items-center gap-1 ${
                isSelected
                  ? 'bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)] font-semibold shadow-xs'
                  : 'bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)]/80 border border-[var(--lm-color-warning)]/30 hover:text-[var(--lm-color-warning)] hover:bg-[var(--lm-color-warning-surface-strong)]'
              }`}
            >
              <IconCustomTarget className="text-[var(--lm-color-warning)]" />
              <span>{target.name}</span>
            </button>
          );
        })}
      </div>

      {onOpenMissionDossier && (
        <button
          type="button"
          onClick={onOpenMissionDossier}
          title="Export Aerospace Mission Dossier for Active Target"
          className="ml-auto shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-series-b)]/40 bg-[var(--lm-color-series-b-surface)] text-[var(--lm-color-series-b)] hover:bg-[var(--lm-color-series-b-surface-strong)] hover:text-[var(--lm-color-text-primary)] transition-colors cursor-pointer"
        >
          <IconDossier />
          <span>Export Dossier</span>
        </button>
      )}
    </footer>
  );
}

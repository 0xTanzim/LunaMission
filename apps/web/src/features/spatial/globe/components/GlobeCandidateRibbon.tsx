import React from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { getAllAvailableSites } from '@/domain/sites/catalog';

export interface GlobeCandidateRibbonProps {
  selectedSiteId: string;
  onSelectSite: (site: CandidateSite) => void;
}

/** The globe's own ribbon: choosing here also flies the camera to the site. */
export function GlobeCandidateRibbon({ selectedSiteId, onSelectSite }: GlobeCandidateRibbonProps) {
  const sites = getAllAvailableSites();
  return (
    <div className="bg-[var(--lm-color-surface)] border-t border-[var(--lm-color-border-subtle)] p-2.5 flex items-center gap-2 overflow-x-auto z-10 shrink-0">
      <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] shrink-0 uppercase tracking-wider">
        Candidate Sites:
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        {sites.map((site) => {
          const isSelected = site.id === selectedSiteId;
          return (
            <button
              key={site.id}
              type="button"
              onClick={() => onSelectSite(site)}
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
      </div>
    </div>
  );
}

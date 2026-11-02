import React from 'react';
import { Compass } from 'lucide-react';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';

/**
 * Console header for the Topocentric Horizon view: title, observable-honesty
 * note, and the site selector (registered sites + optional custom target).
 * Extracted in task 4.5 to keep the view under its presentation ceiling.
 */
export interface HorizonConsoleHeaderProps {
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  customTarget: CustomLandingTarget | null;
  isCustomInspection: boolean;
  onCustomInspectionChange: (inspect: boolean) => void;
  sites: { id: string; code: string; name: string }[];
}

export function HorizonConsoleHeader({
  selectedSiteId, onSelectSite, customTarget, isCustomInspection, onCustomInspectionChange, sites,
}: HorizonConsoleHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)]">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-info-surface)] border border-[var(--lm-color-info)]/30 text-[var(--lm-color-info)]">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[var(--lm-color-text-primary)] font-mono flex items-center gap-2">
            Topocentric Horizon Radar & Sky Dome
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--lm-color-info)]/20 text-[var(--lm-color-info)] font-normal">
              360° LOLA Terrain Profile
            </span>
          </h1>
          <p className="text-xs text-[var(--lm-color-text-muted)]">
            Evaluates Sun grazing diurnal wave and Earth libration loop relative to the local terrain
            silhouette. Earth readouts separate <span className="text-[var(--lm-color-text-secondary)]">geometric
            line-of-sight</span> from a <span className="text-[var(--lm-color-text-secondary)]">modelled RF link
            estimate</span>; neither is a measured capability and neither establishes link closure on its own.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="radar-site-select" className="text-xs font-mono text-[var(--lm-color-text-secondary)]">
          Site:
        </label>
        <select
          id="radar-site-select"
          value={isCustomInspection && customTarget ? `custom-${customTarget.id}` : selectedSiteId}
          onChange={(e) => {
            if (e.target.value.startsWith('custom-')) {
              onCustomInspectionChange(true);
            } else {
              onCustomInspectionChange(false);
              onSelectSite(e.target.value);
            }
          }}
          className="px-3 py-1.5 text-xs font-mono bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] text-[var(--lm-color-text-primary)] focus:outline-none focus:border-[var(--lm-color-info-border)]"
        >
          {customTarget && (
            <option value={`custom-${customTarget.id}`}>
              🎯 Custom Target: {customTarget.name}
            </option>
          )}
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} • {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

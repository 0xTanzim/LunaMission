import React, { type Ref } from 'react';
import { ExternalLink, Download, X } from 'lucide-react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import { getNasaLunarTrekUrl } from '@/domain/sites/nasaTrekUrls';
import { isOffMapPolarSite } from '@/features/spatial/map/model/candidatePinGeometry';

export interface IntelHeaderProps {
  site: CandidateSite;
  onClose: () => void;
  onExportDossier?: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
  source?: 'nextrush_server';
}

export function IntelHeader({
  site,
  onClose,
  onExportDossier,
  closeButtonRef,
  source = 'nextrush_server',
}: IntelHeaderProps) {
  const isOffMap = isOffMapPolarSite(site);
  const trekUrl = getNasaLunarTrekUrl(
    site.coordinates.latitudeDeg,
    site.coordinates.longitudeDeg,
    isOffMap ? 6 : 8
  );

  return (
    <div className="flex flex-col gap-2.5 p-3.5 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-strong)]/40 shrink-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-[var(--lm-color-selected-site)] bg-[var(--lm-color-surface)] px-1.5 py-0.5 rounded border border-[var(--lm-color-selected-site)]/40">
              {site.code}
            </span>
            <span
              data-testid="intel-api-status"
              className="text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold border bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border-[var(--lm-color-success)]/40"
              title="Live NextRush REST endpoint data"
            >
              ● REST API
            </span>
            <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] truncate">
              {site.priority}
            </span>
            {isOffMap && (
              <span className="text-[11px] font-mono bg-[var(--lm-color-warning)]/15 text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)]/40 px-1.5 py-0.2 rounded font-medium">
                Off-Map Bearing
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-[var(--lm-color-text-primary)] truncate font-sans">
            {site.name}
          </h3>
          <span className="text-[11px] font-mono text-[var(--lm-color-text-secondary)] truncate">
            {site.officialRegionReference} • {Math.abs(site.coordinates.latitudeDeg).toFixed(2)}°
            {site.coordinates.latitudeDeg >= 0 ? 'N' : 'S'}, {site.coordinates.longitudeDeg.toFixed(2)}°E ({site.coordinates.elevationMeters}m)
          </span>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close Site Intel Drawer"
          className="p-1.5 rounded text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] transition-colors cursor-pointer shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus:outline-none"
        >
          <X className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Close Site Intel Drawer</span>
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[var(--lm-color-border-subtle)] text-xs">
        <a
          href={trekUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] hover:bg-[var(--lm-color-info-surface-strong)] hover:border-[var(--lm-color-info)] focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus:outline-none transition-colors min-h-[30px]"
          title="Open coordinate in NASA Lunar Trek Web GIS (opens in new window)"
          aria-label="Open coordinate in NASA Lunar Trek Web GIS (opens in new tab)"
        >
          <span>NASA Lunar Trek</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          <span className="sr-only">(opens in new window)</span>
        </a>

        {onExportDossier && (
          <button
            type="button"
            onClick={onExportDossier}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] border border-[var(--lm-color-border)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus:outline-none transition-colors cursor-pointer min-h-[30px]"
            title="Download full JSON planetary investigation dossier"
            aria-label="Download full JSON planetary investigation dossier"
          >
            <Download className="w-3 h-3" aria-hidden="true" />
            <span>Export Dossier</span>
          </button>
        )}
      </div>
    </div>
  );
}

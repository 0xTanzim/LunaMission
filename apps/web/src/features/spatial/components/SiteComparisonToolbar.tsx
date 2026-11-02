import React from 'react';
import { Download } from 'lucide-react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { ScientificSiteInvestigation } from '@/domain/sites/siteInvestigationRegistry';

export interface DecoratedSiteCandidate {
  site: CandidateSite;
  inv: ScientificSiteInvestigation;
}

export type CatalogTab = 'artemis-2024' | 'all';

export interface SiteComparisonToolbarProps {
  catalogTab: CatalogTab;
  onSelectCatalogTab: (tab: CatalogTab) => void;
  candidateList: DecoratedSiteCandidate[];
}

export function SiteComparisonToolbar({
  catalogTab,
  onSelectCatalogTab,
  candidateList,
}: SiteComparisonToolbarProps) {
  const handleExportCsv = () => {
    const headers = [
      'Site Code',
      'Site Name',
      'Latitude (°S)',
      'Longitude (°E)',
      'Elevation (m)',
      'Annual Sunlight (%)',
      'Direct-Earth Comm (%)',
      'Traversable Area (%)',
      'Peak Slope (°)',
      'Suitability Tier',
      'Official Region Reference',
    ];

    const rows = candidateList.map(({ site, inv }) => [
      site.code,
      `"${site.name}"`,
      site.coordinates.latitudeDeg.toFixed(3),
      site.coordinates.longitudeDeg.toFixed(2),
      site.coordinates.elevationMeters ?? 0,
      inv.annualIlluminationPct.toFixed(1),
      inv.directToEarthPct.toFixed(1),
      inv.traversableAreaPct,
      inv.maxSlopeDeg.toFixed(1),
      `"${inv.hlsLandingRating}"`,
      `"${site.officialRegionReference || inv.regionalContext}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NASA_Artemis_Landing_Sites_${catalogTab === 'artemis-2024' ? 'Oct2024_9Regions' : 'All_14Sites'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]/40 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-[var(--lm-color-text-muted)] font-mono text-[11px] uppercase">Candidate Scope:</span>
        <div className="flex items-center rounded-lg bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] p-0.5">
          <button
            type="button"
            onClick={() => onSelectCatalogTab('artemis-2024')}
            className={`px-3 py-1 rounded font-medium text-[11px] transition-colors ${
              catalogTab === 'artemis-2024'
                ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)] font-semibold'
                : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-secondary)]'
            }`}
          >
            Artemis III (Oct 2024 — 9 Regions)
          </button>
          <button
            type="button"
            onClick={() => onSelectCatalogTab('all')}
            className={`px-3 py-1 rounded font-medium text-[11px] transition-colors ${
              catalogTab === 'all'
                ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)] font-semibold'
                : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-secondary)]'
            }`}
          >
            All Polar Candidates (14 Sites)
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-border-strong)] hover:bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] font-mono text-[11px] transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[var(--lm-color-info)]" />
          <span>Export CSV Matrix</span>
        </button>
      </div>
    </div>
  );
}

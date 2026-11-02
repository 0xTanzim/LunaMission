import React, { useState, useMemo } from 'react';
import { X, Compass, Download } from 'lucide-react';
import { ARTEMIS_III_2024_REGION_IDS } from '@/domain/sites/catalog';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { useSiteCatalog } from '@/features/spatial/hooks/useSiteCatalog';
import { getSiteInvestigation } from '@/domain/sites/siteInvestigationRegistry';
import {
  SiteComparisonMatrixTable,
  SortField,
} from './SiteComparisonMatrixTable';
import {
  SiteComparisonToolbar,
  CatalogTab,
} from './SiteComparisonToolbar';


export interface SiteComparisonMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSiteId: string;
  onSelectSite: (site: CandidateSite) => void;
}

export function SiteComparisonMatrixModal({
  isOpen,
  onClose,
  selectedSiteId,
  onSelectSite,
}: SiteComparisonMatrixModalProps) {
  const { sites: dynamicSites, source } = useSiteCatalog('all');
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('artemis-2024');
  const [sortField, setSortField] = useState<SortField>('sunlight');
  const [sortAsc, setSortAsc] = useState(false);

  // Keyboard shortcut: Escape closes modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const candidateList = useMemo(() => {
    let list = dynamicSites;
    if (catalogTab === 'artemis-2024') {
      list = list.filter((s) => ARTEMIS_III_2024_REGION_IDS.includes(s.id));
    }

    const decorated = list.map((site) => {
      const inv = getSiteInvestigation(site.id, site.name, site.coordinates.elevationMeters);
      return { site, inv };
    });

    decorated.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      switch (sortField) {
        case 'sunlight':
          valA = a.inv.annualIlluminationPct;
          valB = b.inv.annualIlluminationPct;
          break;
        case 'dte':
          valA = a.inv.directToEarthPct;
          valB = b.inv.directToEarthPct;
          break;
        case 'traversable':
          valA = a.inv.traversableAreaPct;
          valB = b.inv.traversableAreaPct;
          break;
        case 'elevation':
          valA = a.site.coordinates.elevationMeters ?? 0;
          valB = b.site.coordinates.elevationMeters ?? 0;
          break;
        case 'code':
          return sortAsc ? a.site.code.localeCompare(b.site.code) : b.site.code.localeCompare(a.site.code);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return decorated;
  }, [catalogTab, sortField, sortAsc]);

  if (!isOpen) return null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--lm-color-canvas)]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-strong)] rounded-[var(--lm-radius-lg)] shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden text-[var(--lm-color-text-secondary)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--lm-color-border)] bg-[var(--lm-color-surface-strong)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[var(--lm-color-info-surface-strong)] border border-[var(--lm-color-info)]/40 text-[var(--lm-color-info)]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--lm-color-text-primary)] tracking-wide">
                  Lunar Landing Site Navigator & Comparison Matrix
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lm-color-warning)]/10 text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)]/30">
                  NASA SPACE APPS 2026
                </span>
                <span
                  data-testid="modal-api-status"
                  className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                    source === 'nextrush_server'
                      ? 'bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border-[var(--lm-color-success)]/40'
                      : 'bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)]/80 border-[var(--lm-color-info)]/30'
                  }`}
                  title={source === 'nextrush_server' ? 'Connected to NextRush REST API' : 'Synced analytical dataset'}
                >
                  {source === 'nextrush_server' ? '● REST API' : '● SYNCED'}
                </span>
              </div>
              <p className="text-xs text-[var(--lm-color-text-muted)]">
                Multi-criteria assessment for Artemis landing safety, annual solar exposure, and direct-to-Earth geometric line-of-sight.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]/60 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <SiteComparisonToolbar
          catalogTab={catalogTab}
          onSelectCatalogTab={setCatalogTab}
          candidateList={candidateList}
        />


        {/* Data Table */}
        <SiteComparisonMatrixTable
          candidateList={candidateList}
          selectedSiteId={selectedSiteId}
          onSelectSite={onSelectSite}
          onClose={onClose}
          onSort={handleSort}
        />

        {/* Modal Footer */}
        <div className="p-3 border-t border-[var(--lm-color-border)] bg-[var(--lm-color-surface-strong)] flex items-center justify-between text-xs text-[var(--lm-color-text-muted)] font-sans">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--lm-color-text-secondary)]">Data Sources:</span>
            <span>NASA Goddard LOLA PGDA 78/90 (20m DEM) • LRO Diviner DLRE • LEND Neutron Flux • NASA Oct 2024 Artemis III Regions</span>
          </div>
          <div>
            Showing <strong className="text-[var(--lm-color-text-primary)]">{candidateList.length}</strong> Candidate Landing Sites
          </div>
        </div>
      </div>
    </div>
  );
}

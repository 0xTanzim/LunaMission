import { Layers } from 'lucide-react';
import { ARTEMIS_III_2022_REGION_COUNT, type SiteCatalogFilter } from '@/domain/sites/catalog';

interface CatalogTab {
  id: SiteCatalogFilter;
  label: string;
  /** Why the cohort exists, for the tab's tooltip. */
  hint?: string;
}

const CATALOG_TABS: CatalogTab[] = [
  { id: 'artemis-2024', label: 'Artemis III (9)' },
  {
    id: 'artemis-iii-2022',
    label: `Artemis III (2022 · ${ARTEMIS_III_2022_REGION_COUNT})`,
    hint: 'The 13 regions of the August 2022 NASA announcement. Regions without a registered candidate site are catalogue only.',
  },
  { id: 'polar-benchmark', label: 'Polar Benchmarks (5)' },
  { id: 'clps', label: 'CLPS Landers (3)' },
  { id: 'historic', label: 'Historic (3)' },
  { id: 'all', label: 'All Sites' },
];

export interface CatalogCohortTabsProps {
  activeTab: SiteCatalogFilter;
  onChange: (tab: SiteCatalogFilter) => void;
}

/** Narrows the "add site" list to one catalog cohort: Artemis III, polar benchmark, CLPS or historic. */
export function CatalogCohortTabs({ activeTab, onChange }: CatalogCohortTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Candidate catalog cohort filter">
      <span className="text-xs font-mono font-semibold text-[var(--lm-color-text-secondary)] uppercase flex items-center gap-1.5 mr-1">
        <Layers className="w-3.5 h-3.5 text-[var(--lm-color-info)]" aria-hidden="true" />
        Cohort:
      </span>

      {CATALOG_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={isActive}
            title={tab.hint}
            className={`px-2.5 py-1 text-xs font-mono rounded-[var(--lm-radius-sm)] border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] ${
              isActive
                ? 'bg-[var(--lm-color-info-surface-strong)] border-[var(--lm-color-info)]/60 text-[var(--lm-color-info)] font-semibold'
                : 'bg-[var(--lm-color-surface-elevated)] border-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

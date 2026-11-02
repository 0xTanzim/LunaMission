import React from 'react';

export type InspectionTabId = 'all' | 'topo' | 'geology' | 'illum' | 'volatiles' | 'mission';

export interface InspectionNavTabsProps {
  activeTab: InspectionTabId;
  onSelectTab: (tab: InspectionTabId) => void;
}

export function InspectionNavTabs({ activeTab, onSelectTab }: InspectionNavTabsProps) {
  const tabs: Array<{ id: InspectionTabId; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'topo', label: 'Topography' },
    { id: 'geology', label: 'Geology' },
    { id: 'illum', label: 'Solar/Thermal' },
    { id: 'volatiles', label: 'Volatiles' },
    { id: 'mission', label: 'Constraints' },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface-raised)]/50 overflow-x-auto text-[11px] font-mono scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelectTab(tab.id)}
          className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? 'bg-[var(--lm-color-info)]/20 text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/40 font-semibold'
              : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

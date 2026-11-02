import React from 'react';

export interface DossierTabControlsProps {
  activeTab: 'markdown' | 'json';
  onTabChange: (tab: 'markdown' | 'json') => void;
  epochMs: number;
}

export const DossierTabControls: React.FC<DossierTabControlsProps> = ({
  activeTab,
  onTabChange,
  epochMs,
}) => (
  <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)]/60 print:hidden">
    <div role="tablist" aria-label="Dossier format options" className="flex items-center gap-2">
      <button
        type="button"
        role="tab"
        id="tab-markdown"
        aria-selected={activeTab === 'markdown'}
        aria-controls="panel-dossier"
        onClick={() => onTabChange('markdown')}
        className={`px-3 py-1.5 rounded text-xs font-semibold min-h-[32px] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] transition ${
          activeTab === 'markdown' ? 'bg-[var(--lm-color-series-b-fill)] text-[var(--lm-color-text-primary)]' : 'text-[var(--lm-color-text-muted)] hover:bg-[var(--lm-color-surface-strong)] hover:text-[var(--lm-color-text-secondary)]'
        }`}
      >
        Markdown Briefing
      </button>
      <button
        type="button"
        role="tab"
        id="tab-json"
        aria-selected={activeTab === 'json'}
        aria-controls="panel-dossier"
        onClick={() => onTabChange('json')}
        className={`px-3 py-1.5 rounded text-xs font-semibold min-h-[32px] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] transition ${
          activeTab === 'json' ? 'bg-[var(--lm-color-series-b-fill)] text-[var(--lm-color-text-primary)]' : 'text-[var(--lm-color-text-muted)] hover:bg-[var(--lm-color-surface-strong)] hover:text-[var(--lm-color-text-secondary)]'
        }`}
      >
        JSON Telemetry
      </button>
    </div>
    <span className="text-[11px] text-[var(--lm-color-text-muted)] font-mono">
      Epoch: {new Date(epochMs).toUTCString()}
    </span>
  </div>
);

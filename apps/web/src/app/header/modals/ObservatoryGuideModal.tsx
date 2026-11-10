import React, { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { useMissionRouter } from '@/app/hooks/useMissionRouter';
import { GuideQuickStartTab } from './guide/GuideQuickStartTab';
import { GuideStandardsTab } from './guide/GuideStandardsTab';
import { GuideShortcutsTab } from './guide/GuideShortcutsTab';
import { ExternalLink } from 'lucide-react';

interface ObservatoryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

type GuideTabId = 'quickstart' | 'standards' | 'shortcuts';

export function ObservatoryGuideModal({ isOpen, onClose, onStartTour }: ObservatoryGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTabId>('quickstart');
  const { navigateToTab } = useMissionRouter();

  const handleGoToMethodology = () => {
    onClose();
    navigateToTab('method');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="LunaMission Flight Manual & Observatory Guide"
      subtitle="Interactive Quick Start, Tool Documentation & NASA Aerospace Standards"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col gap-4">
        {/* Tab Switcher Navigation */}
        <div
          role="tablist"
          aria-label="Observatory Guide Navigation"
          className="flex items-center gap-1.5 p-1 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] overflow-x-auto shrink-0"
        >
          <button
            type="button"
            role="tab"
            id="guide-tab-quickstart"
            aria-selected={activeTab === 'quickstart'}
            aria-controls="guide-panel-quickstart"
            data-testid="guide-tab-quickstart"
            onClick={() => setActiveTab('quickstart')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'quickstart'
                ? 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-sun)] border border-[var(--lm-color-border)] shadow-xs'
                : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] border border-transparent'
            }`}
          >
            🚀 Quick Start &amp; How-To
          </button>
          <button
            type="button"
            role="tab"
            id="guide-tab-standards"
            aria-selected={activeTab === 'standards'}
            aria-controls="guide-panel-standards"
            data-testid="guide-tab-standards"
            onClick={() => setActiveTab('standards')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'standards'
                ? 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-sun)] border border-[var(--lm-color-border)] shadow-xs'
                : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] border border-transparent'
            }`}
          >
            🎯 Scientific Standards
          </button>
          <button
            type="button"
            role="tab"
            id="guide-tab-shortcuts"
            aria-selected={activeTab === 'shortcuts'}
            aria-controls="guide-panel-shortcuts"
            data-testid="guide-tab-shortcuts"
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-sun)] border border-[var(--lm-color-border)] shadow-xs'
                : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] border border-transparent'
            }`}
          >
            ⌨️ Shortcuts &amp; Semantics
          </button>
        </div>

        {/* Tab Panel Content */}
        <div
          role="tabpanel"
          id={`guide-panel-${activeTab}`}
          aria-labelledby={`guide-tab-${activeTab}`}
          className="min-h-[280px]"
        >
          {activeTab === 'quickstart' && <GuideQuickStartTab onStartTour={onStartTour} />}
          {activeTab === 'standards' && <GuideStandardsTab />}
          {activeTab === 'shortcuts' && <GuideShortcutsTab />}
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-[var(--lm-color-border-subtle)] flex flex-wrap items-center justify-between gap-3 mt-1">
          <button
            type="button"
            onClick={handleGoToMethodology}
            data-testid="guide-open-methodology-button"
            className="text-xs font-mono text-[var(--lm-color-info)] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Full Scientific Methodology &amp; Datasets</span>
            <ExternalLink size={12} />
          </button>
          <button
            type="button"
            onClick={onClose}
            data-testid="guide-close-button"
            className="px-4 py-1.5 text-xs font-mono font-medium rounded border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-strong)] transition-colors cursor-pointer min-h-[32px]"
          >
            Close Guide
          </button>
        </div>
      </div>
    </Modal>
  );
}

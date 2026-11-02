import { useState } from 'react';
import { UtcTimeControl } from '@/features/time/components/controls/UtcTimeControl';
import { LiveRealTimeToggle } from '@/features/time/components/controls/LiveRealTimeToggle';
import { NavTab } from '@/app/header/config/navTabs';
import { HeaderBrand } from '@/app/header/components/HeaderBrand';
import { HeaderNavigation } from '@/app/header/components/HeaderNavigation';
import { HeaderStatusControls } from '@/app/header/components/HeaderStatusControls';
import { ObservatoryGuideModal } from '@/app/header/modals/ObservatoryGuideModal';
import { ProvenanceStatusModal } from '@/app/header/modals/ProvenanceStatusModal';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isDemoMode: boolean;
}

/**
 * Application shell header: brand, primary navigation, the canonical UTC epoch
 * control, provenance status, and the two reference modals they open.
 */
export function Header({ activeTab, onTabChange, isDemoMode }: HeaderProps) {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showProvenanceModal, setShowProvenanceModal] = useState(false);

  return (
    <header className="relative lg:sticky top-0 z-40 w-full bg-[var(--lm-color-surface)]/95 backdrop-blur-md border-b border-[var(--lm-color-border)]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-col gap-2.5">
          {/* Brand & Primary Navigation */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6 min-w-0 max-w-full">
            <HeaderBrand />
            <HeaderNavigation activeTab={activeTab} onSelect={onTabChange} />
          </div>

          {/* Right Controls: UTC Epoch, Live Toggle & Information Badges */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
            <div className="flex items-center gap-2">
              <LiveRealTimeToggle />
              <UtcTimeControl />
            </div>

            <HeaderStatusControls
              isDemoMode={isDemoMode}
              onOpenProvenance={() => setShowProvenanceModal(true)}
              onOpenGuide={() => setShowGuideModal(true)}
            />
          </div>
        </div>
      </div>

      <ObservatoryGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
      <ProvenanceStatusModal isOpen={showProvenanceModal} onClose={() => setShowProvenanceModal(false)} />
    </header>
  );
}

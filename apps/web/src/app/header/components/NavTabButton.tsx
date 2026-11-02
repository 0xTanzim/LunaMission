import { ReactNode } from 'react';
import { NavTab, NAV_TAB_TITLES } from '@/app/header/config/navTabs';

const NAV_BUTTON_CLASS =
  'flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-[var(--lm-radius-xs)] transition-colors min-h-[44px] min-w-[44px] justify-center whitespace-nowrap shrink-0 select-none';
const NAV_BUTTON_ACTIVE_CLASS =
  'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-primary)] border border-[var(--lm-color-border)] shadow-xs';
const NAV_BUTTON_IDLE_CLASS = 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-secondary)]';

interface NavTabButtonProps {
  tab: NavTab;
  activeTab: NavTab;
  icon: ReactNode;
  /** Tab label markup; responsive visibility differs per destination. */
  children: ReactNode;
  onSelect: (tab: NavTab) => void;
}

/** One primary-navigation tab. */
export function NavTabButton({ tab, activeTab, icon, children, onSelect }: NavTabButtonProps) {
  const isActive = activeTab === tab;
  const title = NAV_TAB_TITLES[tab];

  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      aria-label={title}
      title={title}
      className={`${NAV_BUTTON_CLASS} ${isActive ? NAV_BUTTON_ACTIVE_CLASS : NAV_BUTTON_IDLE_CLASS}`}
    >
      {icon}
      {children}
    </button>
  );
}

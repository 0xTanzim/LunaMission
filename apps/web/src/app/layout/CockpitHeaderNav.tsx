import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMissionRouter } from '../hooks/useMissionRouter';
import { useScenarioState } from '../state/useScenarioState';
import type { NavTab } from '@/app/header/config/navTabs';
import { COCKPIT_NAV_ITEMS, type CockpitNavItem } from './cockpitNavConfig';
import { CockpitNavLink } from './CockpitNavLink';
import { IconChevronDown, IconClose, IconMenu } from '@/app/components/icons/lmIcons';

/** Which navigation destination the current workspace projection belongs to. */
const PROJECTION_TO_TAB: Record<'explore' | 'analyze' | 'compare', NavTab> = {
  explore: 'explore',
  analyze: 'horizon',
  compare: 'compare',
};

/**
 * Primary navigation for the flight deck.
 *
 * These five destinations each replace the whole workspace, so they are links in a
 * `nav` landmark with `aria-current="page"` — not tabs. Below 768px the bar collapses
 * into a disclosure menu so nothing wraps, clips, or pushes the page into horizontal
 * scroll on a phone.
 */
export const CockpitHeaderNav: React.FC = () => {
  const { state, setProjection } = useScenarioState();
  const { navigateToTab } = useMissionRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeTab = PROJECTION_TO_TAB[state.activeProjection] ?? 'explore';

  // Alt+1…Alt+5 jump straight to any of the five numbered destinations. The three
  // workflow steps move the shared scenario projection (so the shell keeps its
  // committed mission target); the instruments are standalone pages, so they are a
  // route change. Either way the shortcut shown in the header is the one that works.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!e.altKey) return;
      const index = ['1', '2', '3', '4', '5'].indexOf(e.key);
      if (index === -1) return;
      const item = COCKPIT_NAV_ITEMS[index];
      if (!item) return;
      e.preventDefault();
      if (item.id === 'explore') setProjection('explore');
      else if (item.id === 'horizon') setProjection('analyze');
      else if (item.id === 'compare') setProjection('compare');
      else navigateToTab(item.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setProjection, navigateToTab]);

  // The mobile menu behaves like a disclosure: Escape closes it and returns focus,
  // a pointer press outside dismisses it, and any navigation closes it.
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setIsMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isMenuOpen]);

  const handleNavigate = useCallback(
    (item: CockpitNavItem) => {
      setIsMenuOpen(false);
      navigateToTab(item.id);
    },
    [navigateToTab],
  );

  return (
    <>
      {/* Desktop / tablet: one numbered sequence of five destinations */}
      <nav
        aria-label="Workspaces"
        className="hidden md:flex items-center gap-1 min-w-0 flex-wrap"
      >
        {COCKPIT_NAV_ITEMS.map((item) => (
          <CockpitNavLink
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onNavigate={handleNavigate}
          />
        ))}
      </nav>

      {/* Below 768px: one disclosure button that names the current screen */}
      <div className="relative md:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="cockpit-nav-menu"
          aria-label="Workspaces menu"
          className="flex items-center gap-1.5 min-h-[36px] min-w-[36px] px-2 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-xs font-mono text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          {isMenuOpen ? <IconClose /> : <IconMenu />}
          <span>Menu</span>
          <IconChevronDown
            className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isMenuOpen && (
          <div
            ref={panelRef}
            id="cockpit-nav-menu"
            className="absolute right-0 top-full z-50 mt-1.5 w-[min(19rem,calc(100vw-1.5rem))] rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] p-1.5 shadow-[var(--lm-shadow-popover)]"
          >
            <p className="px-3 pb-1 pt-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--lm-color-text-muted)]">
              Workspaces
            </p>
            {COCKPIT_NAV_ITEMS.map((item) => (
              <CockpitNavLink
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                variant="menu"
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

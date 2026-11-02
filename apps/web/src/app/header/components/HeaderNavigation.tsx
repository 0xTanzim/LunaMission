import { Compass, Sparkles, GitCompare, BookOpen, Radar } from 'lucide-react';
import { NavTab } from '@/app/header/config/navTabs';
import { NavTabButton } from '@/app/header/components/NavTabButton';

interface HeaderNavigationProps {
  activeTab: NavTab;
  onSelect: (tab: NavTab) => void;
}

/** Primary navigation: Explore, 3D Lab, Compare, Horizon, Method & Data. */
export function HeaderNavigation({ activeTab, onSelect }: HeaderNavigationProps) {
  return (
    <nav
      className="flex items-center gap-1 bg-[var(--lm-color-canvas)] p-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] min-w-0 max-w-full overflow-x-auto"
      aria-label="Main Navigation"
    >
      <NavTabButton tab="explore" activeTab={activeTab} onSelect={onSelect} icon={<Compass className="w-3.5 h-3.5 shrink-0" />}>
        <span className="hidden sm:inline">Explore</span>
      </NavTabButton>

      <NavTabButton tab="lab" activeTab={activeTab} onSelect={onSelect} icon={<Sparkles className="w-3.5 h-3.5 shrink-0 text-[var(--lm-color-info)]" />}>
        <span className="hidden sm:inline">3D Lab</span>
      </NavTabButton>

      <NavTabButton tab="compare" activeTab={activeTab} onSelect={onSelect} icon={<GitCompare className="w-3.5 h-3.5 shrink-0" />}>
        <span className="hidden sm:inline">Navigator</span>
      </NavTabButton>

      <NavTabButton tab="horizon" activeTab={activeTab} onSelect={onSelect} icon={<Radar className="w-3.5 h-3.5 shrink-0" />}>
        <span className="hidden sm:inline">Horizon</span>
        <span className="hidden md:inline"> Radar</span>
      </NavTabButton>

      <NavTabButton tab="method" activeTab={activeTab} onSelect={onSelect} icon={<BookOpen className="w-3.5 h-3.5 shrink-0" />}>
        <span className="hidden sm:inline">Method</span>
        <span className="hidden md:inline"> & Data</span>
      </NavTabButton>
    </nav>
  );
}

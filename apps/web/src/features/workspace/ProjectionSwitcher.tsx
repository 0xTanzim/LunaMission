import React, { useEffect } from 'react';
import { useScenarioState } from '../../app/state/useScenarioState';

interface ProjectionSwitcherProps {
  className?: string;
}

export const ProjectionSwitcher: React.FC<ProjectionSwitcherProps> = ({ className = '' }) => {
  const { state, setProjection } = useScenarioState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setProjection('explore');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setProjection('analyze');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        setProjection('compare');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setProjection]);

  const projections = [
    { id: 'explore', label: '1. EXPLORE', shortcut: 'Alt+1', desc: 'Spatial Map & Site Catalog' },
    { id: 'analyze', label: '2. ANALYZE', shortcut: 'Alt+2', desc: 'Topocentric Sky-Ribbon & Gantt' },
    { id: 'compare', label: '3. COMPARE', shortcut: 'Alt+3', desc: '3-Tier Vehicle Filtering & Delta Matrix' },
  ] as const;

  return (
    <nav
      role="tablist"
      aria-label="Mission Workspace Projections"
      className={`flex items-center gap-1 bg-[var(--lm-color-canvas)] p-1 rounded-md border border-[var(--lm-color-border-subtle)] ${className}`}
    >
      {projections.map((p) => {
        const isActive = state.activeProjection === p.id;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={isActive}
            aria-label={`${p.label}: ${p.desc} (Shortcut: ${p.shortcut})`}
            onClick={() => setProjection(p.id)}
            data-testid={`projection-tab-${p.id}`}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all duration-150 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] min-h-[32px] ${
              isActive
                ? 'bg-[var(--lm-color-info-surface-strong)] text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/50 shadow-sm shadow-[var(--lm-color-info-fill)]'
                : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-secondary)] hover:bg-[var(--lm-color-surface)]/60'
            }`}
          >
            <span>{p.label}</span>
            <span className="text-[11px] opacity-40">[{p.shortcut.replace('Alt+', '⌥')}]</span>
          </button>
        );
      })}
    </nav>
  );
};

import React, { useState } from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import { useScenarioCommands } from '@/app/scenario/context/scenarioContext';
import { useScenarioState } from '@/app/state/useScenarioState';
import { ThreeTierComparisonView } from './ThreeTierComparisonView';
import { ComparisonMatrix } from './ui/ComparisonMatrix';

type ComparisonView = 'funnel' | 'matrix';

const VIEWS: { id: ComparisonView; label: string; hint: string }[] = [
  { id: 'funnel', label: 'Three-Tier Funnel', hint: 'Vehicle gating → lexicographic ranking → pairwise delta' },
  { id: 'matrix', label: 'Side-by-Side Matrix', hint: 'Up to four sites compared at one instant' },
];

/**
 * `/compare` workspace: the CASSA three-tier funnel and the side-by-side site matrix are
 * two readings of the same scenario, so they share one route and one canonical epoch.
 */
export const ComparisonWorkspace: React.FC = () => {
  const [view, setView] = useState<ComparisonView>('funnel');
  const { setProjection } = useScenarioState();
  const { focusMapSite } = useScenarioCommands();

  const handleInspectInExplore = (site: CandidateSite) => {
    setProjection('explore');
    focusMapSite(site.id);
  };

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      <div
        role="group"
        aria-label="Comparison analysis view"
        className="flex flex-wrap items-center gap-2 bg-[var(--lm-color-surface)] p-2 rounded-lg border border-[var(--lm-color-border-subtle)]"
      >
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
          Analysis View:
        </span>
        {VIEWS.map((entry) => {
          const isActive = view === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setView(entry.id)}
              aria-pressed={isActive}
              title={entry.hint}
              data-testid={`comparison-view-${entry.id}`}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer min-h-[32px] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)] ${
                isActive
                  ? 'bg-[var(--lm-color-info-fill)] text-[var(--lm-color-text-primary)] shadow-sm'
                  : 'text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)]'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {view === 'funnel' ? (
        <ThreeTierComparisonView />
      ) : (
        <ComparisonMatrix onSelectSiteForExplore={handleInspectInExplore} />
      )}
    </div>
  );
};

import React from 'react';
import { CockpitHeaderBrand } from './CockpitHeaderBrand';
import { CockpitHeaderNav } from './CockpitHeaderNav';
import { CockpitHeaderStatus } from './CockpitHeaderStatus';
import { useScenarioState } from '../state/useScenarioState';
import { WORKSPACE_HEADINGS } from './workspaceHeadings';

/**
 * Flight deck header: identity, the five workspace destinations, the epistemic status,
 * and — directly above the scientific control strip — the page heading that says which
 * screen this is and what to do on it.
 *
 * The heading lives here rather than inside each projection so every workspace has
 * exactly one `h1` and the document outline never starts at `h3`.
 */
export const CockpitHeader: React.FC = () => {
  const { state } = useScenarioState();
  const heading = WORKSPACE_HEADINGS[state.activeProjection] ?? WORKSPACE_HEADINGS.explore;

  return (
    <header
      aria-label="Flight deck"
      className="sticky top-0 z-40 w-full min-w-0 border-b border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]/95 backdrop-blur"
    >
      {/* Wraps instead of overflowing: on a phone the status chip drops to its own
          line rather than pushing the page into horizontal scroll. */}
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3 py-2 sm:gap-x-4 sm:px-4">
        <CockpitHeaderBrand />
        <CockpitHeaderNav />
        <CockpitHeaderStatus />
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 px-3 pb-2 sm:flex-row sm:items-baseline sm:gap-3 sm:px-4">
        <h1 className="text-lg font-semibold leading-tight tracking-tight text-[var(--lm-color-text-primary)] sm:text-h1">
          {heading.title}
        </h1>
        <p className="min-w-0 text-[11px] leading-snug text-[var(--lm-color-text-muted)] sm:text-xs">
          {heading.orientation}
        </p>
      </div>
    </header>
  );
};

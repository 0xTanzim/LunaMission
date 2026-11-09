import React from 'react';
import { Github, BookOpen } from 'lucide-react';
import { StatusEpistemicBadge } from '../../shared/components/StatusEpistemicBadge';
import { useScenarioState } from '../state/useScenarioState';
import { IconPassport, IconSeismic } from '@/app/components/icons/lmIcons';

const DRAWER_BUTTON_CLASS =
  'hidden xl:inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[32px] shrink-0';

/**
 * Right-hand flight deck status: the computation's epistemic state plus the two
 * reference drawers and repository link. The status chip keeps its full label — an ellipsised
 * "NOMINAL TERR…" told the operator nothing, and the chip is the only place the
 * six-state result vocabulary appears on screen.
 */
export const CockpitHeaderStatus: React.FC = () => {
  const { state, setActiveDrawer } = useScenarioState();

  return (
    <div className="flex items-center gap-2 shrink-0">
      <a
        href="https://github.com/Softsasi/LunaMission"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open LunaMission repository on GitHub"
        title="Open LunaMission on GitHub (Softsasi/LunaMission)"
        data-testid="header-github-link"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-strong)] transition-colors min-h-[32px] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
      >
        <Github size={14} aria-hidden="true" />
        <span className="hidden sm:inline font-semibold">GitHub</span>
      </a>
      <button
        type="button"
        onClick={() => setActiveDrawer(state.activeDrawer === 'guide' ? 'none' : 'guide')}
        aria-expanded={state.activeDrawer === 'guide'}
        aria-label="Open Guidelines and User Documentation"
        title="Open Guidelines & Documentation (Flight Manual)"
        data-testid="header-guide-button"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border transition-colors min-h-[32px] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)] cursor-pointer ${
          state.activeDrawer === 'guide'
            ? 'border-[var(--lm-color-sun)] bg-[var(--lm-color-surface)] text-[var(--lm-color-sun)] shadow-xs'
            : 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-strong)]'
        }`}
      >
        <BookOpen size={14} aria-hidden="true" />
        <span className="hidden sm:inline font-semibold">Guide</span>
      </button>
      <StatusEpistemicBadge
        status={state.calculationStatus}
        onClick={() => setActiveDrawer('provenance')}
        className="shrink-0 whitespace-nowrap"
      />
      <button
        type="button"
        onClick={() => setActiveDrawer(state.activeDrawer === 'seismic' ? 'none' : 'seismic')}
        aria-expanded={state.activeDrawer === 'seismic'}
        aria-label="Toggle Apollo Seismic Context"
        className={`${DRAWER_BUTTON_CLASS} hover:text-[var(--lm-color-warning)] hover:border-[var(--lm-color-warning)]/50`}
      >
        <IconSeismic />
        <span>Seismic</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveDrawer(state.activeDrawer === 'passport' ? 'none' : 'passport')}
        aria-expanded={state.activeDrawer === 'passport'}
        aria-label="Toggle Landing Site Geodesic Passport"
        className={`${DRAWER_BUTTON_CLASS} hover:text-[var(--lm-color-info)] hover:border-[var(--lm-color-info)]/50`}
      >
        <IconPassport />
        <span>Passport</span>
      </button>
    </div>
  );
};

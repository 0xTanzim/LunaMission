import React from 'react';
import { StatusEpistemicBadge } from '../../shared/components/StatusEpistemicBadge';
import { useScenarioState } from '../state/useScenarioState';
import { IconPassport, IconSeismic } from '@/app/components/icons/lmIcons';

const DRAWER_BUTTON_CLASS =
  'hidden xl:inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[32px] shrink-0';

/**
 * Right-hand flight deck status: the computation's epistemic state plus the two
 * reference drawers. The status chip keeps its full label — an ellipsised
 * "NOMINAL TERR…" told the operator nothing, and the chip is the only place the
 * six-state result vocabulary appears on screen.
 */
export const CockpitHeaderStatus: React.FC = () => {
  const { state, setActiveDrawer } = useScenarioState();

  return (
    <div className="flex items-center gap-2 shrink-0">
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

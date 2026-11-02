import { Info, HelpCircle } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { useSiteCatalog } from '@/app/hooks/useSiteCatalog';

interface HeaderStatusControlsProps {
  /** Switches the data-source badge between the demo and live-ephemeris wording. */
  isDemoMode: boolean;
  onOpenProvenance: () => void;
  onOpenGuide: () => void;
}

/** Data-provenance badge, guide entry point, and direct 3D Moon flight deck trigger. */
export function HeaderStatusControls({
  isDemoMode,
  onOpenProvenance,
  onOpenGuide,
}: HeaderStatusControlsProps) {
  const { source: apiSource } = useSiteCatalog('all');

  const handleTrigger3DMoon = () => {
    try {
      window.dispatchEvent(new CustomEvent('lm-activate-3d-moon'));
      window.history.pushState(null, '', '/scenario/3d-lab');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      window.location.hash = '#/scenario/3d-lab';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isDemoMode ? (
        <button
          type="button"
          onClick={onOpenProvenance}
          aria-label="Demo data active notice"
          className="cursor-pointer"
        >
          <Badge variant="demo" icon={<Info className="w-3 h-3" />}>
            Demo Data
          </Badge>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenProvenance}
          aria-label="Ephemeris model status"
          className="cursor-pointer"
        >
          <Badge variant="success" icon={<span className="w-1.5 h-1.5 rounded-full bg-[var(--lm-color-success)]" />}>
            Live Ephemeris
          </Badge>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenProvenance}
        aria-label="REST API Server Connection Status"
        data-testid="header-api-status"
        className="cursor-pointer"
      >
        <Badge
          variant={apiSource === 'nextrush_server' ? 'success' : 'neutral'}
          icon={<span className={`w-1.5 h-1.5 rounded-full ${apiSource === 'nextrush_server' ? 'bg-[var(--lm-color-success)] animate-pulse' : 'bg-[var(--lm-color-info)]'}`} />}
        >
          {apiSource === 'nextrush_server' ? 'NASA REST API' : 'Synced Feed'}
        </Badge>
      </button>

      <button
        type="button"
        onClick={handleTrigger3DMoon}
        aria-label="Open 3D Moon Flight Deck"
        data-testid="header-3d-moon-trigger"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-selected-site)]/40 bg-[var(--lm-color-selected-site)]/10 text-[var(--lm-color-selected-site)] hover:bg-[var(--lm-color-selected-site)]/20 hover:border-[var(--lm-color-selected-site)] transition-colors cursor-pointer shadow-xs"
        title="Open Unified 3D Planetary Flight Deck"
      >
        <span>🪐 3D Moon</span>
      </button>

      <button
        type="button"
        onClick={onOpenGuide}
        aria-label="Observatory Guide & Documentation"
        className="p-1.5 text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)] rounded-[var(--lm-radius-xs)] transition-colors"
        title="Observatory Guide"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </div>
  );
}

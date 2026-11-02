import { useState } from 'react';
import { missionServerClient } from '@/domain/services/missionServerClient';
import { ParetoOptimizationResult, RankedLandingWindow } from '@/domain/windows/types';
import { Sparkles, X, Server, RefreshCw } from 'lucide-react';
import { RankedWindowItem } from './RankedWindowItem';
import { ParetoSolverControls, type ParetoSolverConfig } from './ParetoSolverControls';
import { ApiStateView } from '@/shared/ui/ApiStateView';
import { useDrawerFocusTrap } from '@/app/hooks/useDrawerFocusTrap';

interface ParetoLandingWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  siteName: string;
  onSelectWindow: (window: RankedLandingWindow) => void;
}

const INITIAL_CONFIG: ParetoSolverConfig = {
  targetYear: 2026,
  stayDays: 14,
  minSunlightPct: 50,
  maxShadowH: 48,
};

/**
 * Pareto-optimal landing window solver over one calendar year of ephemeris and terrain.
 *
 * The window the operator selects is a mission epoch commit, so the caller decides what
 * "adopt this window" means for the rest of the flight deck.
 */
export function ParetoLandingWindowModal({
  isOpen,
  onClose,
  siteId,
  siteName,
  onSelectWindow,
}: ParetoLandingWindowModalProps) {
  const [config, setConfig] = useState<ParetoSolverConfig>(INITIAL_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParetoOptimizationResult | null>(null);
  const { containerRef } = useDrawerFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  async function handleSolve() {
    setLoading(true);
    setError(null);
    try {
      const res = await missionServerClient.optimizeLandingWindows({
        siteId,
        startEpochMs: Date.UTC(config.targetYear, 0, 1),
        endEpochMs: Date.UTC(config.targetYear, 11, 31),
        stayDurationDays: config.stayDays,
        minSunlightPct: config.minSunlightPct,
        maxContinuousShadowHours: config.maxShadowH,
        topN: 4,
      });
      if (!res) {
        setError('Solver failed to return optimization data from backend API.');
      } else {
        setResult(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to solve Pareto frontier via backend API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--lm-color-canvas)]/80 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-4 font-mono text-xs shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Pareto-Optimal Landing Window Solver"
        data-testid="pareto-landing-window-modal"
      >
        <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--lm-color-info)]/10 border border-[var(--lm-color-info)]/30 flex items-center justify-center text-[var(--lm-color-info)]">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--lm-color-text-primary)]">
                Pareto-Optimal Landing Window Solver
              </h2>
              <span className="text-[11px] text-[var(--lm-color-text-muted)]">
                Automated multi-objective optimization for {siteName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Pareto landing window solver"
            className="text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] p-1 rounded hover:bg-[var(--lm-color-surface-strong)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <ParetoSolverControls config={config} onChange={setConfig} disabled={loading} />

        <button
          type="button"
          onClick={handleSolve}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[var(--lm-color-info-fill)] hover:bg-[var(--lm-color-info-fill-hover)] text-[var(--lm-color-text-primary)] font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          )}
          <span>{loading ? 'Evaluating Ephemeris & Terrain Grids...' : 'Solve Pareto Frontier'}</span>
        </button>

        {error && (
          <ApiStateView status="failed" title="Pareto Solver Offline" message={error} onRetry={handleSolve} />
        )}

        {result && (
          <div className="flex flex-col gap-2.5 mt-1" data-testid="pareto-window-results">
            <div className="flex items-center justify-between text-[11px] text-[var(--lm-color-text-muted)]">
              <span>
                Evaluated {result.totalWindowsEvaluated} windows in {config.targetYear}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[var(--lm-color-success)]">
                <Server className="w-3 h-3" aria-hidden="true" />
                {result.searchRange.startIso.slice(0, 10)} → {result.searchRange.endIso.slice(0, 10)}
              </span>
            </div>

            {result.topWindows.length === 0 ? (
              <ApiStateView
                status="empty"
                title="No Windows Met Thresholds"
                message={`No landing windows meet constraints in ${config.targetYear}. Try relaxing shadow or sunlight thresholds.`}
              />
            ) : (
              result.topWindows.map((win) => (
                <RankedWindowItem
                  key={win.rank}
                  win={win}
                  onSelect={(selected) => {
                    onSelectWindow(selected);
                    onClose();
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

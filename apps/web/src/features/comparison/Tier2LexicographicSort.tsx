import React from 'react';
import type { RankedFeasibleCandidate } from '@luna/contracts';
import { Tier2TableHeader } from './components/Tier2TableHeader';
import { Tier2CandidateRow } from './components/Tier2CandidateRow';
import { SiteTradeStudyRadar } from './components/SiteTradeStudyRadar';

export interface Tier2LexicographicSortProps {
  rankedCandidates: RankedFeasibleCandidate[];
  selectedSiteAId?: string;
  selectedSiteBId?: string;
  onSelectPairwise: (siteAId: string, siteBId: string) => void;
  onPromotePrimary?: (siteId: string) => void;
  onInspectInAnalyze?: (siteId: string) => void;
  showRadar?: boolean;
  onToggleRadar?: () => void;
  totalEvaluationHours?: number;
  className?: string;
}

/**
 * Tier 2: the surviving candidates in ranked order, each score kept on its own observable.
 * The funnel's counts and any advice live in the one status surface above the tiers.
 */
export const Tier2LexicographicSort: React.FC<Tier2LexicographicSortProps> = ({
  rankedCandidates,
  selectedSiteAId,
  selectedSiteBId,
  onSelectPairwise,
  onPromotePrimary,
  onInspectInAnalyze,
  showRadar = false,
  onToggleRadar,
  totalEvaluationHours = 336.0,
  className = '',
}) => {
  const handleSelectSiteA = (siteId: string) => {
    const currentB = selectedSiteBId === siteId ? undefined : selectedSiteBId;
    if (currentB) onSelectPairwise(siteId, currentB);
  };

  const handleSelectSiteB = (siteId: string) => {
    const currentA = selectedSiteAId === siteId ? undefined : selectedSiteAId;
    if (currentA) onSelectPairwise(currentA, siteId);
  };

  return (
    <section
      role="region"
      aria-label="Tier 2 Lexicographic Priority Ranking"
      className={`flex flex-col gap-3 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-4 font-mono text-xs ${className}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--lm-color-border-subtle)] pb-2.5">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]">
                Tier 2 — Rank the survivors
              </h3>
              <span className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--lm-color-text-muted)]">
                TIE-RESOLVED HIERARCHY
              </span>
            </div>
            <p className="text-[11px] text-[var(--lm-color-text-muted)]">
              Ranked in order: continuous sunlight, darkness tolerance, Earth line-of-sight geometry,
              landing slope. Ties are broken by the next observable.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--lm-color-text-muted)]">
            <span>
              Surviving Candidates: {rankedCandidates.length}
            </span>
            {rankedCandidates.length > 0 && onToggleRadar && (
              <button
                type="button"
                onClick={onToggleRadar}
                aria-expanded={showRadar}
                className="min-h-[32px] rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-2.5 py-1 text-[11px] font-semibold text-[var(--lm-color-text-secondary)] transition-colors hover:border-[var(--lm-color-info-border)] hover:text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]"
              >
                {showRadar ? 'Hide trade-off radar' : 'Show trade-off radar'}
              </button>
            )}
          </div>
        </div>

        {showRadar && rankedCandidates.length > 0 && (
          <div data-testid="tier2-radar-drawer" className="w-full">
            <SiteTradeStudyRadar
              rankedCandidates={rankedCandidates}
              totalEvaluationHours={totalEvaluationHours}
            />
          </div>
        )}
      </div>

      {/* relative anchors abspos sr-only spans to this scroll box so they cannot widen the document. */}
      <div className="relative overflow-x-auto rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)]">
        <table className="w-full border-collapse text-left">
          <Tier2TableHeader />
          <tbody className="divide-y divide-[var(--lm-color-border-subtle)]">
            {rankedCandidates.map((candidate) => (
              <Tier2CandidateRow
                key={candidate.siteId}
                candidate={candidate}
                isSiteA={selectedSiteAId === candidate.siteId}
                isSiteB={selectedSiteBId === candidate.siteId}
                onSelectSiteA={handleSelectSiteA}
                onSelectSiteB={handleSelectSiteB}
                onPromotePrimary={onPromotePrimary}
                onInspectInAnalyze={onInspectInAnalyze}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

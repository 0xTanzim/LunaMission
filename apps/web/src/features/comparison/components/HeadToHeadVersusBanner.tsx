import React from 'react';
import type { Tier3PairwiseDelta } from '@luna/contracts';
import { siteDisplayName } from '../model/siteDisplayName';

interface HeadToHeadVersusBannerProps {
  siteA: Tier3PairwiseDelta['siteA'];
  siteB: Tier3PairwiseDelta['siteB'];
  lowerRiskSite?: 'siteA' | 'siteB' | 'tie';
}

export const HeadToHeadVersusBanner: React.FC<HeadToHeadVersusBannerProps> = ({
  siteA,
  siteB,
  lowerRiskSite,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 bg-gradient-to-r from-[var(--lm-color-info-surface)] via-[var(--lm-color-surface)]/60 to-[var(--lm-color-series-b-surface)] border border-[var(--lm-color-border-subtle)] rounded-xl shadow-lg">
      {/* Site A Card */}
      <div className="flex items-center gap-3 p-3 bg-[var(--lm-color-info-surface)] border border-[var(--lm-color-info-border)] rounded-lg">
        <div className="w-9 h-9 rounded-lg bg-[var(--lm-color-info)]/20 border border-[var(--lm-color-info)] flex items-center justify-center font-mono font-bold text-[var(--lm-color-info)] text-sm shrink-0">
          A
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--lm-color-info)] font-bold">
              Site A Selection
            </span>
            {lowerRiskSite === 'siteA' && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[var(--lm-color-success-surface)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)] font-semibold">
                LOWER TERRAIN RISK
              </span>
            )}
          </div>
          <span className="font-bold text-[var(--lm-color-text-primary)] text-sm truncate" title={siteA.siteName}>{siteDisplayName(siteA.siteName, siteA.siteId)}</span>
          <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] truncate">{siteA.siteId}</span>
        </div>
      </div>

      {/* Versus Badge */}
      <div className="flex flex-col items-center justify-center px-2 py-1 shrink-0">
        <div className="px-3 py-1 rounded-full bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] font-mono text-xs font-bold text-[var(--lm-color-text-secondary)] tracking-wider shadow-inner">
          VS
        </div>
        <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] mt-1 uppercase">Head-to-Head</span>
      </div>

      {/* Site B Card */}
      <div className="flex items-center gap-3 p-3 bg-[var(--lm-color-series-b-surface)] border border-[var(--lm-color-series-b-border)] rounded-lg md:text-right md:flex-row-reverse">
        <div className="w-9 h-9 rounded-lg bg-[var(--lm-color-series-b)]/20 border border-[var(--lm-color-series-b)] flex items-center justify-center font-mono font-bold text-[var(--lm-color-series-b)] text-sm shrink-0">
          B
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 md:justify-end">
            {lowerRiskSite === 'siteB' && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[var(--lm-color-success-surface)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)] font-semibold">
                LOWER TERRAIN RISK
              </span>
            )}
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--lm-color-series-b)] font-bold">
              Site B Selection
            </span>
          </div>
          <span className="font-bold text-[var(--lm-color-text-primary)] text-sm truncate" title={siteB.siteName}>{siteDisplayName(siteB.siteName, siteB.siteId)}</span>
          <span className="text-[11px] font-mono text-[var(--lm-color-text-muted)] truncate">{siteB.siteId}</span>
        </div>
      </div>
    </div>
  );
};

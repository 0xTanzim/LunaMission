import React from 'react';
import type { RankedFeasibleCandidate } from '@luna/contracts';
import { Tier2RankBadge } from './Tier2RankBadge';
import { ComparisonIcon } from './ComparisonIcon';
import { Target } from 'lucide-react';
import { siteDisplayName } from '../model/siteDisplayName';

export interface Tier2CandidateRowProps {
  candidate: RankedFeasibleCandidate;
  isSiteA: boolean;
  isSiteB: boolean;
  onSelectSiteA: (siteId: string) => void;
  onSelectSiteB: (siteId: string) => void;
  onPromotePrimary?: (siteId: string) => void;
  onInspectInAnalyze?: (siteId: string) => void;
}

const formatSortMetric = (metric: string, val: number | undefined): string => {
  const num = val ?? 0;
  switch (metric) {
    case 'longestContinuousSunlight':
      return `☀️ Sun: ${num.toFixed(1)}h`;
    case 'maxContinuousDarkness':
      return `🌑 Dark: ${num.toFixed(1)}h`;
    case 'cumulativeOverlapHours':
      return `⚡ Overlap: ${num.toFixed(1)}h`;
    case 'cumulativeDteHours':
      return `📡 LoS: ${num.toFixed(1)}h`;
    case 'landingSlopeDeg':
      return `📐 Slope: ${num.toFixed(1)}°`;
    default:
      return `${metric}: ${num.toFixed(1)}`;
  }
};

export const Tier2CandidateRow: React.FC<Tier2CandidateRowProps> = ({
  candidate: c,
  isSiteA,
  isSiteB,
  onSelectSiteA,
  onSelectSiteB,
  onPromotePrimary,
  onInspectInAnalyze,
}) => {
  const hasTie = c.sortKeyTrace.some((t) => t.tieBroken);
  const isRegion = c.entityType === 'candidate_region';

  return (
    <tr
      key={c.siteId}
      data-testid={`ranked-row-${c.siteId}`}
      className={`hover:bg-[var(--lm-color-surface-strong)]/40 transition-colors ${
        isSiteA ? 'bg-[var(--lm-color-info-surface)] border-l-2 border-l-[var(--lm-color-info)]' : isSiteB ? 'bg-[var(--lm-color-series-b-surface)] border-l-2 border-l-[var(--lm-color-series-b)]' : ''
      }`}
    >
      <td className="py-2.5 px-3 whitespace-nowrap"><Tier2RankBadge rank={c.rank} /></td>
      <td className="py-2.5 px-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--lm-color-text-primary)] text-xs" title={c.siteName}>{siteDisplayName(c.siteName, c.siteId)}</span>
            {isSiteA && <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] font-bold uppercase border border-[var(--lm-color-info-border)]">Site A</span>}
            {isSiteB && <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--lm-color-series-b-surface)] text-[var(--lm-color-series-b)] font-bold uppercase border border-[var(--lm-color-series-b-border)]">Site B</span>}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--lm-color-text-muted)]">
            <span>{c.coordinates.latitudeDeg.toFixed(2)}°S, {c.coordinates.longitudeEastDeg.toFixed(1)}°E • {c.coordinates.elevationMeters}m</span>
            <span className={`px-1 py-0.2 rounded text-[11px] border ${isRegion ? 'bg-[var(--lm-color-surface)] border-[var(--lm-color-border)] text-[var(--lm-color-warning)]/90' : 'bg-[var(--lm-color-surface)] border-[var(--lm-color-border)] text-[var(--lm-color-info)]/90'}`}>
              {isRegion ? 'Region Centroid' : 'Research Point'}
            </span>
          </div>
        </div>
      </td>
      <td className="py-2.5 px-3 text-[var(--lm-color-warning)] font-bold whitespace-nowrap">
        <div>{(c.metrics.longestContinuousSunlightHours ?? 0).toFixed(1)}h</div>
        <div className="w-16 h-1 bg-[var(--lm-color-surface-strong)] rounded-full overflow-hidden mt-1">
          <div className="h-full bg-[var(--lm-color-warning)] rounded-full" style={{ width: `${Math.min(100, ((c.metrics.longestContinuousSunlightHours ?? 0) / 200) * 100)}%` }} />
        </div>
      </td>
      <td className="py-2.5 px-3 text-[var(--lm-color-text-secondary)] font-semibold whitespace-nowrap">
        <div>{(c.metrics.maxContinuousDarknessHours ?? 0).toFixed(1)}h</div>
        <div className="w-16 h-1 bg-[var(--lm-color-surface-strong)] rounded-full overflow-hidden mt-1">
          <div className="h-full bg-[var(--lm-color-danger)] rounded-full" style={{ width: `${Math.min(100, ((c.metrics.maxContinuousDarknessHours ?? 0) / 60) * 100)}%` }} />
        </div>
      </td>
      <td className="py-2.5 px-3 text-[var(--lm-color-success)] font-bold whitespace-nowrap">
        <div>{(c.metrics.cumulativeDteHours ?? 0).toFixed(1)}h</div>
        <div className="w-16 h-1 bg-[var(--lm-color-surface-strong)] rounded-full overflow-hidden mt-1">
          <div className="h-full bg-[var(--lm-color-success)] rounded-full" style={{ width: `${Math.min(100, ((c.metrics.cumulativeDteHours ?? 0) / 200) * 100)}%` }} />
        </div>
      </td>
      <td className="py-2.5 px-3 text-[var(--lm-color-text-secondary)] font-semibold whitespace-nowrap">
        <div>{(c.metrics.landingSlopeDeg ?? 0).toFixed(1)}°</div>
        <div className="text-[11px] text-[var(--lm-color-text-muted)]">±{(c.metrics.terrainUncertaintySpanHours ?? 0).toFixed(1)}h sens.</div>
      </td>
      <td className="py-2.5 px-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {hasTie && <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning-border)] font-bold">TIE RESOLVED</span>}
          {c.sortKeyTrace.map((t, idx) => (
            <span
              key={idx}
              title={`${t.metric}: ${(t.value ?? 0).toFixed(1)}`}
              className="text-[11px] px-2 py-0.5 rounded bg-[var(--lm-color-surface)] text-[var(--lm-color-text-secondary)] border border-[var(--lm-color-border)]/80 font-mono font-medium"
            >
              <span className="sr-only">{t.metric}: {(t.value ?? 0).toFixed(1)}</span>
              <span aria-hidden="true">{formatSortMetric(t.metric, t.value)}</span>
            </span>
          ))}
        </div>
      </td>
      <td className="py-2.5 px-3 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectSiteA(c.siteId)}
            aria-pressed={isSiteA}
            title="Designate as Site A for Head-to-Head Pairwise Comparison"
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all min-h-[30px] ${
              isSiteA
                ? 'bg-[var(--lm-color-info)] text-[var(--lm-color-canvas)] shadow-md ring-2 ring-[var(--lm-color-info)]'
                : 'bg-[var(--lm-color-surface)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-border)]'
            }`}
          >
            Site A
          </button>
          <button
            type="button"
            onClick={() => onSelectSiteB(c.siteId)}
            aria-pressed={isSiteB}
            title="Designate as Site B for Head-to-Head Pairwise Comparison"
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all min-h-[30px] ${
              isSiteB
                ? 'bg-[var(--lm-color-series-b)] text-[var(--lm-color-canvas)] shadow-md ring-2 ring-[var(--lm-color-series-b)]'
                : 'bg-[var(--lm-color-surface)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-border)]'
            }`}
          >
            Site B
          </button>
          {onPromotePrimary && (
            <button
              type="button"
              onClick={() => onPromotePrimary(c.siteId)}
              title="Promote to Primary Target across Observatory"
              aria-label="Promote to Primary Target"
              className="inline-flex items-center justify-center px-2 py-1 rounded text-[11px] font-bold bg-[var(--lm-color-surface)] hover:bg-[var(--lm-color-warning-surface-strong)] text-[var(--lm-color-warning)] hover:text-[var(--lm-color-text-primary)] border border-[var(--lm-color-border)] hover:border-[var(--lm-color-warning-border)] transition-colors min-h-[30px] min-w-[30px]"
            >
              <ComparisonIcon icon={Target} size={14} />
            </button>
          )}
          {onInspectInAnalyze && (
            <button
              type="button"
              onClick={() => onInspectInAnalyze(c.siteId)}
              title="Inspect in Grazing Sky-Ribbon (Analyze tab)"
              className="px-2 py-1 rounded text-[11px] font-bold bg-[var(--lm-color-surface)] hover:bg-[var(--lm-color-info-surface-strong)] text-[var(--lm-color-info)] hover:text-[var(--lm-color-text-primary)] border border-[var(--lm-color-border)] hover:border-[var(--lm-color-info-border)] transition-colors min-h-[30px]"
            >
              Inspect →
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

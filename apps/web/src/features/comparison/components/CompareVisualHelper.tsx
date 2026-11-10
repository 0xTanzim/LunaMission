import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, Award, Radar, HelpCircle } from 'lucide-react';

export const CompareVisualHelper: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      data-testid="compare-visual-helper"
      className="w-full bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-lg p-3 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={15} className="text-[var(--lm-color-info)] shrink-0" />
          <div>
            <h3 className="text-xs font-semibold text-[var(--lm-color-text-primary)]">
              Decision Guide: How to Read the 3-Tier Funnel &amp; Trade Radar
            </h3>
            <p className="text-[11px] text-[var(--lm-color-text-secondary)] hidden sm:block">
              Visual breakdown of candidate region gating, continuous sunlight ranking, and multi-attribute radar trade-offs.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse Decision Visual Guide' : 'Expand Decision Visual Guide'}
          data-testid="compare-visual-helper-toggle"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-strong)] transition-colors min-h-[32px] shrink-0 cursor-pointer"
        >
          <span>{isExpanded ? 'Hide Visual Guide' : 'Visual Guide'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[var(--lm-color-border-subtle)] flex flex-col gap-3">
          {/* Visual Funnel Diagram */}
          <div className="p-3 rounded bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border)] flex flex-col gap-2">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
              Three-Tier Candidate Selection Architecture
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--lm-color-sun)]">
                  <Filter size={14} />
                  <span>TIER 1: Vehicle Gating</span>
                </div>
                <div className="text-[11px] font-mono text-[var(--lm-color-text-muted)]">Pass / Fail Thresholds</div>
                <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
                  Disqualifies any site exceeding vehicle limits: maximum continuous darkness gap (cold-soak limit) or terrain slope &gt; threshold.
                </p>
              </div>

              <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--lm-color-selected-site)]">
                  <Award size={14} />
                  <span>TIER 2: Illumination Ranking</span>
                </div>
                <div className="text-[11px] font-mono text-[var(--lm-color-text-muted)]">Lexicographic Sort</div>
                <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
                  Ranks qualified candidate regions by longest unbroken solar access window, then by lowest cumulative shadow hours.
                </p>
              </div>

              <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--lm-color-earth)]">
                  <Radar size={14} />
                  <span>TIER 3: Trade-Off Radar</span>
                </div>
                <div className="text-[11px] font-mono text-[var(--lm-color-text-muted)]">Multi-Attribute Polygon</div>
                <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
                  Pairwise delta comparison across 3 key axes: Sunlight hours (outer is better), Earth LoS hours (outer is better), and terrain slope (lower is safer).
                </p>
              </div>
            </div>
          </div>

          {/* Radar Interpretation Legend */}
          <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border-subtle)] flex items-start gap-2 text-[11px] text-[var(--lm-color-text-secondary)]">
            <span className="font-bold text-[var(--lm-color-text-primary)] shrink-0">Radar Interpretation:</span>
            <span>
              The larger the colored polygon area, the more favorable the landing site across illumination and direct-to-Earth communications visibility.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

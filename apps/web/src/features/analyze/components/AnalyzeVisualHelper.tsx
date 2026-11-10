import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Mountain, Sun, Radio, Clock, HelpCircle } from 'lucide-react';

export const AnalyzeVisualHelper: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      data-testid="analyze-visual-helper"
      className="w-full bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] rounded-xl p-3 shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={15} className="text-[var(--lm-color-info)] shrink-0" />
          <div>
            <h3 className="text-xs font-semibold text-[var(--lm-color-text-primary)]">
              Instrument Guide: How to Read the 360° Sky-Ribbon &amp; Horizon Mask
            </h3>
            <p className="text-[11px] text-[var(--lm-color-text-secondary)] hidden sm:block">
              Visual anatomy of topocentric azimuth, LOLA ridge blocking, grazing solar disk, and Earth libration curves.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse Instrument Visual Guide' : 'Expand Instrument Visual Guide'}
          data-testid="analyze-visual-helper-toggle"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-strong)] transition-colors min-h-[32px] shrink-0 cursor-pointer"
        >
          <span>{isExpanded ? 'Hide Visual Guide' : 'Visual Guide'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[var(--lm-color-border-subtle)] flex flex-col gap-3">
          {/* Visual Schematic Diagram */}
          <div className="p-3 rounded bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border)] flex flex-col gap-2">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--lm-color-text-secondary)]">
              360° Horizon Sky-Ribbon Visual Anatomy
            </div>
            
            {/* Visual Schematic Mockup */}
            <div className="relative w-full h-20 bg-[var(--lm-color-surface-raised)] rounded border border-[var(--lm-color-border-subtle)] overflow-hidden flex items-end">
              {/* Azimuth ticks */}
              <div className="absolute top-1 left-2 text-[11px] font-mono text-[var(--lm-color-text-muted)]">N 0°</div>
              <div className="absolute top-1 left-1/4 text-[11px] font-mono text-[var(--lm-color-text-muted)]">E 90°</div>
              <div className="absolute top-1 left-2/4 text-[11px] font-mono text-[var(--lm-color-text-muted)]">S 180°</div>
              <div className="absolute top-1 left-3/4 text-[11px] font-mono text-[var(--lm-color-text-muted)]">W 270°</div>
              
              {/* Zero Horizon line */}
              <div className="absolute w-full bottom-7 border-b border-dashed border-[var(--lm-color-border-strong)]" />
              <div className="absolute right-2 bottom-8 text-[11px] font-mono text-[var(--lm-color-text-muted)]">0° Horizon</div>

              {/* Mountains / Silhouette */}
              <svg className="w-full h-14 fill-[var(--lm-color-surface-strong)] stroke-[var(--lm-color-border-strong)]" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path d="M0,40 L0,22 Q15,10 30,25 Q45,35 60,18 Q75,5 90,28 L100,20 L100,40 Z" />
              </svg>

              {/* Sun trajectory curve */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path d="M5,28 Q30,12 55,20 Q80,26 95,15" fill="none" stroke="var(--lm-color-sun)" strokeWidth="2" strokeDasharray="3,1" />
                <circle cx="55" cy="20" r="3" fill="var(--lm-color-sun)" />
              </svg>

              {/* Earth trajectory curve */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path d="M10,8 Q35,6 60,10 Q85,14 95,9" fill="none" stroke="var(--lm-color-earth)" strokeWidth="1.5" />
                <circle cx="60" cy="10" r="2.5" fill="var(--lm-color-earth)" />
              </svg>

              {/* Playhead vertical line */}
              <div className="absolute top-0 bottom-0 left-[55%] w-0.5 bg-[var(--lm-color-warning)]" />
            </div>
          </div>

          {/* Callout Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border-subtle)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lm-color-text-primary)]">
                <Mountain size={14} className="text-[var(--lm-color-text-secondary)]" />
                <span>1. Dark Silhouette</span>
              </div>
              <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
                Real LOLA 128ppd elevation crests. If a celestial body dips behind this ridge silhouette, line-of-sight is blocked.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border-subtle)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lm-color-sun)]">
                <Sun size={14} />
                <span>2. Gold Sun Curve</span>
              </div>
              <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
                Solar center trajectory with 0.53° penumbral band. Skims between −1.5° and +1.5° near south-polar horizons.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border-subtle)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lm-color-earth)]">
                <Radio size={14} />
                <span>3. Blue Earth Curve</span>
              </div>
              <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
                Sub-Earth elevation oscillating with optical libration (±7.9°). Indicates geometric direct-to-Earth view.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border-subtle)] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lm-color-warning)]">
                <Clock size={14} />
                <span>4. Playhead Scrubber</span>
              </div>
              <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
                Vertical amber line marking active UTC time instant. Drag playhead or press Spacebar to animate the sun pass.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Layout, Compass, Radar } from 'lucide-react';

export const GuideVisualAnatomyDiagram: React.FC = () => {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2">
        <Layout size={15} className="text-[var(--lm-color-sun)]" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--lm-color-text-primary)]">
          Cockpit Visual Architecture Schematics
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Schematic 1: Cockpit Layout */}
        <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--lm-color-text-primary)]">
            <span className="flex items-center gap-1.5">
              <Compass size={14} className="text-[var(--lm-color-selected-site)]" />
              <span>Workspace &amp; Scenario Layout</span>
            </span>
            <span className="text-[11px] font-mono text-[var(--lm-color-sun)]">Figure 1</span>
          </div>

          <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[11px] font-mono space-y-2">
            {/* Header Mockup */}
            <div className="flex items-center justify-between p-1.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)]">
              <span className="font-bold text-[var(--lm-color-text-primary)]">LUNAMISSION</span>
              <div className="flex gap-1 text-[11px] text-[var(--lm-color-text-secondary)]">
                <span className="px-1 bg-[var(--lm-color-surface-raised)] rounded">1. Map</span>
                <span className="px-1 bg-[var(--lm-color-surface-raised)] rounded">2. Analyze</span>
                <span className="px-1 bg-[var(--lm-color-surface-raised)] rounded">3. Compare</span>
              </div>
            </div>

            {/* Config Bar Mockup */}
            <div className="p-1.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] text-[11px] flex justify-between items-center text-[var(--lm-color-text-secondary)]">
              <span>[Site: Connecting Ridge]</span>
              <span>[Epoch: Nov 2026]</span>
              <span>[Mast: 2m]</span>
              <span className="text-[var(--lm-color-sun)]">[Dossier]</span>
            </div>

            {/* Split Workspace Mockup */}
            <div className="grid grid-cols-3 gap-1 h-14">
              <div className="col-span-2 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] flex items-center justify-center text-[var(--lm-color-text-muted)]">
                Polar 2D Stereographic Map (83°S–90°S)
              </div>
              <div className="rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] flex items-center justify-center text-[var(--lm-color-text-muted)] text-[11px] text-center p-1">
                Point Passport
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
            The top Scenario Bar defines boundary inputs. The center displays spatial polar mapping, while the right dock presents local slope and elevation telemetry.
          </p>
        </div>

        {/* Schematic 2: Analyze Horizon & Compare Funnel */}
        <div className="p-3 rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--lm-color-text-primary)]">
            <span className="flex items-center gap-1.5">
              <Radar size={14} className="text-[var(--lm-color-earth)]" />
              <span>Horizon Mask &amp; Decision Funnel</span>
            </span>
            <span className="text-[11px] font-mono text-[var(--lm-color-sun)]">Figure 2</span>
          </div>

          <div className="p-2.5 rounded bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[11px] font-mono space-y-2">
            {/* Horizon Skyline Graphic */}
            <div className="relative h-12 bg-[var(--lm-color-surface)] rounded border border-[var(--lm-color-border-subtle)] overflow-hidden flex items-end">
              <div className="absolute top-1 left-2 text-[11px] text-[var(--lm-color-sun)]">☀️ Sun Trajectory</div>
              <div className="absolute top-1 right-2 text-[11px] text-[var(--lm-color-earth)]">🌍 Earth Libration</div>
              <svg className="w-full h-8 fill-[var(--lm-color-surface-strong)] stroke-[var(--lm-color-border)]" preserveAspectRatio="none" viewBox="0 0 100 30">
                <path d="M0,30 L0,15 Q25,5 50,18 Q75,3 100,12 L100,30 Z" />
              </svg>
            </div>

            {/* 3-Tier Funnel Graphic */}
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <div className="flex-1 p-1 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] text-center text-[var(--lm-color-sun)]">
                Tier 1: Gating
              </div>
              <span className="text-[var(--lm-color-text-muted)]">→</span>
              <div className="flex-1 p-1 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] text-center text-[var(--lm-color-selected-site)]">
                Tier 2: Ranking
              </div>
              <span className="text-[var(--lm-color-text-muted)]">→</span>
              <div className="flex-1 p-1 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)] text-center text-[var(--lm-color-earth)]">
                Tier 3: Radar
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[var(--lm-color-text-secondary)] leading-relaxed">
            Analyze reads 360° terrain occlusion against solar and Earth passes. Compare applies the 3-Tier Funnel to select the candidate with maximal unbroken daylight.
          </p>
        </div>
      </div>
    </div>
  );
};

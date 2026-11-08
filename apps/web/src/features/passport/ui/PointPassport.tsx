import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { PassportCalculationModeSwitch } from '@/features/passport/components/summary/PassportCalculationModeSwitch';
import { PassportSiteHeader } from '@/features/passport/components/summary/PassportSiteHeader';
import { PassportSunSection } from '@/features/passport/components/summary/PassportSunSection';
import { PassportEarthSection } from '@/features/passport/components/summary/PassportEarthSection';
import { PassportHorizonSummary } from '@/features/passport/components/summary/PassportHorizonSummary';

export interface PointPassportProps {
  /** App-level navigation: opening the Method & Provenance tab is not scenario state. */
  onOpenMethodDetails: () => void;
  /** App-level navigation: transition to dedicated 360° Horizon Radar tab. */
  onNavigateHorizon?: () => void;
}

export function PointPassport({ onOpenMethodDetails, onNavigateHorizon }: PointPassportProps) {
  return (
    <div className="flex flex-col gap-3.5 bg-[var(--lm-color-surface-raised)]/40 border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-md)] p-4 sm:p-5 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--lm-color-border-subtle)]">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--lm-color-text-muted)]">
          Horizon Model
        </span>
        <PassportCalculationModeSwitch />
      </div>
      <PassportSiteHeader />
      <PassportSunSection />
      <PassportEarthSection />
      <PassportHorizonSummary onNavigateHorizon={onNavigateHorizon} />

      {/* Provenance and Verification Footer Strip */}
      <div className="pt-2 border-t border-[var(--lm-color-border-subtle)] flex items-center justify-between text-xs text-[var(--lm-color-text-muted)] font-mono">
        <span className="flex items-center gap-1.5 text-[var(--lm-color-success)]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>JPL Horizons Benchmark Verified</span>
        </span>
        <button
          type="button"
          onClick={onOpenMethodDetails}
          className="flex items-center gap-1 text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] transition-colors underline underline-offset-2"
        >
          <span>Method & Provenance</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

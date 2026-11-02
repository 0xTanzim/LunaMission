import React from 'react';
import { FileText } from 'lucide-react';
import { PointPassport } from '@/features/passport/ui/PointPassport';

export interface PlanetaryTheaterSidebarProps {
  isSplitView: boolean;
  onReturnToObservatory: () => void;
}

export function PlanetaryTheaterSidebar({
  isSplitView,
  onReturnToObservatory,
}: PlanetaryTheaterSidebarProps) {
  if (!isSplitView) return null;

  return (
    <aside
      aria-label="Synchronized 2D Scientific Passport"
      className="w-1/2 h-full bg-[var(--lm-color-surface)] border-l border-[var(--lm-color-border)] p-4 pt-16 overflow-y-auto flex flex-col gap-4 z-10"
    >
      <div className="flex items-center justify-between border-b border-[var(--lm-color-border-subtle)] pb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--lm-color-info)]" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[var(--lm-color-text-primary)]">
            Synchronized 2D Scientific Passport
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--lm-color-success)] bg-[var(--lm-color-success)]/10 px-2 py-0.5 rounded border border-[var(--lm-color-success)]/30">
          LIVE LOCKED
        </span>
      </div>
      <PointPassport onOpenMethodDetails={onReturnToObservatory} />
    </aside>
  );
}

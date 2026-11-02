import { RankedLandingWindow } from '@/domain/windows/types';
import { Check } from 'lucide-react';

interface RankedWindowItemProps {
  win: RankedLandingWindow;
  onSelect: (win: RankedLandingWindow) => void;
}

/**
 * One ranked landing window. Feasibility is stated in words as well as colour so the
 * verdict survives a monochrome print or a colour-vision deficiency.
 */
export function RankedWindowItem({ win, onSelect }: RankedWindowItemProps) {
  const isOptimal = win.feasibilityVerdict === 'optimal';

  return (
    <div
      data-testid={`ranked-window-${win.rank}`}
      className="bg-[var(--lm-color-canvas)] p-3 rounded-lg border border-[var(--lm-color-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)] flex items-center justify-center font-bold text-[11px]">
            #{win.rank}
          </span>
          <span className="font-bold text-[var(--lm-color-text-primary)]">
            {win.startDateIso.slice(0, 10)} &rarr; {win.endDateIso.slice(0, 10)}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] uppercase font-bold ${
              isOptimal
                ? 'bg-[var(--lm-color-success-surface)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)]'
                : 'bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)]'
            }`}
          >
            {isOptimal ? '✓ Optimal' : 'Viable'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--lm-color-text-muted)]">
          <span>
            Sunlight: <strong className="text-[var(--lm-color-info)]">{win.sunlightPercentage}%</strong> (
            {win.continuousSunlightHours}h cont.)
          </span>
          <span>
            Max Shadow: <strong className="text-[var(--lm-color-danger)]">{win.maxShadowHours}h</strong>
          </span>
          <span>
            Earth LoS: <strong className="text-[var(--lm-color-success)]">{win.dteAvailabilityPercentage}%</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span className="text-[11px] text-[var(--lm-color-text-muted)] block">Pareto Score</span>
          <span className="text-base font-black text-[var(--lm-color-info)]">{win.paretoScore}</span>
        </div>
        <button
          type="button"
          onClick={() => onSelect(win)}
          aria-label={`Adopt landing window starting ${win.startDateIso.slice(0, 10)}`}
          className="px-3 py-1.5 rounded bg-[var(--lm-color-info-surface)] hover:bg-[var(--lm-color-info-surface-strong)] border border-[var(--lm-color-info-border)] text-[var(--lm-color-info)] flex items-center gap-1 font-semibold text-xs cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
        >
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Select</span>
        </button>
      </div>
    </div>
  );
}

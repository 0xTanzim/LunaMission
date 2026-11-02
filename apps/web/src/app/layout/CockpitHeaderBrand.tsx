import React from 'react';

/**
 * Product mark. The moon-limb glyph is part of the logotype rather than a control
 * icon, so it stays typographic; the version chip drops below 640px to leave the
 * navigation and status room to breathe.
 */
export const CockpitHeaderBrand: React.FC = () => {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--lm-color-info)] to-[var(--lm-color-data-demo)] text-xs font-bold text-[var(--lm-color-canvas)]"
        >
          ☾
        </div>
        <span className="truncate font-mono text-sm font-bold tracking-wider text-[var(--lm-color-text-primary)]">
          LUNA<span className="text-[var(--lm-color-info)]">MISSION</span>
        </span>
        <span className="sr-only">LunaMission Observatory</span>
      </div>
      <span className="hidden shrink-0 rounded border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--lm-color-info)] sm:inline">
        V2.0 PRO
      </span>
    </div>
  );
};

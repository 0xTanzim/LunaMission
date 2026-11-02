/** Product mark and full name of the observatory, as shown in the shell header. */
export function HeaderBrand() {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      {/* Restrained Lunar Orbit Emblem */}
      <div className="w-7 h-7 rounded-full bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] flex items-center justify-center relative overflow-hidden shadow-inner">
        <div className="w-4 h-4 rounded-full bg-[var(--lm-color-border-strong)] relative">
          <div className="absolute inset-0 bg-[var(--lm-color-surface-raised)] rounded-full -translate-x-1.5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-base sm:text-lg tracking-tight text-[var(--lm-color-text-primary)]">
          LunaMission
        </span>
        <span className="hidden sm:inline-block text-[11px] font-mono text-[var(--lm-color-text-muted)] tracking-wider uppercase">
          South-Pole Observatory
        </span>
      </div>
    </div>
  );
}

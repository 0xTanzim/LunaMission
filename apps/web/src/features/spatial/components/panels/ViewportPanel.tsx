import { ReactNode } from 'react';

export interface ViewportPanelProps {
  title: string;
  subtitle: string;
  subtitleClassName: string;
  children: ReactNode;
}

/** Titled border box that hosts one spatial visualization inside the dual view. */
export function ViewportPanel({ title, subtitle, subtitleClassName, children }: ViewportPanelProps) {
  return (
    <div className="h-[480px] md:h-full w-full min-h-0 flex flex-col rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] overflow-hidden bg-[var(--lm-color-canvas)]">
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--lm-color-surface-raised)] border-b border-[var(--lm-color-border-subtle)] text-[11px] font-mono text-[var(--lm-color-text-secondary)] shrink-0">
        <span className="font-semibold text-[var(--lm-color-text-primary)]">{title}</span>
        <span className={`text-[11px] ${subtitleClassName}`}>{subtitle}</span>
      </div>
      <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
  );
}

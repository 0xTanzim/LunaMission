import React from 'react';
import { Info, Telescope } from 'lucide-react';

export function PassportPillButton({
  isOpen,
  onToggle,
  title,
  testId,
}: {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  testId?: string;
}) {
  const activeCls = isOpen
    ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border-[var(--lm-color-selected-site)] font-semibold'
    : 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border)] hover:text-[var(--lm-color-text-primary)]';

  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      aria-label="Toggle Point Passport overlay"
      aria-expanded={isOpen}
      data-testid={testId}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[var(--lm-radius-sm)] border transition-colors whitespace-nowrap shrink-0 h-[28px] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus:outline-none ${activeCls}`}
    >
      <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline whitespace-nowrap">Point Passport</span>
    </button>
  );
}

export function IntelPillButton({
  isOpen,
  onToggle,
  title,
  testId,
}: {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  testId?: string;
}) {
  const activeCls = isOpen
    ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-info)] border-[var(--lm-color-info)] font-semibold'
    : 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border)] hover:text-[var(--lm-color-text-primary)]';

  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      aria-label="Toggle Site Intel and NASA Lunar Trek Drawer"
      aria-expanded={isOpen}
      data-testid={testId ?? 'toggle-site-intel'}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[var(--lm-radius-sm)] border transition-colors whitespace-nowrap shrink-0 h-[28px] cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus:outline-none ${activeCls}`}
    >
      <Telescope className="w-3.5 h-3.5 shrink-0 text-[var(--lm-color-info)]" aria-hidden="true" />
      <span className="hidden sm:inline whitespace-nowrap">Site Intel</span>
    </button>
  );
}

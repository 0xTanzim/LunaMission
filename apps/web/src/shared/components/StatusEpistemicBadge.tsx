import React from 'react';
import type { SixStateResultStatus } from '@luna/contracts';

interface StatusEpistemicBadgeProps {
  status: SixStateResultStatus | 'loading';
  onClick?: () => void;
  className?: string;
}

export const StatusEpistemicBadge: React.FC<StatusEpistemicBadgeProps> = ({
  status,
  onClick,
  className = '',
}) => {
  const config = {
    valid: {
      bg: 'bg-[var(--lm-color-success-surface-strong)] border-[var(--lm-color-success)]/60 text-[var(--lm-color-success)]',
      icon: '✓',
      label: 'NOMINAL EVALUATION',
      aria: 'Status: Complete computation on the nominal LOLA 20 m terrain and TT-UTC JPL Horizons ephemerides. No empirical terrain ensemble is available for this site, so the result can never guarantee power, survival or flight certification.',
    },
    'valid-with-limitations': {
      bg: 'bg-[var(--lm-color-info-surface-strong)] border-[var(--lm-color-info)]/60 text-[var(--lm-color-info)]',
      icon: 'ℹ',
      label: 'VALID + LIMITATIONS',
      aria: 'Status: Valid with minor limitations such as DEM seam hand-off or secondary ephemeris interpolation.',
    },
    approximate: {
      bg: 'bg-[var(--lm-color-warning-surface-strong)] border-[var(--lm-color-warning)]/60 text-[var(--lm-color-warning)]',
      icon: '⚠',
      label: 'APPROXIMATE',
      aria: 'Status: Approximate evaluation with coarse elevation sampling.',
    },
    incomplete: {
      bg: 'bg-[var(--lm-color-data-demo-surface-strong)] border-[var(--lm-color-data-demo)]/60 text-[var(--lm-color-data-demo)]',
      icon: '◒',
      label: 'INCOMPLETE COVERAGE',
      aria: 'Status: Incomplete coverage due to horizon ray truncation at DEM perimeter boundary.',
    },
    unsupported: {
      bg: 'bg-[var(--lm-color-surface)] border-[var(--lm-color-border-strong)] text-[var(--lm-color-text-secondary)]',
      icon: '✕',
      label: 'UNSUPPORTED',
      aria: 'Status: Unsupported parameter envelope.',
    },
    failed: {
      bg: 'bg-[var(--lm-color-danger-surface-strong)] border-[var(--lm-color-danger)]/60 text-[var(--lm-color-danger)]',
      icon: '!',
      label: 'EVALUATION FAILED',
      aria: 'Status: Calculation failed. No synthetic data fallback.',
    },
    loading: {
      bg: 'bg-[var(--lm-color-info-surface-strong)] border-[var(--lm-color-info)]/60 text-[var(--lm-color-info)] animate-pulse',
      icon: '⏳',
      label: 'SOLVING',
      aria: 'Status: Solving topocentric visibility roots on backend REST engine.',
    },
  }[status];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={config.aria}
      className={`tap-target inline-flex max-w-full items-start gap-1.5 whitespace-normal break-words rounded border px-2.5 py-1 text-left text-body font-mono font-medium leading-snug tracking-wide transition-colors ${config.bg} ${onClick ? 'cursor-pointer hover:brightness-125 focus-visible:outline-2 focus-visible:outline-[var(--lm-color-focus)]' : 'cursor-default'} ${className}`}
    >
      <span
        className="shrink-0 text-sm font-bold leading-none"
        aria-hidden="true"
        style={{ paddingTop: '1px' }}
      >
        {config.icon}
      </span>
      <span className="min-w-0">{config.label}</span>
    </button>
  );
};

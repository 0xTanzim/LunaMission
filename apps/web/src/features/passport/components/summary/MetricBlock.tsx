import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { ResultAvailability } from '@/domain/celestial/availability';

interface MetricBlockProps {
  label: string;
  result: ResultAvailability<number | string>;
  definition?: string;
  qualifier?: string;
  accentColor?: string; // CSS color string or var
  badge?: React.ReactNode;
}

export function MetricBlock({
  label,
  result,
  definition,
  qualifier,
  accentColor,
  badge,
}: MetricBlockProps) {
  const [showDefinition, setShowDefinition] = useState(false);

  return (
    <div className="bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-sm)] p-3 flex flex-col justify-between transition-colors hover:border-[var(--lm-color-border)]/80">
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-xs font-medium text-[var(--lm-color-text-secondary)] flex items-center gap-1.5">
          {label}
          {definition && (
            <button
              type="button"
              onClick={() => setShowDefinition(!showDefinition)}
              className="-m-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-info)]"
              title="Metric definition and interpretation"
              aria-label={`Definition for ${label}`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
        {badge}
      </div>

      {/* Main Metric Value and Unit */}
      <div className="flex items-baseline gap-1.5 my-0.5">
        {result.kind === 'available' ? (
          <>
            <span
              className="text-xl sm:text-2xl font-bold font-mono-num tracking-tight"
              style={{ color: accentColor || 'var(--lm-color-text-primary)' }}
            >
              {typeof result.value === 'number' && result.value > 0 && result.unit === '°' ? `+${result.value}` : result.value}
            </span>
            <span className="text-xs sm:text-sm font-mono text-[var(--lm-color-text-muted)]">
              {result.unit}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-sm font-mono text-[var(--lm-color-text-disabled)] italic">
            <span>—</span>
            <span className="text-xs uppercase">({result.kind}: {result.reason})</span>
          </div>
        )}
      </div>

      {/* Secondary Qualifier / Methodology Note */}
      <div className="text-[11px] text-[var(--lm-color-text-muted)] font-mono truncate mt-1">
        {result.kind === 'available' && result.qualityNote
          ? result.qualityNote
          : qualifier || ''}
      </div>

      {/* Expandable Definition Box */}
      {showDefinition && definition && (
        <div className="mt-2 pt-2 border-t border-[var(--lm-color-border-subtle)] text-[11px] leading-relaxed text-[var(--lm-color-text-secondary)] bg-[var(--lm-color-surface)] p-2 rounded-[var(--lm-radius-xs)] font-sans">
          {definition}
        </div>
      )}
    </div>
  );
}

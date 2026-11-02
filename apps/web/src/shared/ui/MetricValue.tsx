import React from 'react';
import { cx } from './cx';

export interface MetricValueProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  /** Secondary line: provenance, interval, or state. */
  detail?: React.ReactNode;
  size?: 'primary' | 'secondary';
  tone?: 'default' | 'sun' | 'earth' | 'success' | 'warning' | 'danger';
  className?: string;
}

const TONE: Record<NonNullable<MetricValueProps['tone']>, string> = {
  default: 'text-[var(--lm-color-text-primary)]',
  sun: 'text-[var(--lm-color-sun)]',
  earth: 'text-[var(--lm-color-earth)]',
  success: 'text-[var(--lm-color-success)]',
  warning: 'text-[var(--lm-color-warning)]',
  danger: 'text-[var(--lm-color-danger)]',
};

/**
 * A number and its name. The value is the largest text on its panel; the label is the smallest.
 * Unavailable data must render through `detail` as an explicit state, never as a zero.
 */
export const MetricValue: React.FC<MetricValueProps> = ({
  label,
  value,
  unit,
  detail,
  size = 'primary',
  tone = 'default',
  className,
}) => (
  <div className={cx('flex min-w-0 flex-col gap-0.5', className)}>
    <span className="text-[length:var(--lm-text-micro)] font-medium uppercase tracking-wider text-[var(--lm-color-text-muted)]">
      {label}
    </span>
    <span className="flex min-w-0 items-baseline gap-1">
      <span
        className={cx(
          'font-mono-num font-semibold tabular-nums leading-none',
          size === 'primary'
            ? 'text-[length:var(--lm-text-metric)]'
            : 'text-[length:var(--lm-text-h3)]',
          TONE[tone],
        )}
      >
        {value}
      </span>
      {unit && (
        <span className="text-[length:var(--lm-text-label)] text-[var(--lm-color-text-muted)]">{unit}</span>
      )}
    </span>
    {detail && (
      <span className="text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">{detail}</span>
    )}
  </div>
);

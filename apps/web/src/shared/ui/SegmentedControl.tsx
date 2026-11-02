import React, { useId } from 'react';
import { cx } from './cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional decorative icon; the text carries the name. */
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Single-select control. Implemented as a radiogroup rather than buttons so arrow keys and
 * selection semantics come from the platform (WCAG 2.1.1 / 4.1.2).
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'inline-flex min-w-0 items-center gap-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cx(
              'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--lm-radius-xs)] font-medium transition-colors',
              'min-h-[24px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--lm-color-focus)]',
              size === 'sm' ? 'px-2 py-0.5 text-[length:var(--lm-text-micro)]' : 'px-2.5 py-1 text-[length:var(--lm-text-label)]',
              option.disabled && 'cursor-not-allowed opacity-50',
              selected
                ? 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-primary)] ring-1 ring-[var(--lm-color-info)]'
                : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

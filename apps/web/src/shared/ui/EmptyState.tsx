import React from 'react';
import { cx } from './cx';

export interface EmptyStateProps {
  title: string;
  /** What is missing and why — never a blank panel. */
  description: string;
  /** The next action. An empty state without a way forward is a dead end. */
  action?: React.ReactNode;
  tone?: 'neutral' | 'warning' | 'danger';
  className?: string;
  testId?: string;
}

const TONE: Record<NonNullable<EmptyStateProps['tone']>, string> = {
  neutral: 'border-[var(--lm-color-border-subtle)]',
  warning: 'border-[var(--lm-color-warning)]/40',
  danger: 'border-[var(--lm-color-danger)]/40',
};

/**
 * The only sanctioned empty/error presentation. It must state what is missing and offer a next
 * action (docs/ui/INTERACTION_VOCABULARY.md).
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  tone = 'neutral',
  className,
  testId,
}) => (
  <div
    role="status"
    data-testid={testId}
    className={cx(
      'flex flex-col items-start gap-2 rounded-[var(--lm-radius-md)] border bg-[var(--lm-color-surface)] p-4',
      TONE[tone],
      className,
    )}
  >
    <p className="text-[length:var(--lm-text-body)] font-semibold text-[var(--lm-color-text-primary)]">{title}</p>
    <p className="text-[length:var(--lm-text-label)] text-[var(--lm-color-text-secondary)]">{description}</p>
    {action && <div className="pt-1">{action}</div>}
  </div>
);

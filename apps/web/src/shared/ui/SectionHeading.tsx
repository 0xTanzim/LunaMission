import React from 'react';
import { cx } from './cx';

export interface SectionHeadingProps {
  children: React.ReactNode;
  /** Small text after the title: counts, units, provenance. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  level?: 2 | 3;
  id?: string;
  className?: string;
}

/**
 * Section and sub-section headings. Level maps to the document outline, so headings never skip
 * (docs/ui/IDENTITY.md, WCAG 1.3.1 / 2.4.6).
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  children,
  meta,
  actions,
  level = 2,
  id,
  className,
}) => {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <div className={cx('flex min-w-0 flex-wrap items-baseline justify-between gap-2', className)}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-2">
        <Tag
          id={id}
          className={cx(
            'font-semibold tracking-tight text-[var(--lm-color-text-primary)]',
            level === 2
              ? 'text-[length:var(--lm-text-h2)]'
              : 'text-[length:var(--lm-text-h3)]',
          )}
        >
          {children}
        </Tag>
        {meta && (
          <span className="text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]">{meta}</span>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
};

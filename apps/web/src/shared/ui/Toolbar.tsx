import React from 'react';
import { cx } from './cx';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
}

/** A horizontal control strip. Always labelled: it is a landmark for assistive technology. */
export const Toolbar: React.FC<ToolbarProps> = ({ label, className, children, ...rest }) => (
  <div
    role="toolbar"
    aria-label={label}
    className={cx('flex min-w-0 flex-wrap items-center gap-2', className)}
    {...rest}
  >
    {children}
  </div>
);

export interface ToolbarGroupProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A visually grouped set of related controls. The separation is structural (a bordered group),
 * not colour-only, so it survives forced-colours mode.
 */
export const ToolbarGroup: React.FC<ToolbarGroupProps> = ({ label, children, className }) => (
  <div
    role="group"
    aria-label={label}
    className={cx(
      'flex min-w-0 items-center gap-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] p-1',
      className,
    )}
  >
    {children}
  </div>
);

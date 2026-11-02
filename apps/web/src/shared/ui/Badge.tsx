import React from 'react';

export type BadgeVariant =
  | 'sun'
  | 'earth'
  | 'selected'
  | 'demo'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

export function Badge({ variant = 'neutral', children, icon, className = '', title }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    sun: 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-sun)] border-[var(--lm-color-sun)]/40',
    earth: 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-earth)] border-[var(--lm-color-earth)]/40',
    selected: 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border-[var(--lm-color-selected-site)]/50',
    demo: 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-data-demo)] border-[var(--lm-color-data-demo)]/40',
    success: 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-success)] border-[var(--lm-color-success)]/40',
    warning: 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-warning)] border-[var(--lm-color-warning)]/40',
    danger: 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-danger)] border-[var(--lm-color-danger)]/40',
    neutral: 'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border)]',
    outline: 'bg-transparent text-[var(--lm-color-text-muted)] border-[var(--lm-color-border-subtle)]',
  };

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--lm-radius-xs)] border text-xs font-medium tracking-wide uppercase font-mono-num ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

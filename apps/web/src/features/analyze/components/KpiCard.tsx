import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  status?: 'nominal' | 'warning' | 'alert';
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subValue,
  status = 'nominal',
  className = '',
}) => {
  const borderStatus = {
    nominal: 'border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)]/80',
    warning: 'border-[var(--lm-color-warning)]/40 bg-[var(--lm-color-warning-surface)]',
    alert: 'border-[var(--lm-color-danger)]/40 bg-[var(--lm-color-danger-surface)]',
  }[status];

  const textStatus = {
    nominal: 'text-[var(--lm-color-text-primary)]',
    warning: 'text-[var(--lm-color-warning)]',
    alert: 'text-[var(--lm-color-danger)]',
  }[status];

  return (
    <div className={`p-3 rounded-lg border font-mono ${borderStatus} ${className}`}>
      <div className="text-[11px] text-[var(--lm-color-text-muted)] uppercase tracking-wider font-semibold truncate mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold tracking-tight ${textStatus}`}>{value}</span>
        {unit && <span className="text-xs text-[var(--lm-color-text-muted)] font-normal">{unit}</span>}
      </div>
      {subValue && (
        <div className="text-[11px] text-[var(--lm-color-text-muted)] mt-1 truncate">
          {subValue}
        </div>
      )}
    </div>
  );
};

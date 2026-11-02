import React from 'react';

interface ScientificColorScaleBarProps {
  leftLabel: string;
  leftClass?: string;
  midLabel?: string;
  midClass?: string;
  rightLabel: string;
  rightClass?: string;
  gradient: string;
  subLeft: string;
  subRight: string;
  subRightClass?: string;
}

export function ScientificColorScaleBar({
  leftLabel,
  leftClass = 'text-[var(--lm-color-text-secondary)]',
  midLabel,
  midClass = 'text-[var(--lm-color-text-muted)]',
  rightLabel,
  rightClass = 'text-[var(--lm-color-text-secondary)]',
  gradient,
  subLeft,
  subRight,
  subRightClass = 'text-[var(--lm-color-info)]',
}: ScientificColorScaleBarProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className={leftClass}>{leftLabel}</span>
        {midLabel && <span className={midClass}>{midLabel}</span>}
        <span className={rightClass}>{rightLabel}</span>
      </div>
      <div
        className="w-full h-2.5 rounded-sm border border-[var(--lm-color-border)] shadow-inner"
        style={{ background: gradient }}
      />
      <div className="flex items-center justify-between text-[11px] text-[var(--lm-color-text-muted)]">
        <span>{subLeft}</span>
        <span className={subRightClass}>{subRight}</span>
      </div>
    </div>
  );
}

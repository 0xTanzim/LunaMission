import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { LM_ICON_SIZE, LM_ICON_STROKE } from '@/app/components/icons/lmIcons';

export interface ComparisonIconProps {
  icon: LucideIcon;
  /** Optical size in CSS pixels. Defaults to the product icon size. */
  size?: number;
  className?: string;
}

/**
 * Comparison screens label their observables with marks (sunlight, darkness, Earth LoS,
 * slope). Those marks used to be emoji, which rendered at a different size and stroke
 * weight on every platform and were announced verbatim by screen readers. They are now
 * SVG glyphs from the same `lucide-react` set the navigation uses, drawn at the product's
 * icon size and stroke weight, and always decorative: the adjacent text owns the name.
 */
export const ComparisonIcon: React.FC<ComparisonIconProps> = ({
  icon: Icon,
  size = LM_ICON_SIZE,
  className = '',
}) => (
  <Icon
    size={size}
    strokeWidth={LM_ICON_STROKE}
    aria-hidden="true"
    focusable="false"
    className={`shrink-0 ${className}`}
  />
);

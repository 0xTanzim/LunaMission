import React from 'react';
import { cx } from './cx';

export type PanelElevation = 'surface' | 'raised' | 'none';

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'aside';
  elevation?: PanelElevation;
  /** Heading text. When provided the panel becomes a labelled region. */
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  padded?: boolean;
}

const ELEVATION: Record<PanelElevation, string> = {
  surface: 'bg-[var(--lm-color-surface)] border border-[var(--lm-color-border-subtle)]',
  raised: 'bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border-subtle)]',
  none: '',
};

/**
 * The single container primitive. One border, one radius, one surface level — screens must not
 * nest panels inside panels to fake hierarchy; use SectionHeading instead (docs/ui/IDENTITY.md).
 */
export const Panel = React.forwardRef<HTMLElement, PanelProps>(function Panel(
  { as = 'section', elevation = 'surface', title, description, actions, padded = true, className, children, ...rest },
  ref,
) {
  const Tag = as;
  return (
    <Tag
      ref={ref as never}
      aria-label={!title ? rest['aria-label'] : undefined}
      className={cx(
        'flex min-w-0 flex-col gap-3 rounded-[var(--lm-radius-lg)]',
        ELEVATION[elevation],
        padded && 'p-4 sm:p-5',
        className,
      )}
      {...rest}
    >
      {(title || actions) && (
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title && (
              <h2 className="text-[length:var(--lm-text-h3)] font-semibold leading-tight text-[var(--lm-color-text-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[length:var(--lm-text-label)] text-[var(--lm-color-text-muted)]">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
});

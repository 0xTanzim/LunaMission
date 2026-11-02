import React from 'react';
import type { CockpitNavItem } from './cockpitNavConfig';

export interface CockpitNavLinkProps {
  item: CockpitNavItem;
  isActive: boolean;
  variant?: 'bar' | 'menu';
  onNavigate: (item: CockpitNavItem) => void;
}

const BAR_BASE =
  'group flex items-center gap-1.5 rounded-[var(--lm-radius-xs)] border px-2.5 min-h-[32px] text-xs font-medium font-mono transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]';

/** Active destination: filled cyan. Inactive: no fill, quiet border on hover. */
const BAR_ACTIVE =
  'border-[var(--lm-color-info)] bg-[var(--lm-color-info)]/18 text-[var(--lm-color-text-primary)] font-semibold';
const BAR_IDLE =
  'border-transparent text-[var(--lm-color-text-secondary)] hover:border-[var(--lm-color-border)] hover:bg-[var(--lm-color-surface-raised)] hover:text-[var(--lm-color-text-primary)]';

const MENU_BASE =
  'flex w-full items-start gap-2.5 rounded-[var(--lm-radius-sm)] border px-3 py-2.5 min-h-[44px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]';

/**
 * One navigation destination.
 *
 * Rendered as a real link so the destination can be opened in a new tab, copied and
 * announced as a page change; plain clicks are intercepted to keep the SPA fast.
 */
export function CockpitNavLink({
  item,
  isActive,
  variant = 'bar',
  onNavigate,
}: CockpitNavLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle modified clicks so "open in new tab" keeps working.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(item);
  };

  if (variant === 'menu') {
    return (
      <a
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        data-testid={`nav-menu-${item.id}`}
        onClick={handleClick}
        className={`${MENU_BASE} ${
          isActive
            ? 'border-[var(--lm-color-info)] bg-[var(--lm-color-info)]/15'
            : 'border-transparent hover:bg-[var(--lm-color-surface-raised)]'
        }`}
      >
        <item.Icon className="mt-0.5 text-[var(--lm-color-info)]" />
        <span className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-[var(--lm-color-text-primary)]">
              {item.step}. {item.label}
            </span>
            {/* Same shortcut vocabulary as the desktop bar, so the hint never
                disappears just because the bar collapsed into a menu. */}
            <span
              aria-hidden="true"
              className="shrink-0 text-[11px] font-mono text-[var(--lm-color-text-muted)]"
            >
              [{item.shortcut.replace('Alt+', '⌥')}]
            </span>
          </span>
          <span className="text-[11px] leading-snug text-[var(--lm-color-text-muted)]">
            {item.description}
          </span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      data-testid={`nav-link-${item.id}`}
      data-nav-id={`header-nav-${item.id}`}
      title={`${item.description} (${item.shortcut})`}
      onClick={handleClick}
      className={`${BAR_BASE} ${isActive ? BAR_ACTIVE : BAR_IDLE}`}
    >
      <item.Icon className={isActive ? 'text-[var(--lm-color-info)]' : ''} />
      <span className="whitespace-nowrap">
        {item.step}. {item.label}
      </span>
      <span
        aria-hidden="true"
        className="hidden 2xl:inline text-[11px] font-mono text-[var(--lm-color-text-muted)]"
      >
        [{item.shortcut.replace('Alt+', '⌥')}]
      </span>
    </a>
  );
}

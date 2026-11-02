import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

export interface WorkspaceMenuItem {
  id: string;
  label: string;
  title?: string;
  testId?: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  /** `warning` marks a tool that creates a target rather than reading one. */
  tone?: 'default' | 'warning';
}

export interface WorkspaceOverflowMenuProps {
  items: readonly WorkspaceMenuItem[];
  label?: string;
  className?: string;
}

const ITEM_BASE =
  'flex w-full min-h-8 items-center gap-2 px-2 py-1 text-left text-xs font-medium rounded-[var(--lm-radius-xs)] transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]';

/**
 * The `⋯` overflow: workspace actions that are needed occasionally, kept out of the
 * primary row so the map is not competing with seven buttons for the same band of pixels.
 *
 * The items keep their full labels — a menu is where a label can afford to be a label, and
 * hiding them behind icons here would just move the guessing game.
 */
export function WorkspaceOverflowMenu({
  items,
  label = 'More workspace tools',
  className = '',
}: WorkspaceOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  if (items.length === 0) return null;

  // A collapsed item can be *active* — pinpoint mode is armed, a flyover is running. Without this
  // the operator sees a plain `⋯` and no evidence that clicking the map will do something unusual.
  const activeItems = items.filter((item) => item.pressed && !item.disabled);
  const activeLabel =
    activeItems.length > 0
      ? `${label} — active: ${activeItems.map((item) => item.label).join(', ')}`
      : label;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        data-testid="toolbar-overflow-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={activeLabel}
        title={activeLabel}
        className={`relative flex min-h-7 min-w-7 cursor-pointer items-center justify-center rounded-[var(--lm-radius-sm)] border px-1.5 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)] ${
          activeItems.length > 0
            ? 'border-[var(--lm-color-info)] bg-[var(--lm-color-info)]/18 text-[var(--lm-color-info)]'
            : 'border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-secondary)] hover:border-[var(--lm-color-border-strong)] hover:text-[var(--lm-color-text-primary)]'
        }`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        {activeItems.length > 0 && (
          <span
            data-testid="toolbar-overflow-active-dot"
            aria-hidden="true"
            className="motion-safe:animate-pulse absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--lm-color-info)]"
          />
        )}
      </button>

      <div
        id={panelId}
        role="menu"
        aria-label={label}
        hidden={!isOpen}
        className="absolute right-0 top-[calc(100%+0.375rem)] z-50 flex w-56 flex-col gap-0.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface)] p-1 shadow-[var(--lm-shadow-popover)]"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            data-testid={item.testId}
            aria-label={item.ariaLabel ?? item.label}
            aria-pressed={item.pressed}
            title={item.title}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect?.();
              setIsOpen(false);
              triggerRef.current?.focus();
            }}
            className={`${ITEM_BASE} ${
              item.disabled
                ? 'cursor-not-allowed border border-[var(--lm-color-border-subtle)] bg-transparent text-[var(--lm-color-text-disabled)]'
                : item.pressed
                  ? 'border border-[var(--lm-color-info)] bg-[var(--lm-color-info)]/18 font-semibold text-[var(--lm-color-text-primary)]'
                  : item.tone === 'warning'
                    ? 'border border-transparent text-[var(--lm-color-warning)] hover:bg-[var(--lm-color-warning)]/12'
                    : 'border border-transparent text-[var(--lm-color-text-secondary)] hover:bg-[var(--lm-color-surface-raised)] hover:text-[var(--lm-color-text-primary)]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

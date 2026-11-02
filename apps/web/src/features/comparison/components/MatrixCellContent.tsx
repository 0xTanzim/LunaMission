import type { MatrixActionId, MatrixCell } from '../model/comparisonMatrixSections';
import { Badge } from '@/shared/ui/Badge';
import { cx } from '@/shared/ui/cx';

export interface MatrixCellContentProps {
  cell: MatrixCell;
  onAction: (actionId: MatrixActionId, columnId: string) => void;
}

const EMPHASIS_CLASS: Record<'primary' | 'sun' | 'earth', string> = {
  primary: 'font-bold text-[var(--lm-color-text-primary)]',
  sun: 'font-bold text-[var(--lm-color-sun)]',
  earth: 'font-bold text-[var(--lm-color-earth)]',
};

const ACTION_CLASS =
  'inline-flex min-h-[24px] min-w-[24px] items-center justify-center rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-2 py-0.5 text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-text-secondary)] transition-colors hover:border-[var(--lm-color-info-border)] hover:text-[var(--lm-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]';

const ACTION_DISABLED_CLASS =
  'inline-flex min-h-[24px] items-center justify-center rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] px-2 py-0.5 text-[length:var(--lm-text-micro)] font-semibold text-[var(--lm-color-text-disabled)]';

/**
 * One matrix cell.
 *
 * An unavailable result is never printed as a number: it keeps the shared em dash, gains a
 * dashed rule so the gap is visible without colour, and carries its own reason for pointer,
 * keyboard and assistive-technology users alike.
 */
export function MatrixCellContent({ cell, onAction }: MatrixCellContentProps) {
  if (cell.kind === 'state') {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <Badge variant={cell.variant}>{cell.label}</Badge>
        {cell.unavailable && cell.unavailableReason ? (
          <span className="text-[length:var(--lm-text-micro)] leading-snug text-[var(--lm-color-text-muted)]">
            {cell.unavailableReason}
          </span>
        ) : null}
      </span>
    );
  }

  if (cell.kind === 'action') {
    const disabled = cell.disabledReason !== undefined;
    return (
      <button
        type="button"
        disabled={disabled}
        title={cell.disabledReason}
        onClick={() => onAction(cell.actionId, cell.columnId)}
        className={disabled ? ACTION_DISABLED_CLASS : ACTION_CLASS}
      >
        {cell.label}
      </button>
    );
  }

  if (cell.unavailable) {
    return (
      <span
        data-unavailable="true"
        title={cell.unavailableReason}
        className="inline-flex items-baseline gap-1 font-mono text-[var(--lm-color-text-muted)]"
      >
        <span aria-hidden="true" className="border-b border-dashed border-[var(--lm-color-border-strong)]">
          {cell.text}
        </span>
        <span className="sr-only">Unavailable: {cell.unavailableReason}</span>
      </span>
    );
  }

  return (
    <span className={cx('font-mono-num', cell.emphasis && EMPHASIS_CLASS[cell.emphasis])}>
      {cell.text}
      {cell.unit ? (
        <span className="ml-0.5 text-[length:var(--lm-text-micro)] font-normal text-[var(--lm-color-text-muted)]">
          {cell.unit}
        </span>
      ) : null}
    </span>
  );
}

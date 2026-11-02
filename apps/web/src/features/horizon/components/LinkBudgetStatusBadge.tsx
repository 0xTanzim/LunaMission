import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { RfLinkBudget } from '@luna/contracts';
import type { LinkBudgetStatus } from './LinkBudgetMetricsGrid';

export interface LinkBudgetStatusBadgeProps {
  readonly status: LinkBudgetStatus;
  readonly linkState: RfLinkBudget['linkState'];
  readonly linkMarginDb: RfLinkBudget['linkMarginDb'];
}

/**
 * Reports the *modelled* margin class only. A computed margin is not an observed carrier lock,
 * and an unavailable budget is reported as "not computed" rather than defaulting to a pass or
 * a fail. "LOS" is never used here: it would read as line-of-sight, which is a different
 * observable (see LinkBudgetObservableNote).
 */
export function LinkBudgetStatusBadge({ status, linkState, linkMarginDb }: LinkBudgetStatusBadgeProps) {
  if (status !== 'computed') {
    return (
      <span className="text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1.5 border bg-[var(--lm-color-surface-strong)]/60 text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border-strong)]">
        <AlertCircle className="w-3 h-3" />
        {status === 'pending' ? 'RF Margin Pending' : 'RF Margin Not Computed'}
      </span>
    );
  }

  const margin = linkMarginDb !== null && Number.isFinite(linkMarginDb) ? linkMarginDb : null;
  const isNominal = linkState === 'nominal' || linkState === 'locked' || (margin !== null && margin >= 3.0);
  const isMarginal = margin !== null && margin >= 0.0;
  const tone = isNominal
    ? 'bg-[var(--lm-color-success)]/20 text-[var(--lm-color-success)] border-[var(--lm-color-success)]/40'
    : isMarginal
      ? 'bg-[var(--lm-color-warning)]/20 text-[var(--lm-color-warning)] border-[var(--lm-color-warning)]/40'
      : 'bg-[var(--lm-color-danger)]/20 text-[var(--lm-color-danger)] border-[var(--lm-color-danger)]/40';
  const label = isNominal
    ? 'Modelled Margin Nominal'
    : isMarginal
      ? 'Modelled Margin Marginal'
      : 'No Modelled Link Margin';

  return (
    <span
      className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1.5 border ${tone}`}
    >
      {isNominal ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

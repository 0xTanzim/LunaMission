import React from 'react';
import type { RfLinkBudget } from '@luna/contracts';

export type LinkBudgetStatus = 'pending' | 'computed' | 'unavailable';

export interface LinkBudgetMetricsGridProps {
  readonly budget: Pick<
    RfLinkBudget,
    'fsplDb' | 'receivedPowerDbm' | 'eirpDbw' | 'linkMarginDb' | 'requiredEbN0Db'
  >;
  readonly status: LinkBudgetStatus;
  readonly earthDistanceKm: number;
}

const TILE =
  'p-2.5 rounded bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)]';
const CAPTION = 'text-[11px] text-[var(--lm-color-text-muted)]';

/**
 * The four RF metric tiles. Nothing is rendered as a modelled number unless the analysis API
 * actually returned a computed budget: an offline placeholder value is never displayed as an
 * RF estimate (no fabricated margins).
 */
export function LinkBudgetMetricsGrid({ budget, status, earthDistanceKm }: LinkBudgetMetricsGridProps) {
  const computed = status === 'computed';
  const margin = budget.linkMarginDb;
  const marginText =
    computed && margin !== null && Number.isFinite(margin)
      ? `+${margin} dB`
      : computed
        ? 'Not modelled'
        : 'Not computed';
  const marginTone = !computed
    ? 'text-[var(--lm-color-text-muted)]'
    : (margin ?? -99) >= 3.0
      ? 'text-[var(--lm-color-success)]'
      : (margin ?? -99) >= 0.0
        ? 'text-[var(--lm-color-warning)]'
        : 'text-[var(--lm-color-danger)]';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
      <div className={TILE}>
        <div className={CAPTION}>Carrier &amp; Band</div>
        <div className="font-semibold text-[var(--lm-color-info)]">X-Band (8.45 GHz)</div>
        <div className={`${CAPTION} mt-0.5`}>2.0 Mbps Telemetry</div>
      </div>

      <div className={TILE}>
        <div className={CAPTION}>Path Loss (FSPL, modelled)</div>
        <div className="font-semibold text-[var(--lm-color-text-primary)]">
          {computed ? `${budget.fsplDb} dB` : 'Not computed'}
        </div>
        <div className={`${CAPTION} mt-0.5`}>
          Dist: {Math.round(earthDistanceKm).toLocaleString()} km
        </div>
      </div>

      <div className={TILE}>
        <div className={CAPTION}>Received Power (modelled)</div>
        <div className="font-semibold text-[var(--lm-color-text-primary)]">
          {computed
            ? Number.isFinite(budget.receivedPowerDbm)
              ? `${budget.receivedPowerDbm} dBm`
              : 'None (no modelled power)'
            : 'Not computed'}
        </div>
        <div className={`${CAPTION} mt-0.5`}>
          {computed ? `EIRP: ${budget.eirpDbw} dBW` : 'EIRP: not computed'}
        </div>
      </div>

      <div className={TILE}>
        <div className={CAPTION}>Modelled RF Link Margin</div>
        <div className={`font-bold ${marginTone}`}>{marginText}</div>
        <div className={`${CAPTION} mt-0.5`}>Req: +{budget.requiredEbN0Db} dB Eb/N0</div>
      </div>
    </div>
  );
}

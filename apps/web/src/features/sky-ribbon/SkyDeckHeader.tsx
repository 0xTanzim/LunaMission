import React from 'react';
import type { SolarDiskModel } from './skyRibbonDisk';

export interface SkyDeckHeaderProps {
  siteName: string;
  windowLabel: string | null;
  reducedMotion: boolean;
  statusLabel: string;
  diskSupport: SolarDiskModel['kind'];
}

const DISK_SUPPORT_LABEL: Record<SolarDiskModel['kind'], string> = {
  boundary: 'disk: boundary geometry',
  'limb-only': 'disk: limbs only',
  unsupported: 'disk: unsupported',
};

/** Flight-deck header: identity, scale policy, apparent-disk support, active window, motion. */
export const SkyDeckHeader: React.FC<SkyDeckHeaderProps> = ({
  siteName,
  windowLabel,
  reducedMotion,
  statusLabel,
  diskSupport,
}) => (
  <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] px-3 py-2">
    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
      <h2 className="text-[length:var(--lm-text-h3)] font-semibold tracking-tight text-[var(--lm-color-text-primary)]">
        Dual-panel sky-ribbon
      </h2>
      <span className="font-mono text-[length:var(--lm-text-micro)] uppercase tracking-wider text-[var(--lm-color-text-muted)]">
        Linear axes · no scale break
      </span>
      <span
        data-testid="sky-ribbon-deck-status"
        className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-1.5 py-0.5 font-mono text-[length:var(--lm-text-micro)] uppercase text-[var(--lm-color-text-secondary)]"
      >
        {statusLabel}
      </span>
      <span
        data-testid="sky-ribbon-deck-disk"
        data-disk-support={diskSupport}
        className="rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border)] bg-[var(--lm-color-surface-raised)] px-1.5 py-0.5 font-mono text-[length:var(--lm-text-micro)] text-[var(--lm-color-text-muted)]"
      >
        {DISK_SUPPORT_LABEL[diskSupport]}
      </span>
    </div>
    <div className="flex min-w-0 flex-wrap items-baseline gap-3 font-mono text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-muted)]">
      <span className="truncate">{siteName}</span>
      <span>{windowLabel ?? 'no active sub-interval'}</span>
      <span data-testid="sky-ribbon-deck-motion">
        Motion: {reducedMotion ? 'reduced' : 'standard'}
      </span>
    </div>
  </header>
);

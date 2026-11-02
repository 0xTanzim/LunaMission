import React from 'react';

/**
 * Observable-separation note for the DSN / RF link card.
 *
 * The governing invariant is "geometric Earth visibility is not an RF link budget": this card
 * reports a *model* of the radio link for a stated transmitter, band and data rate. Terrain
 * clearance of the Earth direction is a different observable and does not establish link
 * closure on its own, so the two are named separately here.
 */
export function LinkBudgetObservableNote() {
  return (
    <p className="text-[11px] font-mono leading-relaxed text-[var(--lm-color-text-muted)]">
      Computed <span className="text-[var(--lm-color-text-secondary)]">RF estimate</span> for the
      stated transmitter power, carrier band and data rate: every figure below is modelled from
      those inputs, not measured. Earth{' '}
      <span className="text-[var(--lm-color-text-secondary)]">geometric line-of-sight</span>{' '}
      (terrain clearance of the Earth direction) is a separate observable reported in the Sun /
      Earth clearance telemetry — clear geometry is not an RF link budget, and a clear path does
      not by itself establish link closure.
    </p>
  );
}

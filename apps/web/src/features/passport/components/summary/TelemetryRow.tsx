import React, { type ReactNode } from 'react';

/** One label/value line in a telemetry readout list (popovers, cards, tables). */
export function TelemetryRow({
  label,
  className,
  divider,
  children,
}: {
  label: string;
  className: string;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex justify-between${
        divider ? ' pt-1 border-t border-[var(--lm-color-border-subtle)]' : ''
      }`}
    >
      <span className="text-[var(--lm-color-text-muted)]">{label}</span>
      <span className={className}>{children}</span>
    </div>
  );
}

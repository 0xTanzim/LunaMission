import React from 'react';

interface SkyRibbonTelemetryProps {
  azimuthDeg: number | null;
  elevationDeg: number | null;
  horizonDeg: number | null;
  sunElevationDeg?: number;
  earthElevationDeg?: number;
  blockingRidgeName?: string;
  className?: string;
}

export const SkyRibbonTelemetry: React.FC<SkyRibbonTelemetryProps> = ({
  azimuthDeg,
  elevationDeg,
  horizonDeg,
  sunElevationDeg,
  earthElevationDeg,
  blockingRidgeName,
  className = '',
}) => {
  if (azimuthDeg === null && elevationDeg === null) return null;

  const clearance =
    sunElevationDeg !== undefined && horizonDeg !== null
      ? sunElevationDeg - horizonDeg
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute bottom-3 left-3 bg-[var(--lm-color-canvas)]/90 border border-[var(--lm-color-border)]/80 p-2.5 rounded-lg text-[var(--lm-color-text-secondary)] font-mono text-[11px] shadow-lg backdrop-blur pointer-events-none z-10 ${className}`}
    >
      <div className="flex items-center gap-3 font-semibold border-b border-[var(--lm-color-border-subtle)] pb-1 mb-1.5">
        <span className="text-[var(--lm-color-info)]">AZ: {azimuthDeg !== null ? azimuthDeg.toFixed(2) : '--'}° East</span>
        <span className="text-[var(--lm-color-warning)]">EL: {elevationDeg !== null ? (elevationDeg >= 0 ? `+${elevationDeg.toFixed(2)}` : elevationDeg.toFixed(2)) : '--'}°</span>
        {horizonDeg !== null && (
          <span className="text-[var(--lm-color-text-muted)]">SKYLINE: +{horizonDeg.toFixed(2)}°</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-[var(--lm-color-text-muted)]">
        {sunElevationDeg !== undefined && (
          <div>Sun El: <span className="text-[var(--lm-color-warning)]">+{sunElevationDeg.toFixed(2)}°</span></div>
        )}
        {earthElevationDeg !== undefined && (
          <div>Earth El: <span className="text-[var(--lm-color-success)]">+{earthElevationDeg.toFixed(2)}°</span></div>
        )}
        {clearance !== null && (
          <div className="col-span-2">
            Clearance (sun centre vs skyline): <span className={clearance >= 0 ? 'text-[var(--lm-color-success)] font-bold' : 'text-[var(--lm-color-danger)] font-bold'}>
              {clearance >= 0 ? `+${clearance.toFixed(2)}° [CENTRE CLEAR]` : `${clearance.toFixed(2)}° [CENTRE BLOCKED]`}
            </span>
          </div>
        )}
        {blockingRidgeName && (
          <div className="col-span-2 text-[var(--lm-color-danger)] truncate">
            Obstacle: {blockingRidgeName}
          </div>
        )}
      </div>
      <div className="text-[11px] text-[var(--lm-color-text-muted)] mt-1 italic border-t border-[var(--lm-color-border-subtle)]/60 pt-0.5">
        Scale Break: Grazing band [-3°, +5°] magnified 6x (24 px/° vs 4 px/°)
      </div>
    </div>
  );
};

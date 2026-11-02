import React from 'react';
import { NASA_SVS_COLOR_STOPS, NASA_SVS_LEGEND_TICKS } from '../../../../domain/terrain/nasaSvsColorRamp';

export interface NasaSvsElevationLegendProps {
  readonly isVisible?: boolean;
  readonly className?: string;
}

/**
 * Generates the CSS linear-gradient string matching the official 16-stop LOLA palette.
 * Direction: bottom-to-top (deep purple at bottom, magenta/pink at top).
 */
export function getNasaSvsElevationLegendGradient(): string {
  const stops = NASA_SVS_COLOR_STOPS;
  const gradientStops = stops.map((s, index) => {
    const pct = ((index / (stops.length - 1)) * 100).toFixed(1);
    return `${s.hex} ${pct}%`;
  });
  return `linear-gradient(to top, ${gradientStops.join(', ')})`;
}

/**
 * Docked NASA SVS 3727 LOLA Elevation Scale Bar (-8 km to +8 km).
 * Strictly complies with the NASA Scientific Visualization Studio hypsometric standard.
 */
export function NasaSvsElevationLegend({
  isVisible = true,
  className = '',
}: NasaSvsElevationLegendProps) {
  if (!isVisible) return null;

  const gradient = getNasaSvsElevationLegendGradient();

  return (
    <aside
      aria-label="NASA SVS 3727 LOLA Elevation Scale Bar"
      className={`absolute right-4 top-20 z-20 pointer-events-auto bg-[var(--lm-color-canvas)]/85 backdrop-blur-md border border-[var(--lm-color-info)]/30 rounded-lg p-3 shadow-2xl shadow-[var(--lm-color-canvas)]/80 font-mono text-xs select-none transition-all duration-300 w-48 ${className}`}
    >
      <header className="flex items-center justify-between pb-2 border-b border-[var(--lm-color-info)]/20 mb-2">
        <div>
          <h2 className="text-[11px] font-bold tracking-wider text-[var(--lm-color-info)] uppercase">
            NASA SVS 3727
          </h2>
          <p className="text-[11px] text-[var(--lm-color-text-muted)] tracking-tight">
            LOLA Lunar Hypsometry
          </p>
        </div>
        <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-[var(--lm-color-info-surface-strong)] border border-[var(--lm-color-info)]/40 text-[var(--lm-color-info)] rounded">
          128 PPD
        </span>
      </header>

      <div className="flex items-stretch gap-3 h-48 py-1">
        {/* Continuous 16-stop Hypsometric Gradient Bar */}
        <div
          className="w-4 rounded-sm border border-[var(--lm-color-border)]/80 shadow-inner flex-shrink-0"
          style={{ background: gradient }}
        />

        {/* Elevation Tick Labels (-8 km to +8 km) */}
        <div className="flex flex-col justify-between text-[11px] leading-none text-[var(--lm-color-text-secondary)] flex-1">
          {NASA_SVS_LEGEND_TICKS.slice()
            .reverse()
            .map((tick) => {
              const isDatum = tick.km === 0;
              return (
                <div
                  key={tick.km}
                  className={`flex items-center justify-between gap-1 ${
                    isDatum ? 'text-[var(--lm-color-success)] font-bold' : ''
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span
                      className={`inline-block h-[1px] w-2 ${
                        isDatum ? 'bg-[var(--lm-color-success)]' : 'bg-[var(--lm-color-border-strong)]'
                      }`}
                    />
                    <span>{tick.label}</span>
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: tick.hex }}
                  />
                </div>
              );
            })}
        </div>
      </div>

      <footer className="mt-2 pt-1.5 border-t border-[var(--lm-color-border-subtle)] text-[11px] text-[var(--lm-color-text-muted)] flex justify-between">
        <span>IAU 2000 ME (Datum R₀=1737.4 km)</span>
        <span className="text-[var(--lm-color-info)]">LRO LOLA • NASA GSFC</span>
      </footer>
    </aside>
  );
}

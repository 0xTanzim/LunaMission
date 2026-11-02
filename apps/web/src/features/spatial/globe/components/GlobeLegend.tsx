import React, { useState } from 'react';
import { PSR_PROVENANCE_NOTE } from '../scene/globePsrOverlay';

export interface GlobeLegendProps {
  earthElevationDisplay: string;
  isCompact: boolean;
  showLaserTracks?: boolean;
  showGrid?: boolean;
  showVectors?: boolean;
  /** Whether the modeled PSR overlay is on — controls the provenance chip. */
  showPsr?: boolean;
}

export function GlobeLegend({
  earthElevationDisplay,
  isCompact,
  showLaserTracks = true,
  showGrid = true,
  showVectors = true,
  showPsr = true,
}: GlobeLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      role="region"
      aria-label="3D Lunar Globe Visual Legend and Geodetic Datum"
      className={`absolute ${isCompact ? 'bottom-3' : 'bottom-14'} left-3 right-3 z-20 flex flex-col items-end pointer-events-none select-none gap-2`}
    >
      {/* Expanded Detailed Primitives Drawer */}
      {isExpanded && (
        <div
          id="globe-legend-details"
          className="pointer-events-auto w-full max-w-4xl bg-[var(--lm-color-surface)]/95 backdrop-blur-md border border-[var(--lm-color-border)] rounded-[var(--lm-radius-md)] p-3 shadow-2xl text-[11px] font-mono text-[var(--lm-color-text)] flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-[var(--lm-color-border)] pb-1.5">
            <span className="font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>IAU MOON_ME Reference Datum</span>
              <span className="text-[11px] text-[var(--lm-color-text-muted)] font-normal">
                (R = 1,737,400.0 m, f = 0.0, East-positive [0°, 360°))
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="cursor-pointer text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text)] p-0.5"
              aria-label="Close detailed legend"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Group 1: Landing Sites & Targets */}
            <div className="flex flex-col gap-1.5 bg-[var(--lm-color-canvas)]/40 p-2 rounded border border-[var(--lm-color-border-subtle)]">
              <span className="font-semibold text-cyan-300 uppercase tracking-wide">1. Landing Sites & Targets</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400 bg-cyan-400/20 inline-block" />
                <span>Selected Site (19.2 km stalk, z₀ [m])</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-purple-400 bg-purple-400/20 inline-block" />
                <span>Compared Site (Pairwise delta)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                <span>Catalog Sites (20 benchmarks)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                <span>Custom Target (Pulsating ray)</span>
              </div>
            </div>

            {/* Group 2: Terrain & Landmarks */}
            <div className="flex flex-col gap-1.5 bg-[var(--lm-color-canvas)]/40 p-2 rounded border border-[var(--lm-color-border-subtle)]">
              <span className="font-semibold text-slate-300 uppercase tracking-wide">2. LOLA Topography & Rims</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-400 inline-block" />
                <span>Crater Rim Loops (+0.8 km, dia ≥ 15 km)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-slate-500 rounded-xs inline-block" />
                <span>Malapert Massif (+4,689 m crest)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 text-cyan-400 font-bold leading-none inline-flex items-center justify-center">✛</span>
                <span>Candidate Datum Benchmark (+0.6 m)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 bg-gradient-to-r from-purple-800 via-teal-500 to-amber-200 rounded-xs inline-block" />
                <span>SVS 3727 Hypsometry (-9 to +5.5 km)</span>
              </div>
              {showPsr && (
                <div className="flex items-start gap-1.5">
                  <span
                    className="w-3 h-3 rounded-xs inline-block shrink-0 mt-px"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, #111c29 0 2px, transparent 2px 6px)',
                      backgroundColor: 'rgba(17, 28, 41, 0.35)',
                    }}
                    aria-hidden="true"
                  />
                  <span>Permanently Shadowed Region (modeled footprint) — {PSR_PROVENANCE_NOTE}</span>
                </div>
              )}
            </div>

            {/* Group 3: Graticule & Operations */}
            <div className="flex flex-col gap-1.5 bg-[var(--lm-color-canvas)]/40 p-2 rounded border border-[var(--lm-color-border-subtle)]">
              <span className="font-semibold text-teal-300 uppercase tracking-wide">3. Footprint & Graticule</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-b border-dashed border-teal-400 inline-block" />
                <span>83°S Footprint Ring (+13.9 km lift)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 text-teal-400 font-bold leading-none inline-flex items-center justify-center">+</span>
                <span>South Pole 90°S Reticle (+17.4 km)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#334b6b] inline-block" />
                <span>Graticule (0°/-30°/-60°/-75°)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#8ccbff] inline-block" />
                <span>Prime Meridian 0°E (Mean Earth)</span>
              </div>
            </div>

            {/* Group 4: Celestial Ephemeris */}
            <div className="flex flex-col gap-1.5 bg-[var(--lm-color-canvas)]/40 p-2 rounded border border-[var(--lm-color-border-subtle)]">
              <span className="font-semibold text-amber-300 uppercase tracking-wide">4. Celestial Vectors</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--lm-color-sun)] inline-block" />
                <span>Sun Vector (Obliquity ≤ 1.5424°)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--lm-color-earth)] inline-block" />
                <span>Earth Sightline (LoS &gt; 0°, {earthElevationDisplay})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-b border-dashed border-amber-400 inline-block" />
                <span>Earth Blocked (El ≤ θ_mask)</span>
              </div>
              {showLaserTracks && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-gradient-to-r from-teal-400 to-indigo-400 inline-block" />
                  <span>LOLA Laser Tracks (36 passes)</span>
                </div>
              )}
            </div>
          </div>

          {/* Provenance & Sensitivity Footer */}
          <div className="border-t border-[var(--lm-color-border)] pt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--lm-color-text-muted)]">
            <span>Units: Distance [m, km] • Angles [deg °, arcsec ″] • Rate [deg/h]</span>
            <span className="text-amber-400 font-medium">LOLA DEM Sensitivity Envelopes: [θ_low, θ_nom, θ_high] (±0.5 m to ±1.2 m RMS)</span>
            <span>Data: NASA GSFC PGDA Product 78/90 • LRO LOLA/LROC • JPL Horizons coord@301</span>
          </div>
        </div>
      )}

      {/* Compact Status Bar (Always Visible) */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 bg-[var(--lm-color-surface)]/90 backdrop-blur-sm px-3 py-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] text-[11px] font-mono text-[var(--lm-color-text-muted)] shadow-md w-full">
        <div className="flex items-center gap-3">
          {showVectors && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--lm-color-sun)] inline-block" />
                <span>Sun Vector</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--lm-color-earth)] inline-block" />
                <span>Earth ({earthElevationDisplay})</span>
              </span>
            </>
          )}
          {showGrid && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-teal-400 inline-block" />
              <span>83°S Footprint</span>
            </span>
          )}
          {showPsr && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-2 rounded-xs inline-block"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #111c29 0 2px, transparent 2px 6px)',
                  backgroundColor: 'rgba(17, 28, 41, 0.35)',
                }}
                aria-hidden="true"
              />
              <span>PSR (modeled footprint)</span>
            </span>
          )}
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-cyan-400/90">
            [IAU MOON_ME]
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls="globe-legend-details"
          className="cursor-pointer text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-cyan-400 rounded px-1.5 py-0.5"
        >
          <span>{isExpanded ? 'Hide Legend Details ▲' : 'All Primitives & Datum ▼'}</span>
        </button>
      </div>
    </div>
  );
}

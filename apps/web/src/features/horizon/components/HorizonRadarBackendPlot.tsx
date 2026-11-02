import React, { useMemo } from 'react';
import type { HorizonBlocker, HorizonProfileResponse } from '@luna/contracts';
import { HorizonBlockerCard } from './HorizonBlockerCard';

/**
 * Backend-driven horizon radar (task 4.3): renders the 360×1° terrain profile
 * exclusively from the POST /api/v1/horizons response — per-bin silhouette,
 * dashed incomplete bins, cardinal axes, mast + provenance chip, and an
 * accessible mirror table (AGENTS.md §7.2). Zero frontend terrain math.
 */

const VIEW_W = 840;
const VIEW_H = 320;
const PAD_X = 40;
const PAD_Y = 30;
const PLOT_W = VIEW_W - 2 * PAD_X;
const PLOT_H = VIEW_H - 2 * PAD_Y;
const MIN_ELEV = -5;
const MAX_ELEV = 35;

function toSvgX(azimuthDeg: number): number {
  return PAD_X + (azimuthDeg / 360) * PLOT_W;
}
function toSvgY(elevationDeg: number): number {
  const clamped = Math.max(MIN_ELEV, Math.min(MAX_ELEV, elevationDeg));
  return PAD_Y + (1 - (clamped - MIN_ELEV) / (MAX_ELEV - MIN_ELEV)) * PLOT_H;
}

export interface HorizonRadarBackendPlotProps {
  profile: HorizonProfileResponse;
}

export function HorizonRadarBackendPlot({ profile }: HorizonRadarBackendPlotProps) {
  const { bins, mastHeightMeters, stepDeg, provenance } = profile;

  const validPath = useMemo(() => {
    const points = bins
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.binStatus === 'valid')
      .map(({ b }) => `${toSvgX(b.azimuthDeg).toFixed(1)},${toSvgY(b.maskElevationDeg).toFixed(1)}`);
    if (!points.length) return '';
    const bottom = toSvgY(MIN_ELEV);
    return `M ${PAD_X},${bottom} L ${points.join(' L ')} L ${toSvgX(360)},${bottom} Z`;
  }, [bins]);

  // Dashed segments over incomplete/truncated bins so gaps are visible, not silently bridged.
  const incompleteSegments = useMemo(() => {
    return bins
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.binStatus !== 'valid');
  }, [bins]);
  const hasIncomplete = incompleteSegments.length > 0;

  const topBlocker = useMemo(
    () => bins.reduce((a, b) => (b.maskElevationDeg > a.maskElevationDeg ? b : a), bins[0]!),
    [bins],
  );
  // Only highlight genuinely blocking ridges (mask at/above the local reference floor).
  const blockers = useMemo(
    () => [...bins].filter((b) => b.maskElevationDeg > -1.5).sort((a, b) => b.maskElevationDeg - a.maskElevationDeg).slice(0, 5),
    [bins],
  );

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full relative aspect-[21/9] sm:aspect-[24/9] min-h-[300px] bg-[var(--lm-color-canvas)] rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] overflow-hidden">
        <div className="absolute top-2 left-3 z-10 flex items-center gap-2 flex-wrap">
          <span
            data-testid="horizon-provenance-chip"
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lm-color-info-surface)] text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/30"
          >
            Backend LOLA Curated Horizon • {provenance.dataset} • {mastHeightMeters} m mast • {stepDeg}° bins
          </span>
          {hasIncomplete && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lm-color-warning)]/10 text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)]/30">
              incomplete bins dashed
            </span>
          )}
        </div>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-full"
          role="img"
          aria-label={`Backend LOLA curated horizon profile, ${bins.length} bins at ${mastHeightMeters} m mast. Highest blocking ridge at azimuth ${topBlocker.azimuthDeg} degrees, mask elevation ${topBlocker.maskElevationDeg.toFixed(2)} degrees.`}
        >
          {/* Elevation grid */}
          {[-5, 0, 10, 20, 30].map((elev) => {
            const y = toSvgY(elev);
            return (
              <g key={elev}>
                <line
                  x1={PAD_X} y1={y} x2={PAD_X + PLOT_W} y2={y}
                  stroke={elev === 0 ? '#38bdf8' : '#1e293b'}
                  strokeWidth={elev === 0 ? '1.5' : '1'}
                  strokeDasharray={elev === 0 ? undefined : '2 3'}
                />
                <text x={PAD_X - 8} y={y + 3} textAnchor="end" className="text-[11px] font-mono fill-[var(--lm-color-text-muted)]">
                  {elev > 0 ? `+${elev}°` : `${elev}°`}
                </text>
              </g>
            );
          })}

          {/* Cardinal azimuth axes */}
          {[
            { deg: 0, label: 'N' }, { deg: 90, label: 'E' }, { deg: 180, label: 'S' }, { deg: 270, label: 'W' },
          ].map((col) => (
            <g key={col.deg}>
              <line x1={toSvgX(col.deg)} y1={PAD_Y} x2={toSvgX(col.deg)} y2={PAD_Y + PLOT_H} stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
              <text x={toSvgX(col.deg)} y={PAD_Y + PLOT_H + 16} textAnchor="middle" className="text-[11px] font-mono fill-[var(--lm-color-text-muted)]">
                {col.deg}° ({col.label})
              </text>
            </g>
          ))}

          {/* Per-bin valid terrain silhouette */}
          <path d={validPath} fill="rgba(30, 41, 59, 0.85)" stroke="#64748b" strokeWidth="2" />

          {/* Dashed incomplete bins */}
          {incompleteSegments.map(({ b }) => (
            <line
              key={`inc-${b.azimuthDeg}`}
              x1={toSvgX(b.azimuthDeg)} y1={toSvgY(b.maskElevationDeg)}
              x2={toSvgX(b.azimuthDeg + stepDeg)} y2={toSvgY(b.maskElevationDeg)}
              stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3"
            />
          ))}

          {/* Highest blocker marker */}
          <g>
            <line
              x1={toSvgX(topBlocker.azimuthDeg)} y1={toSvgY(topBlocker.maskElevationDeg)}
              x2={toSvgX(topBlocker.azimuthDeg)} y2={PAD_Y + PLOT_H}
              stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 4" opacity="0.6"
            />
            <circle cx={toSvgX(topBlocker.azimuthDeg)} cy={toSvgY(topBlocker.maskElevationDeg)} r="4" fill="#f43f5e" />
          </g>
        </svg>
      </div>

      {/* Blocker card + polar inset */}
      <div className="flex flex-wrap items-start gap-3">
        <HorizonBlockerCard bin={topBlocker} stepDeg={stepDeg} mastHeightMeters={mastHeightMeters} />
        <HorizonPolarInset blockers={blockers} topBlocker={topBlocker} />
      </div>

      {/* Accessible mirror: blocking sectors as a real table (WCAG 2.1 AA, AGENTS §7.2) */}
      <table className="sr-only">
        <caption>Blocking terrain sectors from the backend curated horizon profile</caption>
        <thead>
          <tr><th scope="col">Azimuth sector</th><th scope="col">Mask elevation (deg)</th><th scope="col">Ridge distance (km)</th><th scope="col">Status</th></tr>
        </thead>
        <tbody>
          {blockers.map((b) => (
            <tr key={b.azimuthDeg}>
              <td>{b.azimuthDeg}°–{b.azimuthDeg + stepDeg}°</td>
              <td>{b.maskElevationDeg.toFixed(2)}°</td>
              <td>{b.ridgeDistanceKm.toFixed(1)} km</td>
              <td>{b.binStatus === 'valid' ? 'valid' : 'incomplete'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div role="region" aria-label="Horizon radar data summary" className="sr-only">
        Horizon profile served by the backend from {provenance.dataset}; {hasIncomplete ? 'some bins are incomplete and drawn dashed' : 'all bins valid'}.
      </div>
    </div>
  );
}

/** Small circular polar inset: N/E/S/W ring with the top blocker and runner-ups marked. */
export function HorizonPolarInset({ blockers, topBlocker }: {
  blockers: HorizonBlocker[];
  topBlocker: HorizonBlocker;
}) {
  const R = 52;
  const C = 64;
  const polar = (azDeg: number) => {
    // Compass convention: 0°N up, 90°E right.
    const rad = ((azDeg - 90) * Math.PI) / 180;
    return { x: C + R * 0.85 * Math.cos(rad), y: C + R * 0.85 * Math.sin(rad) };
  };
  const top = polar(topBlocker.azimuthDeg);
  return (
    <svg width={128} height={128} role="img" aria-label="Polar inset: blocking ridge azimuths around the compass rose" className="shrink-0">
      <circle cx={C} cy={C} r={R} fill="rgba(30,41,59,0.6)" stroke="#334155" />
      {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([label, deg]) => {
        const p = polar(deg as number);
        return (
          <g key={label as string}>
            <line x1={C} y1={C} x2={p.x} y2={p.y} stroke="#1e293b" strokeWidth="1" />
            <text x={C + (R + 8) * Math.cos(((deg as number) - 90) * Math.PI / 180)} y={C + (R + 8) * Math.sin(((deg as number) - 90) * Math.PI / 180) + 3} textAnchor="middle" className="text-[length:var(--lm-text-micro)] font-mono fill-[var(--lm-color-text-muted)]">{label}</text>
          </g>
        );
      })}
      {blockers.filter((b) => b !== topBlocker).map((b) => {
        const p = polar(b.azimuthDeg);
        return <circle key={`pb-${b.azimuthDeg}`} cx={p.x} cy={p.y} r="2.5" fill="#94a3b8" />;
      })}
      <circle cx={top.x} cy={top.y} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

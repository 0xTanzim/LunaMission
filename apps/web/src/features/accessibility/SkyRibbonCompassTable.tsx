import React from 'react';
import type { EvaluatedSubInterval } from '@luna/contracts';
import type { HorizonProfileBin } from '../sky-ribbon/skyRibbonRenderer';

interface SkyRibbonCompassTableProps {
  siteName: string;
  intervals: EvaluatedSubInterval[];
  horizonProfile?: HorizonProfileBin[];
  className?: string;
}

const COMPASS_OCTANTS = [
  { code: 'N', name: 'North', minAz: 337.5, maxAz: 22.5, range: '337.5° – 022.5°' },
  { code: 'NE', name: 'Northeast', minAz: 22.5, maxAz: 67.5, range: '022.5° – 067.5°' },
  { code: 'E', name: 'East', minAz: 67.5, maxAz: 112.5, range: '067.5° – 112.5°' },
  { code: 'SE', name: 'Southeast', minAz: 112.5, maxAz: 157.5, range: '112.5° – 157.5°' },
  { code: 'S', name: 'South', minAz: 157.5, maxAz: 202.5, range: '157.5° – 202.5°' },
  { code: 'SW', name: 'Southwest', minAz: 202.5, maxAz: 247.5, range: '202.5° – 247.5°' },
  { code: 'W', name: 'West', minAz: 247.5, maxAz: 292.5, range: '247.5° – 292.5°' },
  { code: 'NW', name: 'Northwest', minAz: 292.5, maxAz: 337.5, range: '292.5° – 337.5°' },
];

function isAzimuthInOctant(az: number, minAz: number, maxAz: number): boolean {
  if (minAz > maxAz) return az >= minAz || az < maxAz;
  return az >= minAz && az < maxAz;
}

export const SkyRibbonCompassTable: React.FC<SkyRibbonCompassTableProps> = ({
  siteName,
  intervals,
  horizonProfile,
  className = '',
}) => {
  const summaries = COMPASS_OCTANTS.map((oct) => {
    let maxH = -3.0;
    let minH = 25.0;
    const landmarks = new Set<string>();
    let hasSunShadow = false;
    let hasEarthBlock = false;
    let hasEarthVisible = false;

    // 1. Derive obstacle elevations directly from LOLA horizon profile bins if available
    if (horizonProfile && horizonProfile.length > 0) {
      for (const bin of horizonProfile) {
        if (isAzimuthInOctant(bin.azimuthDeg, oct.minAz, oct.maxAz)) {
          const elev = bin.thetaNomDeg ?? (bin as any).elevationDeg;
          if (typeof elev === "number" && !isNaN(elev)) {
            maxH = Math.max(maxH, elev);
            minH = Math.min(minH, elev);
          }
        }
      }
    }

    // 2. Synthesize interval telemetry for solar/Earth access and blockers
    for (const int of intervals) {
      if (isAzimuthInOctant(int.sun.meanAzimuthDeg, oct.minAz, oct.maxAz)) {
        if (!horizonProfile || horizonProfile.length === 0) {
          maxH = Math.max(maxH, int.sun.meanHorizonMaskDeg);
          minH = Math.min(minH, int.sun.meanHorizonMaskDeg);
        }
        if (int.sun.status === 'terrain_shadow') hasSunShadow = true;
        if (int.sun.blocker?.featureName) landmarks.add(int.sun.blocker.featureName);
      }
      if (isAzimuthInOctant(int.earth.meanAzimuthDeg, oct.minAz, oct.maxAz)) {
        if (int.earth.status === 'terrain_blocked' || int.earth.status === 'earth_occluded') hasEarthBlock = true;
        if (int.earth.status === 'visible' || int.earth.status === 'earth_direct') hasEarthVisible = true;
      }
    }

    const solarRisk: 'HIGH' | 'MODERATE' | 'CLEAR' =
      hasSunShadow ? 'HIGH' : maxH > 1.5424 ? 'MODERATE' : 'CLEAR';
    const earthStatus: 'CLEAR' | 'PARTIALLY_BLOCKED' | 'BLOCKED' =
      hasEarthBlock && hasEarthVisible ? 'PARTIALLY_BLOCKED' : hasEarthBlock ? 'BLOCKED' : 'CLEAR';

    return {
      octant: oct.code,
      name: oct.name,
      azimuthRange: oct.range,
      maxHorizonDeg: (isNaN(maxH) || maxH === -3.0) ? 0.0 : Number(maxH.toFixed(2)),
      minHorizonDeg: (isNaN(minH) || minH === 25.0) ? 0.0 : Number(minH.toFixed(2)),
      blockingLandmarks: Array.from(landmarks),
      solarOcclusionRisk: solarRisk,
      earthLoSStatus: earthStatus,
    };
  });

  return (
    <section
      role="region"
      aria-label={`360-degree Topographic Horizon Octant Companion for ${siteName}`}
      data-testid="sky-ribbon-compass-table"
      className={`p-4 rounded-lg bg-[var(--lm-color-surface)]/90 border border-[var(--lm-color-border-subtle)] text-[var(--lm-color-text-secondary)] text-xs font-mono shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3 border-b border-[var(--lm-color-border-subtle)] pb-2">
        <h3 className="font-semibold text-[var(--lm-color-text-primary)] uppercase tracking-wider text-sm">
          360° Skyline 8-Octant Compass Companion (WCAG 1.1.1 Mirror)
        </h3>
        <span className="text-[var(--lm-color-text-muted)]">Site: {siteName}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--lm-color-canvas)] text-[var(--lm-color-text-muted)] uppercase text-[11px] tracking-wider border-b border-[var(--lm-color-border)]">
            <tr>
              <th scope="col" className="py-2 px-3">Octant</th>
              <th scope="col" className="py-2 px-3">Azimuth Range</th>
              <th scope="col" className="py-2 px-3">Max Skyline</th>
              <th scope="col" className="py-2 px-3">Solar Risk</th>
              <th scope="col" className="py-2 px-3">Earth LoS</th>
              <th scope="col" className="py-2 px-3">Identified Topographic Obstacles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--lm-color-border-subtle)]/60">
            {summaries.map((s) => (
              <tr key={s.octant} className="hover:bg-[var(--lm-color-surface-strong)]/40 transition-colors">
                <td className="py-2 px-3 font-bold text-[var(--lm-color-text-secondary)]">{s.octant} ({s.name})</td>
                <td className="py-2 px-3 text-[var(--lm-color-text-muted)]">{s.azimuthRange}</td>
                <td className="py-2 px-3 font-semibold text-[var(--lm-color-info)]">{s.maxHorizonDeg >= 0 ? "+" : ""}{s.maxHorizonDeg.toFixed(2)}°</td>
                <td className="py-2 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    s.solarOcclusionRisk === 'HIGH' ? 'bg-[var(--lm-color-danger-surface)] text-[var(--lm-color-danger)] border border-[var(--lm-color-danger-border)]' :
                    s.solarOcclusionRisk === 'MODERATE' ? 'bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning-border)]' :
                    'bg-[var(--lm-color-success-surface)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)]'
                  }`}>
                    {s.solarOcclusionRisk}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    s.earthLoSStatus === 'BLOCKED' ? 'bg-[var(--lm-color-danger-surface)] text-[var(--lm-color-danger)] border border-[var(--lm-color-danger-border)]' :
                    s.earthLoSStatus === 'PARTIALLY_BLOCKED' ? 'bg-[var(--lm-color-warning-surface)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning-border)]' :
                    'bg-[var(--lm-color-success-surface)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)]'
                  }`}>
                    {s.earthLoSStatus.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2 px-3 text-[var(--lm-color-text-muted)]">
                  {s.blockingLandmarks.length > 0 ? s.blockingLandmarks.join(', ') : 'Open horizon'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

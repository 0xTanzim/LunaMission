import React, { useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { ElevationProfilePoint } from '@/domain/sites/scientificSiteInvestigation';
import { ElevationTransectPlot } from './ElevationTransectPlot';

export interface ElevationProfileTransectProps {
  profile: ElevationProfilePoint[];
  uncertaintyMeters: number;
  meanSlopeDeg?: number;
  maxSlopeDeg?: number;
}

export function ElevationProfileTransect({
  profile,
  uncertaintyMeters,
  meanSlopeDeg = 8.5,
  maxSlopeDeg = 28.0,
}: ElevationProfileTransectProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!profile || profile.length < 2) return null;

  const width = 340;
  const height = 125;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 22;
  const padBottom = 26;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minD = profile[0].distanceKm;
  const maxD = profile[profile.length - 1].distanceKm;
  const distSpan = Math.max(1, maxD - minD);

  const elevs = profile.map((p) => p.elevationMeters);
  const minE = Math.min(...elevs);
  const maxE = Math.max(...elevs);
  const elevSpan = Math.max(100, maxE - minE);

  const getX = (d: number) => padLeft + ((d - minD) / distSpan) * plotW;
  const getY = (e: number) => padTop + plotH - ((e - minE) / elevSpan) * plotH;

  const activePoint = hoveredIdx !== null ? profile[hoveredIdx] : null;

  // Local slope estimate for hovered point
  let activeSlope = meanSlopeDeg;
  if (hoveredIdx !== null) {
    if (hoveredIdx > 0 && hoveredIdx < profile.length - 1) {
      const pPrev = profile[hoveredIdx - 1];
      const pNext = profile[hoveredIdx + 1];
      const dDistKm = Math.abs(pNext.distanceKm - pPrev.distanceKm);
      const dElevM = Math.abs(pNext.elevationMeters - pPrev.elevationMeters);
      if (dDistKm > 0.001) {
        activeSlope = (Math.atan(dElevM / (dDistKm * 1000)) * 180) / Math.PI;
      }
    } else if (profile[hoveredIdx].elevationMeters === maxE || profile[hoveredIdx].elevationMeters === minE) {
      activeSlope = maxSlopeDeg;
    }
  }

  const gridLevels: number[] = [];
  const step = elevSpan > 4000 ? 2000 : elevSpan > 1500 ? 1000 : 500;
  const startLevel = Math.ceil(minE / step) * step;
  for (let lvl = startLevel; lvl <= maxE; lvl += step) {
    gridLevels.push(lvl);
  }

  const polyPoints = [
    `${padLeft},${padTop + plotH}`,
    ...profile.map((p) => `${getX(p.distanceKm).toFixed(1)},${getY(p.elevationMeters).toFixed(1)}`),
    `${padLeft + plotW},${padTop + plotH}`,
  ].join(' ');

  const pathD = profile
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.distanceKm).toFixed(1)} ${getY(p.elevationMeters).toFixed(1)}`)
    .join(' ');

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRel = e.clientX - rect.left;
    const xSvg = (xRel / rect.width) * width;
    if (xSvg < padLeft || xSvg > padLeft + plotW) {
      setHoveredIdx(null);
      return;
    }
    const dTarget = minD + ((xSvg - padLeft) / plotW) * distSpan;

    let closestIdx = 0;
    let closestDist = Infinity;
    profile.forEach((p, idx) => {
      const diff = Math.abs(p.distanceKm - dTarget);
      if (diff < closestDist) {
        closestDist = diff;
        closestIdx = idx;
      }
    });
    setHoveredIdx(closestIdx);
  };

  return (
    <div className="bg-[var(--lm-color-surface-strong)]/85 p-3 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)] shadow-inner">
      <div className="flex items-center justify-between text-[11px] mb-1.5 pb-1 border-b border-[var(--lm-color-border-subtle)]">
        <span className="font-mono uppercase tracking-wider text-[var(--lm-color-info)] font-semibold flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-[var(--lm-color-info)]" />
          <span>Altimetric Transect Analyzer</span>
        </span>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--lm-color-text-muted)]">
          <span>LOLA Precision: ±{uncertaintyMeters.toFixed(1)} m</span>
          <span>•</span>
          <span className="text-[var(--lm-color-info)]">20 m/px</span>
        </div>
      </div>

      <div className="h-6 flex items-center justify-between text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lm-color-surface)]/80 border border-[var(--lm-color-border)]/60 mb-1.5">
        {activePoint ? (
          <>
            <span className="text-[var(--lm-color-text-secondary)]">
              Dist: <strong className="text-[var(--lm-color-text-primary)]">{activePoint.distanceKm.toFixed(1)} km</strong>
            </span>
            <span className="text-[var(--lm-color-text-secondary)]">
              Elev:{' '}
              <strong className={activePoint.elevationMeters >= 0 ? 'text-[var(--lm-color-success)]' : 'text-[var(--lm-color-danger)]'}>
                {activePoint.elevationMeters > 0 ? `+${activePoint.elevationMeters.toLocaleString()}` : activePoint.elevationMeters.toLocaleString()} m
              </strong>
            </span>
            <span className="text-[var(--lm-color-text-secondary)]">
              Slope: <strong className={activeSlope > 20 ? 'text-[var(--lm-color-danger)]' : activeSlope > 10 ? 'text-[var(--lm-color-warning)]' : 'text-[var(--lm-color-success)]'}>{activeSlope.toFixed(1)}°</strong>
            </span>
            <span className={`px-1 rounded text-[11px] font-semibold ${
              activeSlope > 20 ? 'bg-[var(--lm-color-danger)]/20 text-[var(--lm-color-danger)] border border-[var(--lm-color-danger)]/40' :
              activeSlope > 10 ? 'bg-[var(--lm-color-warning)]/20 text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)]/40' :
              'bg-[var(--lm-color-success)]/20 text-[var(--lm-color-success)] border border-[var(--lm-color-success)]/40'
            }`}>
              {activePoint.label || (activeSlope > 20 ? 'Wall Scarp' : activeSlope > 10 ? 'Moderate Ridge' : 'Nominal Flank')}
            </span>
          </>
        ) : (
          <span className="text-[var(--lm-color-text-muted)] italic flex items-center gap-1 w-full justify-center">
            <span>Hover or drag crosshair across profile to inspect elevation & slope metrics</span>
          </span>
        )}
      </div>

      <ElevationTransectPlot
        width={width}
        height={height}
        padLeft={padLeft}
        plotW={plotW}
        plotH={plotH}
        padTop={padTop}
        maxD={maxD}
        maxE={maxE}
        minE={minE}
        gridLevels={gridLevels}
        polyPoints={polyPoints}
        pathD={pathD}
        profile={profile}
        hoveredIdx={hoveredIdx}
        activePoint={activePoint}
        getX={getX}
        getY={getY}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredIdx(null)}
      />

      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--lm-color-text-muted)] mt-1 pt-1 border-t border-[var(--lm-color-border-subtle)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[var(--lm-color-success)] inline-block" />
            <span>&lt;10° Safe</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[var(--lm-color-warning)] inline-block" />
            <span>10°-20° Caution</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[var(--lm-color-danger)] inline-block" />
            <span>&gt;20° Hazard Wall</span>
          </span>
        </div>
        <span className="text-[var(--lm-color-info)]">Mean Slope: {meanSlopeDeg.toFixed(1)}°</span>
      </div>
    </div>
  );
}

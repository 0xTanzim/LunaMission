import React, { useRef, useEffect, useState } from 'react';
import type { HorizonProfileBin } from '@luna/contracts';
import { cartesianToPolar } from '../utils/polarRadarMath';
import {
  renderPolarRadarScene,
  type CelestialRadarPoint,
} from '../utils/polarRadarCanvasRenderer';

export type { CelestialRadarPoint };

interface PolarSkyRadarCanvasProps {
  horizonBins: HorizonProfileBin[];
  sunPoint?: CelestialRadarPoint;
  earthPoint?: CelestialRadarPoint;
  sunTrajectory?: CelestialRadarPoint[];
  earthTrajectory?: CelestialRadarPoint[];
  className?: string;
}

export const PolarSkyRadarCanvas: React.FC<PolarSkyRadarCanvasProps> = ({
  horizonBins,
  sunPoint,
  earthPoint,
  sunTrajectory = [],
  earthTrajectory = [],
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ az: number; el: number; h?: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderPolarRadarScene({
      ctx,
      width: canvas.width,
      height: canvas.height,
      horizonBins,
      sunPoint,
      earthPoint,
      sunTrajectory,
      earthTrajectory,
    });
  }, [horizonBins, sunPoint, earthPoint, sunTrajectory, earthTrajectory]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const maxR = Math.min(canvas.width, canvas.height) / 2 - 24;

    const polar = cartesianToPolar({ x, y }, center, maxR);
    const closestBin = horizonBins.find(
      (b) => Math.abs(b.azimuthDeg - polar.azimuthDeg) < 0.8,
    );
    setHoverInfo({
      az: polar.azimuthDeg,
      el: polar.elevationDeg,
      h: closestBin?.thetaNomDeg ?? closestBin?.elevationDeg,
    });
  };

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={460}
        height={460}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        role="img"
        aria-label="360-degree Circular Polar Sky Radar Dome"
        className="w-full max-w-[460px] aspect-square rounded-full border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)] shadow-2xl cursor-crosshair"
      />
      {hoverInfo && (
        <div className="absolute bottom-2 left-2 bg-[var(--lm-color-surface)]/90 border border-[var(--lm-color-border)] p-2 rounded text-[11px] font-mono text-[var(--lm-color-text-secondary)] pointer-events-none shadow-lg">
          <div>Azimuth: <strong className="text-[var(--lm-color-info)]">{hoverInfo.az.toFixed(1)}°</strong></div>
          <div>Elevation: <strong className="text-[var(--lm-color-warning)]">{hoverInfo.el.toFixed(1)}°</strong></div>
          {hoverInfo.h !== undefined && (
            <div>Horizon: <strong className="text-[var(--lm-color-text-muted)]">{hoverInfo.h.toFixed(1)}°</strong> (Clearance: <strong className={hoverInfo.el >= hoverInfo.h ? 'text-[var(--lm-color-success)]' : 'text-[var(--lm-color-danger)]'}>{(hoverInfo.el - hoverInfo.h).toFixed(1)}°</strong>)</div>
          )}
        </div>
      )}
    </div>
  );
};

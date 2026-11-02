import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { EvaluatedSubInterval, HorizonProfileBin } from '@luna/contracts';
import {
  elevationToPixelY,
  azimuthToPixelX,
  pixelXToAzimuth,
  pixelYToElevation,
  SEAM_Y_PX,
  HORIZON_0_Y_PX,
  CANVAS_HEIGHT_PX,
} from '../../../shared/animation/piecewiseScale';
import { SkyRibbonTelemetry } from './SkyRibbonTelemetry';

interface SkyRibbonCanvasProps {
  intervals: EvaluatedSubInterval[];
  activePlayheadEpochMs: number;
  horizonProfile?: HorizonProfileBin[];
  className?: string;
}

export const SkyRibbonCanvas: React.FC<SkyRibbonCanvasProps> = ({
  intervals,
  activePlayheadEpochMs,
  horizonProfile,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverAz, setHoverAz] = useState<number | null>(null);
  const [hoverEl, setHoverEl] = useState<number | null>(null);

  // Find active interval for current playhead
  const activeInterval =
    intervals.find(
      (int) =>
        activePlayheadEpochMs >= new Date(int.startDateUtc).getTime() &&
        activePlayheadEpochMs <= new Date(int.endDateUtc).getTime(),
    ) ?? intervals[0];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#07090E';
    ctx.fillRect(0, 0, width, height);

    // High-sky zone tint (+5° to +25°)
    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, width, SEAM_Y_PX);

    // Astronomical 0° Horizon Line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_0_Y_PX);
    ctx.lineTo(width, HORIZON_0_Y_PX);
    ctx.stroke();

    // Scale Break Seam Line (+5.0° prominent cyan dashed)
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, SEAM_Y_PX);
    ctx.lineTo(width, SEAM_Y_PX);
    ctx.stroke();
    ctx.setLineDash([]);

    // Seam text badge
    ctx.fillStyle = '#38BDF8';
    ctx.font = '11px monospace';
    ctx.fillText('SCALE BREAK (+5.0°): Grazing 24 px/° vs High Sky 4 px/°', width - 330, SEAM_Y_PX - 4);
    ctx.fillStyle = '#64748B';
    ctx.fillText('0.0° ASTRONOMICAL HORIZON', 8, HORIZON_0_Y_PX - 4);

    // Cardinal Azimuth Dividers
    const cardinals = [
      { deg: 0, label: '0° N' }, { deg: 90, label: '90° E' },
      { deg: 180, label: '180° S' }, { deg: 270, label: '270° W' }, { deg: 360, label: '360° N' },
    ];
    ctx.fillStyle = '#475569';
    ctx.font = '11px monospace';
    for (const c of cardinals) {
      const x = azimuthToPixelX(c.deg, width);
      ctx.strokeStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(c.label, x + 4, height - 6);
    }

    // Skyline Obstruction Profile
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height);

    if (horizonProfile && horizonProfile.length > 0) {
      for (const bin of horizonProfile) {
        ctx.lineTo(azimuthToPixelX(bin.azimuthDeg, width), elevationToPixelY(bin.thetaNomDeg ?? 0));
      }
    } else {
      for (const int of intervals) {
        ctx.lineTo(azimuthToPixelX(int.sun.meanAzimuthDeg, width), elevationToPixelY(int.sun.meanHorizonMaskDeg));
      }
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sun Disk at current playhead
    if (activeInterval) {
      const sunX = azimuthToPixelX(activeInterval.sun.meanAzimuthDeg, width);
      const sunY = elevationToPixelY(activeInterval.sun.meanElevationDeg);
      const isSunlit = activeInterval.sun.status === 'full_sun' || activeInterval.sun.status === 'partial_limb';

      ctx.beginPath();
      ctx.arc(sunX, sunY, 7, 0, 2 * Math.PI);
      ctx.fillStyle = isSunlit ? '#F59E0B' : '#78350F';
      ctx.fill();
      ctx.strokeStyle = isSunlit ? '#FDE68A' : '#EF4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Earth Disk at current playhead
      const earthX = azimuthToPixelX(activeInterval.earth.meanAzimuthDeg, width);
      const earthY = elevationToPixelY(activeInterval.earth.meanElevationDeg);
      const isEarthDte = activeInterval.earth.status === 'visible' || activeInterval.earth.status === 'earth_direct';

      ctx.beginPath();
      ctx.arc(earthX, earthY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = isEarthDte ? '#10B981' : '#064E3B';
      ctx.fill();
      ctx.strokeStyle = isEarthDte ? '#6EE7B7' : '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [intervals, activeInterval]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverAz(pixelXToAzimuth(x, rect.width));
    setHoverEl(pixelYToElevation(y));
  };

  return (
    <div className={`relative bg-[var(--lm-color-canvas)] rounded-lg border border-[var(--lm-color-border-subtle)] overflow-hidden ${className}`}>
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-info)] font-bold uppercase">
          360° Sky-Ribbon Horizon View
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={1080}
        height={CANVAS_HEIGHT_PX}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoverAz(null); setHoverEl(null); }}
        className="w-full h-[272px] block cursor-crosshair"
      />

      <SkyRibbonTelemetry
        azimuthDeg={hoverAz}
        elevationDeg={hoverEl}
        horizonDeg={activeInterval ? activeInterval.sun.meanHorizonMaskDeg : null}
        sunElevationDeg={activeInterval ? activeInterval.sun.meanElevationDeg : undefined}
        earthElevationDeg={activeInterval ? activeInterval.earth.meanElevationDeg : undefined}
        blockingRidgeName={activeInterval?.sun?.blocker?.featureName}
      />
    </div>
  );
};

import React, { useRef, useEffect, useCallback } from 'react';
import { useScenarioState } from '../../../app/state/useScenarioState';

interface SiteMarker {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

const CANDIDATE_SITES: SiteMarker[] = [
  { id: 'connecting-ridge', name: 'Connecting Ridge CR01', lat: -89.44, lon: 222.5 },
  { id: 'shackleton-rim', name: 'Shackleton Rim', lat: -89.90, lon: 0.0 },
  { id: 'malapert-massif', name: 'Malapert Massif', lat: -85.99, lon: 0.0 },
  { id: 'peak-near-shackleton', name: 'Peak Near Shackleton', lat: -89.70, lon: 120.0 },
  { id: 'nobile-rim-1', name: 'Nobile Rim 1', lat: -85.20, lon: 53.5 },
  { id: 'de-gerlache-rim-2', name: 'de Gerlache Rim 2', lat: -88.50, lon: 292.0 },
  { id: 'haworth-rim', name: 'Haworth Rim', lat: -87.40, lon: 350.0 },
  { id: 'nobile-rim-2', name: 'Nobile Rim 2', lat: -85.40, lon: 56.1 },
];

export const PolarStereoMapCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { state, setPrimarySite } = useScenarioState();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = (size / 2) - 30;

    // Background
    ctx.fillStyle = '#05070B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Latitude Rings (80°S, 85°S, 88°S, 90°S Pole)
    const latRings = [
      { lat: -80, r: maxRadius, label: '80°S' },
      { lat: -85, r: maxRadius * 0.5, label: '85°S' },
      { lat: -88, r: maxRadius * 0.2, label: '88°S' },
    ];

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = '#475569';
    ctx.font = '11px monospace';

    for (const ring of latRings) {
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillText(ring.label, cx + 4, cy - ring.r + 12);
    }

    // Meridian Spokes (0°, 90°, 180°, 270°)
    const meridians = [
      { deg: 0, label: '0° (Prime)' }, { deg: 90, label: '90°E' },
      { deg: 180, label: '180°' }, { deg: 270, label: '270°E' },
    ];
    for (const m of meridians) {
      const rad = (m.deg * Math.PI) / 180;
      const x = cx + maxRadius * Math.sin(rad);
      const y = cy - maxRadius * Math.cos(rad);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillText(m.label, x - 12, y - 6);
    }
    ctx.setLineDash([]);

    // Lunar South Pole Center Dot
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText('90°S (Pole)', cx + 6, cy + 3);

    // Site Markers
    for (const site of CANDIDATE_SITES) {
      const r = maxRadius * ((90 + site.lat) / 10.0);
      const rad = (site.lon * Math.PI) / 180;
      const sx = cx + r * Math.sin(rad);
      const sy = cy - r * Math.cos(rad);

      const isSelected = site.id === state.primarySiteId;

      ctx.beginPath();
      ctx.arc(sx, sy, isSelected ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#06B6D4' : '#64748B';
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pulsing selection ring
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, 11, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.fillStyle = isSelected ? '#38BDF8' : '#94A3B8';
      ctx.font = isSelected ? 'bold 11px monospace' : '9px monospace';
      ctx.fillText(site.name, sx + 8, sy + 3);
    }
  }, [state.primarySiteId]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const maxRadius = (Math.min(rect.width, rect.height) / 2) - 30;

    for (const site of CANDIDATE_SITES) {
      const r = maxRadius * ((90 + site.lat) / 10.0);
      const rad = (site.lon * Math.PI) / 180;
      const sx = cx + r * Math.sin(rad);
      const sy = cy - r * Math.cos(rad);
      const dist = Math.hypot(x - sx, y - sy);
      if (dist <= 15) {
        setPrimarySite(site.id);
        break;
      }
    }
  };

  return (
    <div className={`relative bg-[var(--lm-color-canvas)] rounded-lg border border-[var(--lm-color-border-subtle)] overflow-hidden ${className}`}>
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-info)] font-bold uppercase">
          2D Polar Stereographic LOLA Map (80°S – 90°S)
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={500}
        onClick={handleClick}
        className="w-full h-[500px] block cursor-pointer"
      />
    </div>
  );
};

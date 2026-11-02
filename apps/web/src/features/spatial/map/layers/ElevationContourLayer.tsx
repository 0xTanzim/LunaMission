import React from 'react';
import { projectLatLon, DEFAULT_PROJECTION_CONFIG } from '@/domain/coordinates/projection';
import { LOLA_POLAR_CRATER_MORPHOLOGIES } from '@luna/contracts';
import { getNasaSvsElevationHex } from '@/domain/terrain/nasaSvsColorRamp';

export interface ElevationContourLayerProps {
  visible: boolean;
  zoom: number;
  opacity?: number;
}

interface ContourFeature {
  cx: number;
  cy: number;
  rPx: number;
  elevationM: number;
  isIndex: boolean;
  label?: string;
}

const { maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;
const DEG_SPAN = 7;
const KM_PER_DEG = 30.25;
const PX_PER_KM = MAX_RADIUS / (DEG_SPAN * KM_PER_DEG);

const MASSIFS = [
  { name: 'Malapert', lat: -85.90, lon: 2.90, peakElev: 5100, baseElev: 1400, sigmaKm: 16.0 },
  { name: 'Connecting Ridge', lat: -89.44, lon: 222.50, peakElev: 3820, baseElev: 1400, sigmaKm: 10.0 },
  { name: 'Peak Near Shackleton', lat: -89.73, lon: 126.80, peakElev: 4120, baseElev: 1400, sigmaKm: 8.0 },
];

function buildElevationContours(zoom: number): ContourFeature[] {
  const contours: ContourFeature[] = [];

  for (const c of LOLA_POLAR_CRATER_MORPHOLOGIES) {
    const pos = projectLatLon(c.centerLatDeg, c.centerLonDeg);
    const rCraterKm = c.diameterKm / 2;
    const rim = c.rimElevationMeters;
    const floor = c.floorElevationMeters;

    for (const elev of [-4000, -3000, -2000, -1000, 0, 1000, 2000, 3000, 4000]) {
      if (elev < floor || elev > rim) continue;
      const isIndex = elev % 2000 === 0;
      if (!isIndex && zoom < 1.3) continue;

      const t = Math.max(0.01, Math.min(0.99, (elev - floor) / (rim - floor)));
      const rKm = (0.35 + 0.65 * Math.sqrt(t)) * rCraterKm;
      const rPx = rKm * PX_PER_KM;

      contours.push({
        cx: pos.x,
        cy: pos.y,
        rPx,
        elevationM: elev,
        isIndex,
        label: isIndex ? `${elev > 0 ? '+' : ''}${elev / 1000}k` : undefined,
      });
    }
  }

  for (const m of MASSIFS) {
    const pos = projectLatLon(m.lat, m.lon);
    for (const elev of [2000, 3000, 4000, 5000]) {
      if (elev > m.peakElev) continue;
      const isIndex = elev % 2000 === 0;
      if (!isIndex && zoom < 1.3) continue;

      const ratio = (elev - m.baseElev) / (m.peakElev - m.baseElev);
      if (ratio <= 0 || ratio >= 1) continue;
      const rKm = m.sigmaKm * Math.sqrt(-Math.log(ratio));
      const rPx = rKm * PX_PER_KM;

      contours.push({
        cx: pos.x,
        cy: pos.y,
        rPx,
        elevationM: elev,
        isIndex,
        label: isIndex ? `+${elev / 1000}k` : undefined,
      });
    }
  }

  return contours;
}

export function ElevationContourLayer({ visible, zoom, opacity = 1 }: ElevationContourLayerProps) {
  if (!visible) return null;

  const contours = buildElevationContours(zoom);

  return (
    <g className="elevation-contour-layer pointer-events-none select-none" data-testid="elevation-contour-layer" opacity={opacity}>
      {contours.map((c, i) => {
        const hex = getNasaSvsElevationHex(c.elevationM);
        const strokeWidth = c.isIndex ? (c.elevationM === 0 ? 1.0 : 0.8) : 0.45;
        const opacity = c.isIndex ? 0.75 : 0.45;

        return (
          <g key={`contour-${c.cx.toFixed(1)}-${c.cy.toFixed(1)}-${c.elevationM}-${i}`}>
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.rPx}
              fill="none"
              stroke={hex}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              strokeDasharray={c.isIndex ? undefined : '2,2'}
            />
            {c.label && zoom >= 1.6 && (
              <text
                x={c.cx + c.rPx}
                y={c.cy - 1.5}
                fontSize="11"
                fontFamily="monospace"
                fill={hex}
                fillOpacity={0.9}
                textAnchor="start"
              >
                {c.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Embedded SVG Elevation Contour Scale Bar */}
      <g
        className="elevation-contour-scale-bar"
        data-testid="elevation-contour-scale-bar"
        transform="translate(18, 372)"
      >
        <rect
          x="0"
          y="0"
          width="132"
          height="16"
          rx="2"
          fill="#050b14"
          fillOpacity="0.82"
          stroke="#1e293b"
          strokeWidth="0.6"
        />
        <text x="5" y="6.5" fontSize="11" fontFamily="monospace" fill="#94a3b8" fontWeight="600">
          CONTOURS: 1,000m (Index 2km)
        </text>
        <g transform="translate(5, 9)">
          {[-4000, -2000, 0, 2000, 4000].map((elev, idx) => (
            <g key={elev} transform={`translate(${idx * 24}, 0)`}>
              <line x1="0" y1="0" x2="0" y2="3.5" stroke={getNasaSvsElevationHex(elev)} strokeWidth="1" />
              <text x="2" y="3" fontSize="11" fontFamily="monospace" fill="#cbd5e1">
                {elev === 0 ? '0m' : `${elev > 0 ? '+' : ''}${elev / 1000}k`}
              </text>
            </g>
          ))}
        </g>
      </g>
    </g>
  );
}

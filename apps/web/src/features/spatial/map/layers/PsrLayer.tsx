import React from 'react';
import { projectLatLon } from '@/domain/coordinates/projection';
import { CRATERS, craterRadiusUnits } from './CraterLayer';
import type { LayerBlendMode } from '@/features/spatial/model/mapLayerStack';

export interface PsrLayerProps {
  visible: boolean;
  opacity?: number;
  blendMode?: LayerBlendMode;
}

/**
 * Permanently shadowed terrain, hatched rather than shaded.
 *
 * The hatch is the whole point: a filled dark disc would read as a low radar or
 * temperature value, and permanently shadowed terrain is not a measurement of either —
 * it is a geometric statement about solar access that must survive colour-blindness and
 * a greyscale printout.
 */
export function PsrLayer({ visible, opacity = 1, blendMode = 'normal' }: PsrLayerProps) {
  if (!visible) return null;

  const psrCraters = CRATERS.filter((crater) => crater.hasPsr);
  if (psrCraters.length === 0) return null;

  return (
    <g
      className="psr-layer select-none pointer-events-none"
      data-testid="psr-overlay-layer"
      opacity={opacity}
      style={{ mixBlendMode: blendMode }}
    >
      {psrCraters.map((crater) => {
        const pos = projectLatLon(crater.lat, crater.lon);
        const radiusPx = craterRadiusUnits(crater.diameterKm) * 0.72;
        return (
          <circle
            key={`psr-${crater.name}`}
            cx={pos.x}
            cy={pos.y}
            r={radiusPx}
            fill="url(#psr-hatch)"
            stroke="#111c29"
            strokeWidth="0.5"
            strokeOpacity="0.35"
          />
        );
      })}
    </g>
  );
}

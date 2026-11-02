import React from 'react';
import { DEFAULT_PROJECTION_CONFIG } from '@/domain/coordinates/projection';
import type { LayerBlendMode } from '@/features/spatial/model/mapLayerStack';

export interface ScientificRasterLayerProps {
  /** Data URL of the base-layer raster; `null` while preparing, on error, or for a raster-less base. */
  url: string | null;
  opacity?: number;
  blendMode?: LayerBlendMode;
  /** Stable hook for the composited legend and tests. */
  testId?: string;
}

const { center: CENTER, maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;

/**
 * The base layer, painted under everything else. It is one image of one measured field:
 * overlays composite on top of it, never in place of it.
 */
export function ScientificRasterLayer({
  url,
  opacity = 1,
  blendMode = 'normal',
  testId = 'scientific-raster-layer',
}: ScientificRasterLayerProps) {
  if (url === null) return null;

  const left = CENTER - MAX_RADIUS;
  const top = CENTER - MAX_RADIUS;
  const size = MAX_RADIUS * 2;

  return (
    <g
      className="scientific-raster-layer"
      data-testid={testId}
      pointerEvents="none"
      opacity={opacity}
      style={{ mixBlendMode: blendMode }}
    >
      <defs>
        <clipPath id="polar-disc-clip">
          <circle cx={CENTER} cy={CENTER} r={MAX_RADIUS} />
        </clipPath>
      </defs>

      <image
        href={url}
        x={left}
        y={top}
        width={size}
        height={size}
        clipPath="url(#polar-disc-clip)"
        preserveAspectRatio="none"
        style={{ imageRendering: 'auto' }}
      />
    </g>
  );
}

import React from 'react';

/**
 * Reusable SVG definitions for the South Pole 2D cartographic canvas:
 * - psr-hatch: 45-degree diagonal pattern indicating Permanently Shadowed Regions.
 * - pole-gradient: Radial hypsometric gradient for the lunar south-polar basin (83°S-90°S).
 */
export function MapSvgDefs() {
  return (
    <defs>
      {/* PSR Diagonal Hatch Pattern */}
      <pattern
        id="psr-hatch"
        width="6"
        height="6"
        patternTransform="rotate(45 0 0)"
        patternUnits="userSpaceOnUse"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="6"
          stroke="#4a6585"
          strokeWidth="1.2"
          strokeOpacity="0.45"
        />
      </pattern>

      {/* Radial Terrain Gradient for Polar Basin */}
      <radialGradient id="pole-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#141d2c" />
        <stop offset="70%" stopColor="#0d1422" />
        <stop offset="100%" stopColor="#070b12" />
      </radialGradient>
    </defs>
  );
}

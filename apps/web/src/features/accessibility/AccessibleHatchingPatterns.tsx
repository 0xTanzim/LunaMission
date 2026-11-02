import React from 'react';

/**
 * Accessible SVG Hatching Patterns for Non-Color Status Conveyance
 * Governed by WCAG 2.2 AA (Guideline 1.4.1 Non-Color Dependent Status)
 * and docs/phase-3/ACCESSIBILITY_PLAN.md § 3.
 */
export const AccessibleHatchingPatterns: React.FC = () => {
  return (
    <svg
      aria-hidden="true"
      className="absolute w-0 h-0 overflow-hidden pointer-events-none"
      style={{ position: 'absolute', width: 0, height: 0 }}
    >
      <defs>
        {/* Pattern 1: Terrain Shadow (Dense 45-degree diagonal lines) */}
        <pattern
          id="pattern-terrain-shadow"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="8" stroke="#f43f5e" strokeWidth="2.5" />
        </pattern>

        {/* Pattern 2: Partial Limb (Dot stipple matrix) */}
        <pattern
          id="pattern-partial-limb"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="3" r="1.5" fill="#f59e0b" />
        </pattern>

        {/* Pattern 3: Sub-Horizon (Cross-hatch grid) */}
        <pattern
          id="pattern-sub-horizon"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#64748b" strokeWidth="1.2" />
        </pattern>

        {/* Pattern 4: Earth Occluded (Horizontal dashes) */}
        <pattern
          id="pattern-earth-occluded"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="3" x2="6" y2="3" stroke="#e0e7ff" strokeWidth="1.5" strokeDasharray="3 3" />
        </pattern>
      </defs>
    </svg>
  );
};

import { CandidateSite } from '@/domain/sites/candidateSite';
import { ProjectedPoint } from '@/domain/coordinates/projection';
import {
  LEADER_LENGTH_PX,
  PIN_COLORS,
  badgeText,
  badgeWidthFor,
  clampBadgeAnchor,
  isOffMapPolarSite,
  offsetAlongAngle,
  radialAngleFromPole,
  selectedPinAriaLabel,
} from '@/features/spatial/map/model/candidatePinGeometry';
import { SELECTED_PIN_HIT_RADIUS_UNITS } from '@/features/spatial/map/model/svgTargetSize';

interface SelectedCandidatePinProps {
  site: CandidateSite;
  pos: ProjectedPoint;
  /** Invisible hit radius in viewBox units; the map keeps it ≥24 CSS px (WCAG 2.5.8). */
  hitRadiusUnits?: number;
}

/**
 * The selected candidate: halo, marker, and a leader line out to a badge that
 * names it. Rendered last so it floats above every other layer.
 */
export function SelectedCandidatePin({ site, pos, hitRadiusUnits = SELECTED_PIN_HIT_RADIUS_UNITS }: SelectedCandidatePinProps) {
  const radialAngle = radialAngleFromPole(pos);
  const badge = clampBadgeAnchor(offsetAlongAngle(pos, radialAngle, LEADER_LENGTH_PX));
  const labelText = badgeText(site);
  const badgeWidth = badgeWidthFor(labelText);
  const isOffMap = isOffMapPolarSite(site);
  const angleDeg = (radialAngle * 180) / Math.PI;

  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={selectedPinAriaLabel(site)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="cursor-default focus:outline-none"
    >
      {/* Generous Target */}
      <circle cx={pos.x} cy={pos.y} r={hitRadiusUnits} fill="transparent" />

      {/* Restrained Selection Halo (Clean, single 12px ring) */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r="13"
        fill="none"
        stroke={PIN_COLORS.accent}
        strokeWidth="1.5"
        strokeDasharray="3 2"
        opacity="0.9"
      />

      {/* Directional Bearing Indicator on Boundary Collar for Off-Map Sites */}
      {isOffMap && (
        <g
          className="bearing-arrow"
          transform={`translate(${pos.x}, ${pos.y}) rotate(${angleDeg})`}
        >
          <polygon
            points="11,0 4,-5 4,5"
            fill={PIN_COLORS.accent}
            stroke={PIN_COLORS.badgeStroke}
            strokeWidth="0.8"
          />
        </g>
      )}

      {/* Selected Marker Dot (High-contrast teal with white border) */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r="5.5"
        fill={PIN_COLORS.accent}
        stroke={PIN_COLORS.badgeStroke}
        strokeWidth="1.6"
      />

      {/* Restrained Leader Line */}
      <line
        x1={pos.x}
        y1={pos.y}
        x2={badge.x}
        y2={badge.y}
        stroke={PIN_COLORS.accent}
        strokeWidth="1.3"
        opacity="0.85"
      />

      {/* High-Contrast Selected Badge Tag */}
      <g transform={`translate(${badge.x}, ${badge.y})`}>
        <rect
          x={-badgeWidth / 2}
          y="-9"
          width={badgeWidth}
          height="18"
          rx="3.5"
          fill={PIN_COLORS.badgeBackdrop}
          stroke={PIN_COLORS.accent}
          strokeWidth="1.3"
          className="drop-shadow-md"
        />
        <text
          x="0"
          y="3.2"
          textAnchor="middle"
          fill={PIN_COLORS.accent}
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {labelText}
        </text>
      </g>
    </g>
  );
}

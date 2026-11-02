import React from 'react';
import { formatAngle } from '@/shared/formatting/formatters';
import {
  EXPANDED_LABEL_GUTTER_PX,
  EXPANDED_LABEL_OFFSET_PX,
  expandedFrame,
  markerLabelPlacement,
} from '@/features/passport/model/localSkyGeometry';
import { type LocalSkyReadouts, type SkyMarker } from '@/features/passport/model/localSkyReadouts';
import {
  EARTH_COLOR,
  EXPANDED_EARTH_VISUAL,
  EXPANDED_SUN_VISUAL,
  HorizonMarker,
  SUN_COLOR,
} from '@/features/passport/components/horizon/HorizonMarker';

/** Sun and Earth disks for the expanded inspector, drawn as `<svg>` children. */
interface InspectorHorizonMarkersProps {
  readouts: LocalSkyReadouts;
  selectedTarget: SkyMarker | null;
  onSelectTarget: (marker: SkyMarker) => void;
}

export function InspectorHorizonMarkers({
  readouts,
  selectedTarget,
  onSelectTarget,
}: InspectorHorizonMarkersProps) {
  const { sunElevationDeg, sunAzimuthDeg, earthElevationDeg, earthAzimuthDeg } = readouts;
  const sunPoint =
    sunAzimuthDeg !== null && sunElevationDeg !== null
      ? { x: expandedFrame.azToX(sunAzimuthDeg), y: expandedFrame.elevToY(sunElevationDeg) }
      : null;
  const earthPoint =
    earthAzimuthDeg !== null && earthElevationDeg !== null
      ? { x: expandedFrame.azToX(earthAzimuthDeg), y: expandedFrame.elevToY(earthElevationDeg) }
      : null;
  const earthLabel = markerLabelPlacement(
    expandedFrame,
    earthPoint?.x ?? 0,
    EXPANDED_LABEL_GUTTER_PX,
    EXPANDED_LABEL_OFFSET_PX,
  );
  const sunLabel = markerLabelPlacement(
    expandedFrame,
    sunPoint?.x ?? 0,
    EXPANDED_LABEL_GUTTER_PX,
    EXPANDED_LABEL_OFFSET_PX,
  );

  return (
    <>
      {earthPoint && (
        <HorizonMarker
          x={earthPoint.x}
          y={earthPoint.y}
          zeroY={expandedFrame.zeroY}
          color={EARTH_COLOR}
          glowFill="url(#modal-earth-glow)"
          visual={EXPANDED_EARTH_VISUAL}
          selected={selectedTarget === 'earth'}
          onSelect={() => onSelectTarget('earth')}
        >
          <text
            x={earthLabel.x}
            y={earthPoint.y - 8}
            textAnchor={earthLabel.anchor}
            fill={EARTH_COLOR}
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            ⊕ Earth ({formatAngle(earthElevationDeg, { decimals: 2, sign: true })})
          </text>
        </HorizonMarker>
      )}

      {sunPoint && (
        <HorizonMarker
          x={sunPoint.x}
          y={sunPoint.y}
          zeroY={expandedFrame.zeroY}
          color={SUN_COLOR}
          glowFill="url(#modal-sun-glow)"
          visual={EXPANDED_SUN_VISUAL}
          selected={selectedTarget === 'sun'}
          onSelect={() => onSelectTarget('sun')}
        >
          <text
            x={sunLabel.x}
            y={sunPoint.y - 8}
            textAnchor={sunLabel.anchor}
            fill={SUN_COLOR}
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            ☀ Sun ({formatAngle(sunElevationDeg, { decimals: 2, sign: true })})
          </text>
        </HorizonMarker>
      )}
    </>
  );
}

import React from 'react';
import { formatAngle } from '@/shared/formatting/formatters';
import {
  COMPACT_LABEL_GUTTER_PX,
  COMPACT_LABEL_OFFSET_PX,
  compactFrame,
  markerLabelPlacement,
} from '@/features/passport/model/localSkyGeometry';
import { type LocalSkyReadouts, type SkyMarker } from '@/features/passport/model/localSkyReadouts';
import {
  COMPACT_EARTH_VISUAL,
  COMPACT_SUN_VISUAL,
  EARTH_COLOR,
  HorizonMarker,
  SUN_COLOR,
} from '@/features/passport/components/horizon/HorizonMarker';

/** Sun and Earth disks for the compact Passport chart, drawn as `<svg>` children. */
interface LocalSkyHorizonMarkersProps {
  readouts: LocalSkyReadouts;
  selectedMarker: SkyMarker | null;
  onSelectMarker: (marker: SkyMarker) => void;
}

export function LocalSkyHorizonMarkers({
  readouts,
  selectedMarker,
  onSelectMarker,
}: LocalSkyHorizonMarkersProps) {
  const { sunElevationDeg, sunAzimuthDeg, earthElevationDeg, earthAzimuthDeg } = readouts;
  const sunPoint =
    sunAzimuthDeg !== null && sunElevationDeg !== null
      ? { x: compactFrame.azToX(sunAzimuthDeg), y: compactFrame.elevToY(sunElevationDeg) }
      : null;
  const earthPoint =
    earthAzimuthDeg !== null && earthElevationDeg !== null
      ? { x: compactFrame.azToX(earthAzimuthDeg), y: compactFrame.elevToY(earthElevationDeg) }
      : null;
  const earthLabel = markerLabelPlacement(
    compactFrame,
    earthPoint?.x ?? 0,
    COMPACT_LABEL_GUTTER_PX,
    COMPACT_LABEL_OFFSET_PX,
  );
  const sunLabel = markerLabelPlacement(
    compactFrame,
    sunPoint?.x ?? 0,
    COMPACT_LABEL_GUTTER_PX,
    COMPACT_LABEL_OFFSET_PX,
  );

  return (
    <>
      {earthPoint && (
        <HorizonMarker
          x={earthPoint.x}
          y={earthPoint.y}
          zeroY={compactFrame.zeroY}
          color={EARTH_COLOR}
          glowFill="url(#earth-glow)"
          visual={COMPACT_EARTH_VISUAL}
          selected={selectedMarker === 'earth'}
          onSelect={() => onSelectMarker('earth')}
        >
          <text
            x={earthLabel.x}
            y={earthPoint.y - 6}
            textAnchor={earthLabel.anchor}
            fill={EARTH_COLOR}
            fontSize="11"
            fontWeight="600"
            fontFamily="monospace"
          >
            Earth ({formatAngle(earthElevationDeg, { decimals: 2, sign: true })})
          </text>
        </HorizonMarker>
      )}

      {sunPoint && (
        <HorizonMarker
          x={sunPoint.x}
          y={sunPoint.y}
          zeroY={compactFrame.zeroY}
          color={SUN_COLOR}
          glowFill="url(#sun-glow)"
          visual={COMPACT_SUN_VISUAL}
          selected={selectedMarker === 'sun'}
          onSelect={() => onSelectMarker('sun')}
        >
          <text
            x={sunLabel.x}
            y={sunPoint.y - 6}
            textAnchor={sunLabel.anchor}
            fill={SUN_COLOR}
            fontSize="11"
            fontWeight="600"
            fontFamily="monospace"
          >
            Sun ({formatAngle(sunElevationDeg, { decimals: 2, sign: true })})
          </text>
        </HorizonMarker>
      )}
    </>
  );
}

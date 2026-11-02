import { useMemo, useState } from 'react';
import { usePlayheadAnimation } from '../analyze/hooks/usePlayheadAnimation';
import type { LiveCelestialState } from './skyRibbonOverlays';
import { buildSkyDeckModel, type SkyDeckModel, type SkyDeckModelInput } from './skyRibbonDeckModel';

/** Keeps the last backend playhead state the shared buffer published. */
function useLiveCelestialState(): LiveCelestialState | null {
  const [live, setLive] = useState<LiveCelestialState | null>(null);
  usePlayheadAnimation({
    onFrame: (buffer) => {
      if (!Number.isFinite(buffer[1]) || !Number.isFinite(buffer[2])) return;
      if (buffer[1] === 0 && buffer[2] === 0) return;
      setLive({
        sunAzimuthDeg: buffer[1],
        sunElevationDeg: buffer[2],
        earthAzimuthDeg: buffer[3],
        earthElevationDeg: buffer[4],
      });
    },
  });
  return live;
}

/**
 * The deck's presentation model, assembled from backend data plus the shared playhead buffer.
 * All derivation lives in the pure `buildSkyDeckModel`, so this hook only supplies the live
 * playhead sample and memoises the result.
 */
export function useSkyDeckModel(input: SkyDeckModelInput): SkyDeckModel {
  const live = useLiveCelestialState();
  const {
    intervals,
    horizonProfile,
    playheadUtc,
    geometry,
    diskGeometry,
    solarCriterion,
  } = input;
  return useMemo(
    () =>
      buildSkyDeckModel({
        intervals,
        horizonProfile,
        playheadUtc,
        geometry,
        diskGeometry,
        solarCriterion,
        live,
      }),
    [intervals, horizonProfile, playheadUtc, geometry, diskGeometry, solarCriterion, live],
  );
}

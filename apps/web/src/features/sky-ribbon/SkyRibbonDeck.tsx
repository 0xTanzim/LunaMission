import React, { useState } from 'react';
import type { EvaluatedSubInterval, EventWhisker } from '@luna/contracts';
import { usePrefersReducedMotion } from '../accessibility/usePrefersReducedMotion';
import { useSkyDeckModel } from './useSkyDeckModel';
import { SkyDeckHeader } from './SkyDeckHeader';
import { SkyContextPanorama } from './SkyContextPanorama';
import { GrazingCorridorCanvas } from './GrazingCorridorCanvas';
import { SkyAnalyticalReadout } from './SkyAnalyticalReadout';
import { SkyRibbonA11yTable } from './SkyRibbonA11yTable';
import { SkyDeckStatePanel } from './SkyDeckStatePanel';
import { GrazingWindowList } from './GrazingWindowList';
import type { HorizonProfileBin } from './skyRibbonRenderer';
import type { SkyCelestialGeometry } from './skyRibbonAnalysis';
import type { ApparentDiskGeometry } from './skyRibbonDisk';
import type { SkyCursor } from './skyRibbonCursor';

export interface SkyRibbonDeckProps {
  intervals?: EvaluatedSubInterval[];
  horizonProfile?: readonly HorizonProfileBin[];
  eventWhiskers?: readonly EventWhisker[];
  siteName?: string;
  /** Explicit lifecycle override; derived from the payload when omitted. */
  status?: 'loading' | 'empty' | 'error' | 'ready';
  errorMessage?: string;
  onRetry?: () => void;
  /** Canonical playhead (ISO 8601); selects the active sub-interval. */
  playheadUtc?: string;
  /** Optional API geometry: apparent angular radii + topocentric rates. */
  geometry?: SkyCelestialGeometry;
  /** Backend apparent-disk boundary geometry in the horizon frame (plan §4). */
  diskGeometry?: ApparentDiskGeometry | null;
  solarCriterion?: 'upperLimb' | 'fullDisk';
  earthCriterion?: 'center' | 'fullDisk' | 'anyLimb';
  hoveredAzimuthDeg?: number | null;
  onHoverAzimuth?: (azimuthDeg: number | null) => void;
  activeBlockerAzimuthDeg?: number | null;
  onSelectBlocker?: (azimuthDeg: number | null) => void;
  className?: string;
}

/** `full-disk` is a conservative bound, not exact finite-disk/terrain geometry. */
const EARTH_CRITERION_LABEL = {
  center: 'centre',
  fullDisk: 'full-disk bound',
  anyLimb: 'any-limb',
} as const;

const STATE_MESSAGE = {
  loading: 'Evaluating topocentric horizon and finite-disk solar visibility…',
  empty:
    'No evaluated sub-intervals or horizon bins for this scenario. Nothing is drawn, and the horizon is not assumed flat.',
  error: 'Sky-ribbon telemetry unavailable.',
} as const;

/**
 * Dual-Panel Sky-Ribbon 2.0 flight deck (ADR-03).
 *
 * Panel 1 — 360° panorama overview; Panel 2 — strictly linear −5°…+10° grazing corridor; a
 * grouped read-out strip (solar visibility · Earth communications geometry · mission event
 * status); the critical grazing intervals; and a WCAG 1.1.1 companion table.
 *
 * Pure presentation: every figure is a backend value rendered as-is or a value whose provenance is
 * labelled. No ephemeris evaluation, no horizon interpolation, no window integration and no
 * apparent-disk reconstruction happens in this tree — the disk is drawn only from supplied
 * boundary geometry.
 */
export const SkyRibbonDeck: React.FC<SkyRibbonDeckProps> = ({
  intervals = [],
  horizonProfile,
  eventWhiskers = [],
  siteName = 'Unassigned site',
  status,
  errorMessage,
  onRetry,
  playheadUtc,
  geometry,
  diskGeometry,
  solarCriterion = 'upperLimb',
  earthCriterion = 'center',
  onHoverAzimuth,
  activeBlockerAzimuthDeg = null,
  onSelectBlocker,
  className = '',
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const [cursor, setCursor] = useState<SkyCursor | null>(null);
  const model = useSkyDeckModel({
    intervals,
    horizonProfile,
    playheadUtc,
    geometry,
    diskGeometry,
    solarCriterion,
  });
  const resolvedStatus = status ?? (intervals.length === 0 ? 'empty' : 'ready');

  return (
    <div
      data-testid="sky-ribbon-deck"
      className={`flex w-full min-w-0 flex-col gap-3 ${className}`}
    >
      <SkyDeckHeader
        siteName={siteName}
        windowLabel={model.windowLabel}
        reducedMotion={reducedMotion}
        statusLabel={resolvedStatus}
        diskSupport={model.disk.kind}
      />

      {resolvedStatus === 'ready' ? (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
            <SkyContextPanorama
              skyline={model.skyline}
              skylineSource={model.skylineSource}
              skylineTopology={model.skylineTopology}
              trajectories={model.trajectories}
              sun={model.sun}
              earth={model.earthBody}
              gauge={model.gauge}
              playheadMarker={model.playheadMarker}
              cursor={cursor}
              pinnedAzimuthDeg={activeBlockerAzimuthDeg}
              reducedMotion={reducedMotion}
              onCursorChange={setCursor}
              onPinAzimuth={(azimuthDeg) => onSelectBlocker?.(azimuthDeg)}
              onHoverAzimuth={onHoverAzimuth}
            />
            <GrazingCorridorCanvas
              skyline={model.skyline}
              skylineSource={model.skylineSource}
              skylineTopology={model.skylineTopology}
              sun={model.sun}
              earth={model.earthBody}
              gauge={model.gauge}
              disk={model.disk}
              solar={model.solar}
              contact={model.contact}
              grazingMarkers={model.grazingMarkers}
              cursor={cursor}
              pinnedAzimuthDeg={activeBlockerAzimuthDeg}
              reducedMotion={reducedMotion}
              onCursorChange={setCursor}
              onPinAzimuth={(azimuthDeg) => onSelectBlocker?.(azimuthDeg)}
              onHoverAzimuth={onHoverAzimuth}
            />
          </div>
          <SkyAnalyticalReadout
            solar={model.solar}
            earth={model.earth}
            missionEvent={model.missionEvent}
            disk={model.disk}
            rates={model.rates}
            cursor={cursor}
            solarCriterionLabel={model.solarCriterionLabel}
            earthCriterionLabel={EARTH_CRITERION_LABEL[earthCriterion]}
            windowLabel={model.windowLabel}
          />
          <GrazingWindowList
            windows={model.grazingWindows}
            hasIntervals={intervals.length > 0}
          />
        </>
      ) : (
        <SkyDeckStatePanel
          status={resolvedStatus}
          message={
            resolvedStatus === 'error'
              ? errorMessage ?? STATE_MESSAGE.error
              : STATE_MESSAGE[resolvedStatus]
          }
          onRetry={onRetry}
        />
      )}

      <SkyRibbonA11yTable
        siteName={siteName}
        intervals={intervals}
        eventWhiskers={eventWhiskers}
        skyline={model.skyline}
        skylineTopology={model.skylineTopology}
        activeIndex={model.activeIndex}
        solar={model.solar}
        earth={model.earth}
        missionEvent={model.missionEvent}
        disk={model.disk}
        trajectories={model.trajectories}
        solarCriterionLabel={model.solarCriterionLabel}
        windowLabel={model.windowLabel}
      />
    </div>
  );
};

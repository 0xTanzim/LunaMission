import React from 'react';
import { Compass, Layers, MapPin, Ruler, Triangle } from 'lucide-react';
import type { SelenographicCoordinate } from '@/domain/coordinates/projection';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type {
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
} from '@/domain/coordinates/frames';
import type { MapPointFacts } from '@/features/spatial/map/model/mapPointFacts';

export interface InspectorGeometryPanelProps {
  coord: SelenographicCoordinate;
  distanceKm: number;
  sunElevationDeg: TopocentricElevationDeg;
  sunAzimuthDeg: TopocentricAzimuthDeg;
  earthElevationDeg: TopocentricElevationDeg;
  earthAzimuthDeg: TopocentricAzimuthDeg;
  nearestSite: CandidateSite;
  nearestDistanceKm: number;
  /** Elevation, slope, coverage and evaluability of the coordinate. */
  facts?: MapPointFacts | null;
  onSelectNearest: (site: CandidateSite) => void;
  className?: string;
}

const CELL_CLASS =
  'bg-[var(--lm-color-canvas)]/80 p-2 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] flex flex-col gap-0.5';
const CELL_LABEL_CLASS = 'text-[11px] text-[var(--lm-color-text-muted)] flex items-center gap-1';
const CELL_VALUE_CLASS = 'font-semibold text-[var(--lm-color-text-primary)]';

/**
 * Docked readout for an inspected selenographic coordinate on the 2D map.
 *
 * Reads the point's five facts — where it is, how high, how steep, what covers it and
 * whether it can be evaluated — then the site-relative geometry. Every value here comes
 * from a domain derivation; the panel formats and signs it.
 */
export function InspectorGeometryPanel({
  coord,
  distanceKm,
  sunElevationDeg,
  sunAzimuthDeg,
  earthElevationDeg,
  earthAzimuthDeg,
  nearestSite,
  nearestDistanceKm,
  facts,
  onSelectNearest,
  className = '',
}: InspectorGeometryPanelProps) {
  const formattedLat = `${Math.abs(coord.latitudeDeg).toFixed(3)}°S`;
  const formattedLon = `${coord.longitudeDeg.toFixed(3)}°E`;

  return (
    <div
      data-testid="inspector-geometry-panel"
      className={`flex flex-col gap-2 font-mono text-xs ${className}`}
    >
      <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 xl:grid-cols-6">
        <div className={CELL_CLASS}>
          <span className={CELL_LABEL_CLASS}>
            <MapPin className="h-3 w-3 text-[var(--lm-color-warning)]" aria-hidden="true" />
            <span>Coordinates</span>
          </span>
          <span className={CELL_VALUE_CLASS}>
            {formattedLat}, {formattedLon}
          </span>
        </div>

        <div className={CELL_CLASS}>
          <span className={CELL_LABEL_CLASS}>
            <Ruler className="h-3 w-3 text-[var(--lm-color-info)]" aria-hidden="true" />
            <span>Elevation (DEM)</span>
          </span>
          <span className={CELL_VALUE_CLASS} data-testid="inspector-elevation">
            {facts ? `${facts.elevationMeters >= 0 ? '+' : ''}${facts.elevationMeters.toFixed(0)} m` : 'unavailable'}
          </span>
        </div>

        <div className={CELL_CLASS}>
          <span className={CELL_LABEL_CLASS}>
            <Triangle className="h-3 w-3 text-[var(--lm-color-warning)]" aria-hidden="true" />
            <span>Slope</span>
          </span>
          <span className={CELL_VALUE_CLASS} data-testid="inspector-slope">
            {facts ? `${facts.slopeDeg.toFixed(1)}°` : 'unavailable'}
          </span>
        </div>

        <div className={CELL_CLASS}>
          <span className={CELL_LABEL_CLASS}>
            <Layers className="h-3 w-3 text-[var(--lm-color-success)]" aria-hidden="true" />
            <span>Coverage</span>
          </span>
          <span className={CELL_VALUE_CLASS} data-testid="inspector-coverage">
            {facts
              ? facts.coverage.insidePaintedSheet
                ? 'Inside painted polar sheet'
                : 'Outside painted sheet'
              : 'unavailable'}
          </span>
        </div>

        <div className={CELL_CLASS}>
          <span className={CELL_LABEL_CLASS}>Distance to Active</span>
          <span className={`${CELL_VALUE_CLASS} text-[var(--lm-color-selected-site)]`}>
            {distanceKm.toFixed(1)} km
          </span>
        </div>

        <div className={CELL_CLASS}>
          <span className={CELL_LABEL_CLASS}>Evaluability</span>
          <span
            className={`${CELL_VALUE_CLASS} ${
              facts?.evaluability.status === 'evaluable'
                ? 'text-[var(--lm-color-success)]'
                : 'text-[var(--lm-color-text-secondary)]'
            }`}
            data-testid="inspector-evaluability"
          >
            {facts ? facts.evaluability.label : 'unavailable'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className={CELL_CLASS}>
          <span className={`${CELL_LABEL_CLASS} text-[var(--lm-color-sun)]`}>Sun Elev / Az</span>
          <span className={CELL_VALUE_CLASS}>
            {sunElevationDeg >= 0 ? '+' : ''}
            {sunElevationDeg.toFixed(2)}° / {sunAzimuthDeg.toFixed(1)}°
          </span>
        </div>

        <div className={CELL_CLASS}>
          <span className={`${CELL_LABEL_CLASS} text-[var(--lm-color-earth)]`}>Earth Elev / Az</span>
          <span className={CELL_VALUE_CLASS}>
            {earthElevationDeg >= 0 ? '+' : ''}
            {earthElevationDeg.toFixed(2)}° / {earthAzimuthDeg.toFixed(1)}°
          </span>
        </div>
      </div>

      {facts && (
        <div className="flex flex-col gap-1 rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]/60 p-2 text-[11px] leading-snug">
          <p className="text-[var(--lm-color-text-secondary)]">
            <span className="font-semibold text-[var(--lm-color-text-primary)]">Coverage: </span>
            {facts.coverage.demProduct}. {facts.coverage.note}
          </p>
          <p className="text-[var(--lm-color-text-secondary)]">
            <span className="font-semibold text-[var(--lm-color-text-primary)]">Evaluability: </span>
            {facts.evaluability.reason}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--lm-color-border-subtle)] pt-1">
        <button
          type="button"
          onClick={() => onSelectNearest(nearestSite)}
          className="min-h-6 cursor-pointer rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-selected-site)]/50 bg-[var(--lm-color-surface-strong)] px-2.5 py-1 text-[11px] font-mono text-[var(--lm-color-selected-site)] transition-colors hover:border-[var(--lm-color-selected-site)] hover:bg-[var(--lm-color-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-focus)]"
        >
          Select Nearest: {nearestSite.code} ({nearestDistanceKm.toFixed(1)} km)
        </button>

        <div className="flex items-center gap-1 text-[11px] leading-tight text-[var(--lm-color-text-muted)]">
          <Compass className="h-3 w-3 shrink-0 text-[var(--lm-color-warning)]" aria-hidden="true" />
          <span>
            Spherical datum (R=1737.4 km). Full LOLA DEM terrain mask compiled for certified sites.
          </span>
        </div>
      </div>
    </div>
  );
}

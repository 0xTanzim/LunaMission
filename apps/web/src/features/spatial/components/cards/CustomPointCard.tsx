import React from 'react';
import { MapPin, X, Compass } from 'lucide-react';
import { SelenographicCoordinate } from '@/domain/coordinates/projection';
import { CandidateSite } from '@/domain/sites/candidateSite';
import {
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
} from '@/domain/coordinates/frames';

export interface CustomPointCardProps {
  coord: SelenographicCoordinate;
  distanceKm: number;
  /** Topocentric horizon angles computed geometry-only at `coord`. */
  sunElevationDeg: TopocentricElevationDeg;
  sunAzimuthDeg: TopocentricAzimuthDeg;
  earthElevationDeg: TopocentricElevationDeg;
  earthAzimuthDeg: TopocentricAzimuthDeg;
  nearestSite: CandidateSite;
  nearestDistanceKm: number;
  onSelectNearest: (site: CandidateSite) => void;
  onClose: () => void;
}

/**
 * Floating inspection card for arbitrary selenographic coordinates clicked on the 2D map.
 * Explicitly notes geometry-only status relative to spherical Moon datum.
 */
export function CustomPointCard({
  coord,
  distanceKm,
  sunElevationDeg,
  sunAzimuthDeg,
  earthElevationDeg,
  earthAzimuthDeg,
  nearestSite,
  nearestDistanceKm,
  onSelectNearest,
  onClose,
}: CustomPointCardProps) {
  return (
    <div
      role="region"
      aria-label="Custom Coordinate Inspection"
      className="absolute top-14 right-3 z-30 max-w-sm w-76 bg-[var(--lm-color-surface-raised)]/96 backdrop-blur-md border border-[var(--lm-color-border)] rounded-[var(--lm-radius-md)] p-3 shadow-xl text-left select-text"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--lm-color-border-subtle)]">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[var(--lm-color-warning)]" />
          <span className="text-xs font-semibold text-[var(--lm-color-text-primary)]">
            Custom Point Inspection
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close custom inspection card"
          className="p-1 rounded-[var(--lm-radius-xs)] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Geometry Metrics */}
      <div className="my-2 space-y-1 text-[11px] font-mono">
        <div className="flex justify-between">
          <span className="text-[var(--lm-color-text-muted)]">Coordinates:</span>
          <span className="font-semibold text-[var(--lm-color-text-primary)]">
            {Math.abs(coord.latitudeDeg).toFixed(3)}°S, {coord.longitudeDeg.toFixed(3)}°E
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--lm-color-text-muted)]">Distance to Active:</span>
          <span className="text-[var(--lm-color-selected-site)] font-semibold">
            {distanceKm.toFixed(1)} km
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--lm-color-sun)]">Sun Elev / Az:</span>
          <span className="font-semibold">
            {sunElevationDeg >= 0 ? '+' : ''}
            {sunElevationDeg.toFixed(2)}° / {sunAzimuthDeg.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--lm-color-earth)]">Earth Elev / Az:</span>
          <span className="font-semibold">
            {earthElevationDeg >= 0 ? '+' : ''}
            {earthElevationDeg.toFixed(2)}° / {earthAzimuthDeg.toFixed(1)}°
          </span>
        </div>
      </div>

      {/* Quick Jump to Nearest Certified Site */}
      <div className="pt-2 border-t border-[var(--lm-color-border-subtle)] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onSelectNearest(nearestSite);
            onClose();
          }}
          className="px-2 py-1 text-[11px] font-mono rounded-[var(--lm-radius-xs)] bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)]/50 hover:bg-[var(--lm-color-surface)] transition-colors"
        >
          Select Nearest: {nearestSite.code} ({nearestDistanceKm.toFixed(1)} km)
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-2 text-[11px] text-[var(--lm-color-text-disabled)] leading-tight flex items-start gap-1">
        <Compass className="w-3 h-3 text-[var(--lm-color-warning)] shrink-0 mt-0.5" />
        <span>
          Geometry-only spherical datum (R=1737.4 km). Full LOLA DEM terrain horizon mask is compiled for certified candidate landing sites.
        </span>
      </div>
    </div>
  );
}

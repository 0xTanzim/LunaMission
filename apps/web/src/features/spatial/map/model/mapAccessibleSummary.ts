import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { ResultAvailability } from '@/domain/celestial/availability';
import type { TopocentricAzimuthDeg, TopocentricElevationDeg } from '@/domain/coordinates/frames';
import { formatAvailableAngle } from '@/shared/formatting/availability';

export interface MapAccessibleSummaryInput {
  selectedSite: CandidateSite;
  sunAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  sunElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  earthAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  earthElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  /** ISO-8601 UTC instant the vector angles were computed for. */
  epochIsoUtc?: string;
  /** Candidate markers actually drawn on the map. */
  markerCount: number;
}

/**
 * Text alternative for the polar stereographic map.
 *
 * The map is a picture of a computed field: which site is the target, what the
 * topocentric Sun/Earth bearings are at that site, and how many candidate markers
 * are plotted. Without this, the whole surface is silent for a screen reader, so the
 * label states the reading, the epoch it belongs to, and how to reach the numbers.
 */
export function mapAccessibleLabel({
  selectedSite,
  sunAzimuthDeg,
  sunElevationDeg,
  earthAzimuthDeg,
  earthElevationDeg,
  epochIsoUtc,
  markerCount,
}: MapAccessibleSummaryInput): string {
  const epoch = epochIsoUtc ? ` at ${epochIsoUtc}` : '';
  const coordinates =
    `${Math.abs(selectedSite.coordinates.latitudeDeg).toFixed(2)}°S, ` +
    `${selectedSite.coordinates.longitudeDeg.toFixed(2)}°E`;

  return (
    `Polar stereographic map of the lunar south pole, 83°S to 90°S. ` +
    `Selected landing site ${selectedSite.name} (${selectedSite.code}) at ${coordinates}. ` +
    `Sun azimuth ${formatAvailableAngle(sunAzimuthDeg, 1)}, ` +
    `elevation ${formatAvailableAngle(sunElevationDeg, 2, true)}. ` +
    `Earth azimuth ${formatAvailableAngle(earthAzimuthDeg, 1)}, ` +
    `elevation ${formatAvailableAngle(earthElevationDeg, 2, true)}. ` +
    `${markerCount} candidate ${markerCount === 1 ? 'marker' : 'markers'} plotted${epoch}. ` +
    `The same plot is available as a data table.`
  );
}

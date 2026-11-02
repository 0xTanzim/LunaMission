import React from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import { useSiteCatalog } from '@/features/spatial/hooks/useSiteCatalog';

export interface MapSiteDataTableProps {
  selectedSite: CandidateSite;
  /** Sites actually drawn on the map; defaults to the live catalog. */
  sites?: CandidateSite[];
}

/**
 * Text alternative for the polar map.
 *
 * The map is an SVG whose pins are focusable buttons, so it cannot declare
 * `role="img"` — that would make every pin unreachable for assistive technology.
 * The map therefore carries a text summary and this table, which is the same
 * information in a structure a screen reader or keyboard user can actually walk:
 * which sites are plotted, where they are, and which one is the current target.
 */
export function MapSiteDataTable({ selectedSite, sites }: MapSiteDataTableProps) {
  const { sites: catalogSites } = useSiteCatalog('all');
  const plotted = sites ?? catalogSites;

  return (
    <div className="sr-only" role="region" aria-label="Candidate sites plotted on the polar map">
      <table>
        <caption>
          Candidate sites plotted on the polar stereographic map, 83°S to 90°S. Coordinates
          are selenographic, latitude negative south, longitude east-positive 0°–360°.
        </caption>
        <thead>
          <tr>
            <th scope="col">Site</th>
            <th scope="col">Code</th>
            <th scope="col">Latitude (°S)</th>
            <th scope="col">Longitude (°E)</th>
            <th scope="col">Elevation (m)</th>
            <th scope="col">Map state</th>
          </tr>
        </thead>
        <tbody>
          {plotted.map((site) => (
            <tr key={site.id}>
              <th scope="row">{site.name}</th>
              <td>{site.code}</td>
              <td>{Math.abs(site.coordinates.latitudeDeg).toFixed(2)}</td>
              <td>{site.coordinates.longitudeDeg.toFixed(2)}</td>
              <td>{site.coordinates.elevationMeters}</td>
              <td>{site.id === selectedSite.id ? 'Selected target' : 'Candidate'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

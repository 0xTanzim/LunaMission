import { ComparisonColumn } from './comparisonColumns';

/** Generates CSV format string from comparison matrix data columns. */
export function generateComparisonCsv(columns: ComparisonColumn[]): string {
  const headers = ['Code', 'Name', 'Category', 'Latitude', 'Longitude', 'Elevation_m', 'Sun_Elev_deg', 'Earth_Elev_deg', 'DTE_Status'];
  const rows = columns.map((col) => {
    const sunElev = col.conditions.sunElevationDeg.kind === 'available' ? col.conditions.sunElevationDeg.value : 0;
    const earthElev = col.conditions.earthElevationDeg.kind === 'available' ? col.conditions.earthElevationDeg.value : 0;
    return [
      col.site.code,
      `"${col.site.name}"`,
      col.site.category ?? 'polar',
      col.site.coordinates.latitudeDeg,
      col.site.coordinates.longitudeDeg,
      col.site.coordinates.elevationMeters,
      sunElev,
      earthElev,
      col.conditions.earthVisibility,
    ].join(',');
  });

  return 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
}

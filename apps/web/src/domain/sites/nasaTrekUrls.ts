/**
 * NASA Lunar Trek and Planetary Data System deep link utilities.
 * Generates authoritative, parameterized Web GIS links to NASA's Moon Trek (trek.nasa.gov)
 * and ASU's LROC QuickMap.
 */

export const NASA_LUNAR_TREK_BASE = 'https://trek.nasa.gov/moon/#';
export const LROC_QUICKMAP_BASE = 'https://quickmap.lroc.asu.edu/';

/**
 * Returns a deep link to NASA Lunar Trek centered at the provided selenographic coordinates.
 * @param latitudeDeg Selenographic latitude (-90° to +90°)
 * @param longitudeDeg Selenographic longitude (0° to 360° or -180° to +180°)
 * @param zoom Web GIS zoom level (default: 7)
 */
export function getNasaLunarTrekUrl(latitudeDeg: number, longitudeDeg: number, zoom = 7): string {
  const x = longitudeDeg.toFixed(4);
  const y = latitudeDeg.toFixed(4);
  const crs = 'urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104903';
  return `${NASA_LUNAR_TREK_BASE}v=0.1&x=${x}&y=${y}&z=${zoom}&p=${crs}`;
}

/**
 * Returns a deep link to ASU LROC QuickMap centered at the provided coordinates.
 */
export function getLrocQuickMapUrl(latitudeDeg: number, longitudeDeg: number, zoom = 6): string {
  const x = longitudeDeg.toFixed(4);
  const y = latitudeDeg.toFixed(4);
  return `${LROC_QUICKMAP_BASE}?extent=${x},${y}&center=${x},${y}&zoom=${zoom}`;
}

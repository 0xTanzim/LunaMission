/** The three ways the spatial workspace arranges its 2D map and 3D globe panels. */
export type SpatialViewMode = 'map2d' | 'dual' | 'globe3d';

export const DEFAULT_SPATIAL_VIEW_MODE: SpatialViewMode = 'map2d';

/** Header label naming what the current mode draws. */
export function spatialViewModeLabel(mode: SpatialViewMode): string {
  switch (mode) {
    case 'map2d':
      return '2D Polar Stereographic (83°S–90°S)';
    case 'dual':
      return 'Dual View: 2D Polar Map + 3D Moon Globe';
    case 'globe3d':
      return '3D NASA LRO Moon Globe';
  }
}

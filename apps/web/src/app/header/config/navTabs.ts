/** Primary navigation destinations of the observatory shell. */

export type NavTab = 'explore' | 'lab' | 'cesium' | 'compare' | 'horizon' | 'method';

export interface NavTabItem {
  id: NavTab;
  label: string;
  path: string;
  title: string;
}

export const NAV_TABS: Record<NavTab, NavTabItem> = {
  explore: { id: 'explore', label: 'Explore', path: '/explore', title: 'Explore Observatory' },
  lab: { id: 'lab', label: '3D Lab', path: '/scenario/3d-lab', title: '3D Planetary Theater Lab' },
  cesium: { id: 'cesium', label: 'Cesium 3D', path: '/scenario/cesium-globe', title: 'Cesium Ion 3D Lunar Tileset' },
  compare: { id: 'compare', label: 'Navigator', path: '/compare', title: 'Landing Site Navigator' },
  horizon: { id: 'horizon', label: 'Horizon Radar', path: '/horizon', title: 'Horizon Radar & Sky Dome' },
  method: { id: 'method', label: 'Method & Data', path: '/methodology', title: 'Method & Data Reference' },
};

/** Accessible name for each destination; doubles as the hover title. */
export const NAV_TAB_TITLES: Record<NavTab, string> = {
  explore: 'Explore Observatory',
  lab: '3D Planetary Theater Lab',
  cesium: 'Cesium Ion 3D Lunar Tileset',
  compare: 'Landing Site Navigator',
  horizon: 'Horizon Radar & Sky Dome',
  method: 'Method & Data Reference',
};

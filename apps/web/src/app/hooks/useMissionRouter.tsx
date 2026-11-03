import { useCallback, useEffect, useState } from 'react';
import { NavTab } from '@/app/header/config/navTabs';

/**
 * Canonical URL path mapping per navigation tab.
 *
 * Every path here is the *one* address a workspace answers at, and it is derived
 * from the label the operator sees: navigation step 2 is "Analyze", so the screen
 * lives at `/analyze`. `/horizon` (the dataset name, and this router's internal tab
 * id) is an accepted alias that `canonicalizeMissionLocation` rewrites to `/analyze`,
 * so an old link still lands on the right screen without a second address existing.
 */
export const TAB_ROUTE_MAP: Record<NavTab, string> = {
  explore: '/explore',
  lab: '/scenario/3d-lab',
  cesium: '/scenario/cesium-globe',
  compare: '/compare',
  horizon: '/analyze',
  method: '/methodology',
};

function parseTabSegment(source: string): NavTab | null {
  if (!source) return null;
  const raw = source.toLowerCase();
  if (raw.includes('cesium')) return 'cesium';
  if (raw.includes('3d-lab')) return 'lab';
  if (raw.includes('compare')) return 'compare';
  if (raw.includes('horizon') || raw.includes('analyze')) return 'horizon';
  if (raw.includes('method')) return 'method';
  if (raw.includes('explore')) return 'explore';
  return null;
}

/** Resolves URL pathname/hash/search to a canonical mission tab with fallback to 'explore'. */
export function resolveTabFromPath(
  pathname: string = '',
  hash: string = '',
  search: string = '',
): NavTab {
  // 1. Explicit standalone deep-link hash takes precedence (e.g. #/scenario/cesium-globe)
  const hashOnly = hash.split('?')[0];
  const tabFromHash = parseTabSegment(hashOnly);
  if (tabFromHash && (tabFromHash === 'cesium' || tabFromHash === 'lab' || tabFromHash === 'method')) {
    return tabFromHash;
  }

  // 2. Pathname takes precedence over query search parameters and other hash fallbacks
  const pathOnly = pathname.split('?')[0].split('#')[0];
  const tabFromPath = parseTabSegment(pathOnly);
  if (tabFromPath) return tabFromPath;

  // 3. Hash fragment routing fallback
  if (tabFromHash) return tabFromHash;

  // 3. Query search parameter fallback (e.g. ?tab=compare, ?scenario=3d-lab)
  const tabFromSearch = parseTabSegment(search);
  if (tabFromSearch) return tabFromSearch;

  return 'explore';
}

/** Resolves canonical URL path for a given mission navigation tab. */
export function resolvePathFromTab(tab: NavTab): string {
  return TAB_ROUTE_MAP[tab] ?? '/explore';
}

/** Every path this router serves, normalised (no trailing slash, lower case). */
const CANONICAL_PATHS: readonly string[] = Object.values(TAB_ROUTE_MAP);

function normalisePath(pathname: string): string {
  const pathOnly = (pathname || '').split('?')[0].split('#')[0];
  const trimmed = pathOnly.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * The single URL each workspace should be reachable at.
 *
 * `/` used to render a byte-identical copy of `/explore` while both highlighted step 1,
 * so one screen had two addresses and neither was canonical. This returns the path the
 * address bar should show, or `null` when the current path is already canonical (query
 * string and hash are then left untouched).
 */
export function canonicalizeMissionLocation(
  pathname: string = '',
  hash: string = '',
  search: string = '',
): string | null {
  if (pathname === '/' || pathname === '') return null;
  if (CANONICAL_PATHS.includes(normalisePath(pathname))) return null;
  return resolvePathFromTab(resolveTabFromPath(pathname, hash, search));
}

export interface UseMissionRouterResult {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  navigateToTab: (tab: NavTab) => void;
  currentPath: string;
}

/**
 * Authoritative History Router Hook
 * Keeps browser URL and activeTab in lockstep via pushState, popstate, and hashchange.
 */
export function useMissionRouter(initialTab?: NavTab): UseMissionRouterResult {
  const [activeTab, setActiveTabState] = useState<NavTab>(() => {
    if (initialTab) return initialTab;
    if (typeof window === 'undefined') return 'explore';
    return resolveTabFromPath(
      window.location.pathname ?? '',
      window.location.hash ?? '',
      window.location.search ?? '',
    );
  });

  const navigateToTab = useCallback((tab: NavTab) => {
    setActiveTabState(tab);
    if (typeof window === 'undefined') return;
    const targetPath = resolvePathFromTab(tab);
    const targetHash = `#${targetPath}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    /**
     * Redirects alias URLs (`/`, unknown paths, hash-only deep links) onto the one
     * canonical route for that workspace, so a screen never answers to two addresses.
     * Uses `replaceState`: an alias must not create a back-button trap.
     */
    const applyCanonicalRoute = () => {
      const canonical = canonicalizeMissionLocation(
        window.location.pathname ?? '',
        window.location.hash ?? '',
        window.location.search ?? '',
      );
      if (!canonical || canonical === window.location.pathname) return;
      window.history.replaceState(
        window.history.state,
        '',
        `${canonical}${window.location.search}`,
      );
    };

    applyCanonicalRoute();

    const handleLocationChange = () => {
      applyCanonicalRoute();
      const detected = resolveTabFromPath(
        window.location.pathname ?? '',
        window.location.hash ?? '',
        window.location.search ?? '',
      );
      setActiveTabState(detected);
    };

    const handleActivate3D = () => {
      navigateToTab('lab');
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('lm-activate-3d-moon', handleActivate3D);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('lm-activate-3d-moon', handleActivate3D);
    };
  }, [navigateToTab]);

  return {
    activeTab,
    setActiveTab: setActiveTabState,
    navigateToTab,
    currentPath: resolvePathFromTab(activeTab),
  };
}

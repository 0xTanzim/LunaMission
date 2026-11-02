/**
 * Navigation data for the flight deck header.
 *
 * All five destinations are numbered and carry the matching `Alt+N` shortcut, so the
 * header never mixes "3. Compare" with an unnumbered "Cesium 3D": one sequence, one
 * shortcut vocabulary, one place to look. The workflow/instrument grouping below is
 * still recorded because it describes *what kind* of screen each one is (a step in the
 * site-to-comparison sequence vs. an analytical instrument reachable from any step),
 * but it no longer changes how the destinations are presented.
 *
 * Every destination is a real route: each entry renders as a link with `aria-current`,
 * never as a tab, because the destinations replace the whole workspace.
 */
import type { NavTab } from '@/app/header/config/navTabs';
import { TAB_ROUTE_MAP } from '@/app/hooks/useMissionRouter';
import type { LmIconProps } from '@/app/components/icons/lmIcons';
import {
  Icon3DLab,
  IconAnalyze,
  IconCesiumGlobe,
  IconCompare,
  IconSiteMap,
} from '@/app/components/icons/lmIcons';
import type React from 'react';

export interface CockpitNavItem {
  id: NavTab;
  /** Visible label. Names the job the operator does on that screen. */
  label: string;
  /** Route the link points at, so middle-click and copy-link work. */
  href: string;
  /** What the screen is for; used as the link title and menu description. */
  description: string;
  /** 1-based position in the single navigation sequence. */
  step: number;
  /** Keyboard shortcut, bound in the header and shown next to the label. */
  shortcut: string;
  Icon: React.ComponentType<LmIconProps>;
  /** What kind of screen this is; drives ordering and menu grouping copy. */
  group: 'workflow' | 'instrument';
}

export const COCKPIT_NAV_ITEMS: CockpitNavItem[] = [
  {
    id: 'explore',
    label: 'Site Map',
    href: TAB_ROUTE_MAP.explore,
    description: 'Pick a landing site on the polar map',
    step: 1,
    shortcut: 'Alt+1',
    Icon: IconSiteMap,
    group: 'workflow',
  },
  {
    id: 'horizon',
    label: 'Analyze',
    href: TAB_ROUTE_MAP.horizon,
    description: 'Read the sky ribbon and Sun/Earth event timeline',
    step: 2,
    shortcut: 'Alt+2',
    Icon: IconAnalyze,
    group: 'workflow',
  },
  {
    id: 'compare',
    label: 'Compare',
    href: TAB_ROUTE_MAP.compare,
    description: 'Compare candidate sites on the same epoch',
    step: 3,
    shortcut: 'Alt+3',
    Icon: IconCompare,
    group: 'workflow',
  },
  {
    id: 'lab',
    label: '3D Lab',
    href: TAB_ROUTE_MAP.lab,
    description: 'Planetary theater lab for camera and terrain study',
    step: 4,
    shortcut: 'Alt+4',
    Icon: Icon3DLab,
    group: 'instrument',
  },
  {
    id: 'cesium',
    label: 'Cesium 3D',
    href: TAB_ROUTE_MAP.cesium,
    description: 'Photorealistic Cesium Ion lunar globe',
    step: 5,
    shortcut: 'Alt+5',
    Icon: IconCesiumGlobe,
    group: 'instrument',
  },
];

export const WORKFLOW_NAV_ITEMS = COCKPIT_NAV_ITEMS.filter((item) => item.group === 'workflow');
export const INSTRUMENT_NAV_ITEMS = COCKPIT_NAV_ITEMS.filter((item) => item.group === 'instrument');

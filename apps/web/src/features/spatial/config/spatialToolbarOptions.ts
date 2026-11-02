/**
 * The option tables behind the spatial toolbar. Data, not markup: the toolbar
 * renders one button per entry, so adding a view mode or layer means adding a
 * row here rather than editing components.
 */

import {
  Columns, Compass, Crosshair, Eye, Globe as GlobeIcon,
  Map as MapIcon, ZoomIn, Sparkles, Target, Mountain, Radio, RotateCw, Sun, type LucideIcon,
} from 'lucide-react';
import { CameraPreset, SpatialLayer } from '@/features/spatial/model/spatialPreferences';
import { SpatialViewMode } from '@/features/spatial/model/spatialViewMode';

export interface ViewModeOption {
  mode: SpatialViewMode;
  label: string;
  title: string;
  ariaLabel: string;
  Icon: LucideIcon;
}

export const VIEW_MODES: ViewModeOption[] = [
  {
    mode: 'map2d',
    label: '2D Map',
    title: 'Switch to 2D Polar Stereographic Map (Mode A)',
    ariaLabel: '2D Polar Map view',
    Icon: MapIcon,
  },
  {
    mode: 'dual',
    label: 'Dual View',
    title: 'Switch to Side-by-side Dual View (Mode C)',
    ariaLabel: 'Dual 2D and 3D View',
    Icon: Columns,
  },
  {
    mode: 'globe3d',
    label: '3D Moon',
    title: 'Switch to 3D NASA LRO Moon Globe',
    ariaLabel: '3D Moon Globe view',
    Icon: GlobeIcon,
  },
];

export type CameraPresetId = CameraPreset | 'southPole';

/** 8 Authoritative Camera Presets for the flight deck and 3D Lab */
export const ALL_CAMERA_PRESET_IDS: readonly CameraPresetId[] = [
  'southPole',
  'site',
  'horizon',
  'eva',
  'earth_align',
  'orbit360',
  'north_look',
  'sunward_terminator',
] as const;

export interface CameraPresetOption {
  preset: CameraPreset;
  id: CameraPresetId;
  label: string;
  title: string;
  Icon: LucideIcon;
  iconClassName: string;
}

/** 8 Authoritative flight-grade camera presets */
export const CAMERA_PRESETS: CameraPresetOption[] = [
  {
    preset: 'nadir',
    id: 'southPole',
    label: 'South Pole',
    title: 'South Pole Overhead (Nadir): Direct vertical overview of polar region (83°S–90°S)',
    Icon: Compass,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-selected-site)]',
  },
  {
    preset: 'site',
    id: 'site',
    label: 'Site Focus',
    title: 'Site Focus: Centered on selected Artemis candidate landing zone',
    Icon: Crosshair,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-series-b)]',
  },
  {
    preset: 'horizon',
    id: 'horizon',
    label: 'Horizon',
    title: 'Ground Rim Horizon: Perspective view across crater rim horizon',
    Icon: Mountain,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-warning)]',
  },
  {
    preset: 'eva',
    id: 'eva',
    label: 'EVA (Simulated)',
    title: 'Simulated EVA point-of-view from a mast-mounted camera — display altitude exaggerated to stay renderable',
    Icon: Sparkles,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-info)]',
  },
  {
    preset: 'earth_align',
    id: 'earth_align',
    label: 'Earth Align',
    title: 'Earth Alignment: Direct RF telecom line-of-sight toward Earth hovering on horizon',
    Icon: Radio,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-info)]',
  },
  {
    preset: 'orbit360',
    id: 'orbit360',
    label: 'Orbit 360°',
    title: 'Orbit 360°: Continuous 360-degree circular orbital reconnaissance vantage',
    Icon: RotateCw,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-data-demo)]',
  },
  {
    preset: 'north_look',
    id: 'north_look',
    label: 'North Look',
    title: 'North-Looking: Camera anchored at site oriented toward local North along prime meridian',
    Icon: Compass,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-success)]',
  },
  {
    preset: 'sunward_terminator',
    id: 'sunward_terminator',
    label: 'Terminator',
    title: 'Sunward Terminator: Facing grazing low-elevation solar vector across shadow boundary',
    Icon: Sun,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-warning)]',
  },
];

/** Backward-compatible camera preset aliases */
export const CAMERA_PRESET_ALIASES: CameraPresetOption[] = [
  {
    preset: 'nadir',
    id: 'southPole',
    label: 'South Pole',
    title: 'South Pole Focus: Centered on candidate region (83°S–90°S)',
    Icon: Compass,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-selected-site)]',
  },
  {
    preset: 'global',
    id: 'global',
    label: 'Global',
    title: 'Global Context: Complete Moon sphere overview',
    Icon: GlobeIcon,
    iconClassName: 'w-3 h-3',
  },
  {
    preset: 'oblique',
    id: 'oblique',
    label: 'Oblique',
    title: 'Oblique Terrain: Perspective view across crater rims and relief',
    Icon: Eye,
    iconClassName: 'w-3 h-3',
  },
  {
    preset: 'inspection',
    id: 'inspection',
    label: 'Inspect',
    title: 'Local Site Inspection: Deep zoom grazing view of crater relief and lighting',
    Icon: ZoomIn,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-sun)]',
  },
  {
    preset: 'overhead',
    id: 'overhead',
    label: 'Overhead',
    title: 'Tactical Overhead Nadir: Steep high-angle view centered on candidate datum',
    Icon: Target,
    iconClassName: 'w-3 h-3 text-[var(--lm-color-success)]',
  },
];

export function findCameraPresetOption(idOrPreset: CameraPresetId): CameraPresetOption | undefined {
  if (idOrPreset === 'southPole' || idOrPreset === 'nadir') {
    return CAMERA_PRESETS[0];
  }
  const match = CAMERA_PRESETS.find((p) => p.preset === idOrPreset || p.id === idOrPreset);
  if (match) return match;
  return CAMERA_PRESET_ALIASES.find((p) => p.preset === idOrPreset || p.id === idOrPreset);
}

export interface LayerToggleButton {
  layer: SpatialLayer;
  label: string;
  title: string;
  ariaLabel: string;
}

/**
 * One toggle vocabulary for the whole flight deck.
 *
 * The layer row used to pick its own colour per layer (cyan for tracks, blue for PSR,
 * indigo for craters, amber for vectors) while the legend added a second colour key, so
 * five encodings competed on one screen. Now every toggle reads the same way:
 * outline = off, filled = on, and amber is reserved for the primary target alone.
 */
export const TOGGLE_STATE_ON_CLASS =
  'border border-[var(--lm-color-info)] bg-[var(--lm-color-info)]/18 text-[var(--lm-color-text-primary)] font-semibold';

/** Resting state of every toggle on the flight deck: an outline, no fill. */
export const TOOLBAR_BUTTON_IDLE_CLASS =
  'border border-[var(--lm-color-info)]/30 bg-transparent text-[var(--lm-color-text-secondary)] hover:border-[var(--lm-color-info)]/70 hover:text-[var(--lm-color-text-primary)]';

export const LAYER_BUTTONS: LayerToggleButton[] = [
  {
    layer: 'grid',
    label: 'Grid',
    title: 'Toggle Coordinate Grid',
    ariaLabel: 'Toggle grid',
  },
  {
    layer: 'vectors',
    label: 'Vectors',
    title: 'Toggle Sun and Earth Direction Vectors',
    ariaLabel: 'Toggle celestial vectors',
  },
  {
    layer: 'psr',
    label: 'PSR',
    title: 'Toggle Permanently Shadowed Regions (PSR) & Footprint',
    ariaLabel: 'Toggle shadow regions',
  },
  {
    layer: 'laserTracks',
    label: 'Tracks',
    title: 'Toggle NASA SVS 3633 LOLA Laser Altimeter Ground Tracks',
    ariaLabel: 'Toggle LOLA laser ground tracks',
  },
];

/** Common chrome for each button group. */
export const TOOLBAR_GROUP_CLASS =
  'flex items-center gap-1 bg-[var(--lm-color-surface-raised)] p-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] shadow-xs';

/** The camera group collapses below the `sm` breakpoint, where there is no globe on screen. */
export const CAMERA_GROUP_CLASS =
  'hidden sm:flex items-center gap-1 bg-[var(--lm-color-surface-raised)] p-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] shadow-xs';

import {
  Compass,
  Crosshair,
  Eye,
  Globe,
  Mountain,
  Radio,
  RotateCw,
  Sparkles,
  Sun,
  Target,
  ZoomIn,
  type LucideIcon,
} from 'lucide-react';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import { CameraPresetId } from './spatialToolbarOptions';

export interface CategorizedPreset {
  id: CameraPresetId;
  preset: CameraPreset;
  label: string;
  title: string;
  category: 'global' | 'southPole' | 'tactical';
  Icon: LucideIcon;
  iconClassName: string;
}

export const CATEGORIZED_PRESETS: readonly CategorizedPreset[] = [
  // 1. Global Context
  {
    id: 'global',
    preset: 'global',
    label: 'Global',
    title: 'Global Context: Complete Moon sphere overview',
    category: 'global',
    Icon: Globe,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-info)]',
  },
  {
    id: 'oblique',
    preset: 'oblique',
    label: '45° Oblique',
    title: 'Mode C: 45° Oblique Site Inspection (grazing perspective across crater rims)',
    category: 'global',
    Icon: Eye,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-warning)]',
  },

  // 2. South Pole Regional
  {
    id: 'southPole',
    preset: 'nadir',
    label: 'South Pole',
    title: 'South Pole Overhead (Nadir): Direct vertical overview of polar region (83°S–90°S)',
    category: 'southPole',
    Icon: Compass,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-selected-site)]',
  },

  // 3. Tactical Site Views
  {
    id: 'site',
    preset: 'site',
    label: 'Site Focus',
    title: 'Site Focus: Centered on selected Artemis candidate landing zone',
    category: 'tactical',
    Icon: Crosshair,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-series-b)]',
  },
  {
    id: 'inspection',
    preset: 'inspection',
    label: 'Inspection',
    title: 'Local Site Inspection: Deep zoom grazing view of crater relief and lighting',
    category: 'tactical',
    Icon: ZoomIn,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-warning)]',
  },
  {
    id: 'overhead',
    preset: 'overhead',
    label: 'Overhead',
    title: 'Tactical Overhead Nadir: Steep high-angle view centered on candidate datum',
    category: 'tactical',
    Icon: Target,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-success)]',
  },
  {
    id: 'horizon',
    preset: 'horizon',
    label: 'Horizon',
    title: 'Ground Rim Horizon: Perspective view across crater rim horizon',
    category: 'tactical',
    Icon: Mountain,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-warning)]',
  },
  {
    id: 'eva',
    preset: 'eva',
    label: 'EVA (Simulated)',
    title: 'Simulated EVA point-of-view from a mast-mounted camera — display altitude exaggerated to stay renderable',
    category: 'tactical',
    Icon: Sparkles,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-info)]',
  },
  {
    id: 'earth_align',
    preset: 'earth_align',
    label: 'Earth Align',
    title: 'Earth Alignment: Direct RF telecom line-of-sight toward Earth hovering on horizon',
    category: 'tactical',
    Icon: Radio,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-info)]',
  },
  {
    id: 'orbit360',
    preset: 'orbit360',
    label: 'Orbit 360°',
    title: 'Orbit 360°: Continuous 360-degree circular orbital reconnaissance vantage',
    category: 'tactical',
    Icon: RotateCw,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-data-demo)]',
  },
  {
    id: 'north_look',
    preset: 'north_look',
    label: 'North Look',
    title: 'North-Looking: Camera anchored at site oriented toward local North along prime meridian',
    category: 'tactical',
    Icon: Compass,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-success)]',
  },
  {
    id: 'sunward_terminator',
    preset: 'sunward_terminator',
    label: 'Terminator',
    title: 'Sunward Terminator: Facing grazing low-elevation solar vector across shadow boundary',
    category: 'tactical',
    Icon: Sun,
    iconClassName: 'w-3.5 h-3.5 text-[var(--lm-color-warning)]',
  },
] as const;

export const PRESET_CATEGORY_LABELS = {
  global: 'Global Views',
  southPole: 'South Pole Nadir',
  tactical: 'Tactical Site Views',
} as const;

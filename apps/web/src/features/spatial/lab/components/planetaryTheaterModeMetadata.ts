import { CameraPreset } from '@/features/spatial/model/spatialPreferences';

export interface ModeMetadata {
  readonly code: string;
  readonly name: string;
  readonly desc: string;
  readonly color: string;
}

export function getModeMetadata(preset: CameraPreset): ModeMetadata {
  switch (preset) {
    case 'nadir':
      return {
        code: 'POLAR',
        name: 'Regional South Pole',
        desc: 'Polar relief, 83°S LOLA coverage boundary, and candidate comparison',
        color: 'text-[var(--lm-color-selected-site)] border-[var(--lm-color-selected-site)]/50 bg-[var(--lm-color-selected-site)]/10',
      };
    case 'site':
      return {
        code: 'SITE',
        name: 'Candidate Overview',
        desc: 'Crater and ridge morphology surrounding candidate site',
        color: 'text-[var(--lm-color-series-b)] border-[var(--lm-color-series-b)]/50 bg-[var(--lm-color-series-b)]/10',
      };
    case 'oblique':
    case 'inspection':
      return {
        code: 'OBLIQUE',
        name: '45° Oblique Inspection',
        desc: 'Grazing view across crater rim relief with synchronized solar shadows',
        color: 'text-[var(--lm-color-sun)] border-[var(--lm-color-sun)]/50 bg-[var(--lm-color-sun)]/10',
      };
    case 'overhead':
      return {
        code: 'OVERHEAD',
        name: 'Overhead Tactical Nadir',
        desc: 'High-angle tactical top-down view centered on the candidate datum',
        color: 'text-[var(--lm-color-success)] border-[var(--lm-color-success)]/50 bg-[var(--lm-color-success)]/10',
      };
    case 'horizon':
      return {
        code: 'HORIZON',
        name: 'Ground Horizon View',
        desc: 'Low-angle perspective looking toward the illuminated lunar horizon',
        color: 'text-[var(--lm-color-warning)] border-[var(--lm-color-warning)]/50 bg-[var(--lm-color-warning)]/10',
      };
    case 'eva':
      return {
        code: 'EVA (SIM)',
        name: 'EVA Point-of-View (Simulated)',
        desc: 'Simulated crew point-of-view from a 3.7 m mast-mounted camera (2 m mast + 1.7 m eye); the display altitude is exaggerated to stay renderable — no helmet HUD or telemetry is shown',
        color: 'text-[var(--lm-color-info)] border-[var(--lm-color-info)]/50 bg-[var(--lm-color-info)]/10',
      };
    case 'earth_align':
      return {
        code: 'EARTH LoS',
        name: 'Earth Line-of-Sight',
        desc: 'Topocentric geometric line-of-sight toward Earth on the lunar horizon — a sightline, not an RF link budget',
        color: 'text-[var(--lm-color-info)] border-[var(--lm-color-info)]/50 bg-[var(--lm-color-info)]/10',
      };
    case 'orbit360':
      return {
        code: 'ORBIT 360',
        name: 'Circular Orbital Survey',
        desc: '360-degree orbital reconnaissance around candidate terrain',
        color: 'text-[var(--lm-color-data-demo)] border-[var(--lm-color-data-demo)]/50 bg-[var(--lm-color-data-demo)]/10',
      };
    case 'north_look':
      return {
        code: 'NORTH LOOK',
        name: 'True North Alignment',
        desc: 'Oriented along prime meridian toward local lunar North',
        color: 'text-[var(--lm-color-success)] border-[var(--lm-color-success)]/50 bg-[var(--lm-color-success)]/10',
      };
    case 'sunward_terminator':
      return {
        code: 'TERMINATOR',
        name: 'Sunward Terminator',
        desc: 'Grazing low-elevation solar lighting across shadow boundary',
        color: 'text-[var(--lm-color-warning)] border-[var(--lm-color-warning)]/50 bg-[var(--lm-color-warning)]/10',
      };
    case 'global':
    default:
      return {
        code: 'GLOBAL',
        name: 'Full Moon Context',
        desc: 'Global selenographic sphere with comfortable margin',
        color: 'text-[var(--lm-color-text-secondary)] border-[var(--lm-color-border-strong)] bg-[var(--lm-color-border-strong)]',
      };
  }
}

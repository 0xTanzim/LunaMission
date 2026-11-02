import type { VehicleConstraints } from '@luna/contracts';

export interface MissionPreset {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  values: VehicleConstraints;
}

export const MISSION_PRESETS: readonly MissionPreset[] = [
  {
    id: 'clps',
    label: 'CLPS Lander',
    subtitle: 'Commercial Robotic',
    description: 'Robotic commercial payload (e.g. IM-2/Blue Ghost) with relay support',
    values: {
      minContinuousSunlightHours: 40.0,
      maxContinuousDarknessHours: 60.0,
      minDteHours: 0.0,
      maxLandingSlopeDeg: 15.0,
    },
  },
  {
    id: 'artemis',
    label: 'Artemis HLS',
    subtitle: 'Crewed Architecture',
    description: 'Crewed human landing system strict survivability criteria',
    values: {
      minContinuousSunlightHours: 80.0,
      maxContinuousDarknessHours: 24.0,
      minDteHours: 50.0,
      maxLandingSlopeDeg: 10.0,
    },
  },
  {
    id: 'survey',
    label: 'Polar Survey',
    subtitle: 'Physical Baseline',
    description: 'Unconstrained physical ranking across all polar candidates',
    values: {
      minContinuousSunlightHours: 0.0,
      maxContinuousDarknessHours: 336.0,
      minDteHours: 0.0,
      maxLandingSlopeDeg: 45.0,
    },
  },
] as const;

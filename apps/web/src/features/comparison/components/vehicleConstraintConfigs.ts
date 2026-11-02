import type { VehicleConstraints } from '@luna/contracts';
import { Moon, SatelliteDish, Sun, Triangle, type LucideIcon } from 'lucide-react';

export interface VehicleConstraintFieldConfig {
  readonly key: keyof VehicleConstraints;
  readonly label: string;
  readonly title: string;
  readonly purpose: string;
  /**
   * Glyph for the observable, drawn from the shared icon set. Emoji were replaced
   * because they scaled inconsistently and were read aloud as "sun emoji".
   */
  readonly icon: LucideIcon;
  readonly tooltip: string;
  readonly unitHint: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly ariaLabel: string;
  readonly textColorClass: string;
  readonly focusBorderClass: string;
}

export const VEHICLE_CONSTRAINT_CONFIGS: readonly VehicleConstraintFieldConfig[] = [
  {
    key: 'minContinuousSunlightHours',
    label: 'Min Sunlit (h):',
    title: 'Continuous Sunlight',
    purpose: 'Solar Array Exposure',
    icon: Sun,
    tooltip: 'Minimum unbroken geometric sunlight hours required by the vehicle power model. Sunlit hours are a visibility duration, not an electrical energy or power estimate.',
    unitHint: '≥ hours',
    min: 0,
    max: 336,
    step: 5,
    ariaLabel: 'Minimum Continuous Sunlight Hours',
    textColorClass: 'text-[var(--lm-color-warning)]',
    focusBorderClass: 'focus:border-[var(--lm-color-warning)]',
  },
  {
    key: 'maxContinuousDarknessHours',
    label: 'Max Darkness (h):',
    title: 'Darkness Tolerance',
    purpose: 'Vehicle Limit',
    icon: Moon,
    tooltip: 'Operator-provided maximum continuous shadow hours the vehicle is modelled to tolerate (cold-soak / battery endurance limit). The limit itself is an input, not a computed result.',
    unitHint: '≤ hours',
    min: 0,
    max: 336,
    step: 4,
    ariaLabel: 'Maximum Continuous Darkness Hours',
    textColorClass: 'text-[var(--lm-color-danger)]',
    focusBorderClass: 'focus:border-[var(--lm-color-danger)]',
  },
  {
    key: 'minDteHours',
    label: 'Min Earth LoS (h):',
    title: 'Direct-to-Earth Geometric Line of Sight',
    purpose: 'Earth LoS Geometry',
    icon: SatelliteDish,
    tooltip: 'Minimum cumulative hours with the centre of Earth above the local terrain horizon (geometric line-of-sight). This is a geometry threshold, not an RF link-closure or ground-station contact requirement.',
    unitHint: '≥ hours',
    min: 0,
    max: 336,
    step: 5,
    ariaLabel: 'Minimum Direct-to-Earth Line-of-Sight Hours',
    textColorClass: 'text-[var(--lm-color-success)]',
    focusBorderClass: 'focus:border-[var(--lm-color-success)]',
  },
  {
    key: 'maxLandingSlopeDeg',
    label: 'Max Slope (°):',
    title: 'Landing Slope Limit',
    purpose: 'Tip-Over Safety',
    icon: Triangle,
    tooltip: 'Steepest safe local terrain tilt from LOLA 20m DEM to prevent lander tip-over.',
    unitHint: '≤ degrees',
    min: 0,
    max: 45,
    step: 1,
    ariaLabel: 'Maximum Landing Slope Degrees',
    textColorClass: 'text-[var(--lm-color-info)]',
    focusBorderClass: 'focus:border-[var(--lm-color-info)]',
  },
] as const;

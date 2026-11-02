import { solveParetoLandingWindows } from './windows/paretoWindowSolver';
import type { ParetoOptimizationResult } from '@luna/contracts';
import type { ParetoWindowInput } from '../schemas/windowSchemas';

export function optimizeLandingWindowsService(
  input: ParetoWindowInput,
): ParetoOptimizationResult {
  return solveParetoLandingWindows(input);
}

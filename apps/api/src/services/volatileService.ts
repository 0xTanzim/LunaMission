import type {
  VolatileProspectingResult,
  VolatileProspectInput,
} from '@luna/contracts';
import { prospectVolatilesAtCoordinates } from './volatiles/volatileProspector';

export function prospectVolatilesService(
  input: VolatileProspectInput,
): VolatileProspectingResult {
  return prospectVolatilesAtCoordinates(input.latDeg, input.lonDeg);
}

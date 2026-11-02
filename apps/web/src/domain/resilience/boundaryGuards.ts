/**
 * Polar Coordinate Boundary Guards & Deterministic Fallback Service
 *
 * Implements:
 * 1. Strict boundary enforcement for lunar south polar region (-80.0°S to -90.0°S)
 * 2. Explicit scientific limitation disclosures for out-of-bounds queries
 * 3. Deterministic offline calculation fallbacks when calculation microservices are unreachable
 */

export const POLAR_LATITUDE_BOUNDS = {
  minLatitude: -90.0,
  maxLatitude: -80.0,
} as const;

export interface BoundaryValidationResult {
  readonly isValid: boolean;
  readonly normalizedLatitude: number;
  readonly normalizedLongitude: number;
  readonly disclosureNotice?: string;
}

export interface FallbackExecutionResult<T> {
  readonly data: T;
  readonly usedFallback: boolean;
  readonly fallbackReason?: string;
}

/**
 * Validates whether requested coordinates lie strictly within the south polar region.
 */
export function validateSouthPolarCoordinates(
  latitudeDeg: number,
  longitudeDeg: number
): BoundaryValidationResult {
  // Normalize longitude to [0, 360)
  let normLon = longitudeDeg % 360;
  if (normLon < 0) {
    normLon += 360;
  }

  // Check latitude
  const isPolar =
    latitudeDeg >= POLAR_LATITUDE_BOUNDS.minLatitude &&
    latitudeDeg <= POLAR_LATITUDE_BOUNDS.maxLatitude;

  if (!isPolar) {
    const latStr = latitudeDeg.toFixed(2);
    const notice =
      `Target latitude (${latStr}°) is out of validated bounds. ` +
      `LunaMission scientific models and LOLA DEMs are validated exclusively for the lunar south pole ` +
      `between -80.0°S to -90.0°S. Calculations outside this envelope carry significant topographic uncertainty.`;

    return {
      isValid: false,
      normalizedLatitude: latitudeDeg,
      normalizedLongitude: normLon,
      disclosureNotice: notice,
    };
  }

  return {
    isValid: true,
    normalizedLatitude: latitudeDeg,
    normalizedLongitude: normLon,
  };
}

/**
 * Executes a service call with graceful, deterministic offline fallback on network failure.
 */
export async function executeWithOfflineFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackProvider: () => T
): Promise<FallbackExecutionResult<T>> {
  try {
    const result = await primaryOperation();
    return {
      data: result,
      usedFallback: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackData = fallbackProvider();
    return {
      data: fallbackData,
      usedFallback: true,
      fallbackReason: errorMessage,
    };
  }
}
